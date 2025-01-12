import * as Github from '$lib/github';
import prisma from '$lib/db/prisma';
import { ContributorsMatchQueryMetadata, ContributorsMatchTaskState, QueryTaskState, type ContributorsMatchTaskCfg, type QueryTaskResult } from './schema';

export class QueryTaskManager {
    private static userPendingQueryTasks: Map<string, {
        tasks: QueryTask[],
        ongoing: boolean,
    }> = new Map();
    
    async static () {
      const queryTasks = await prisma.queryTask.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          query: true,
        }
      });

      for (const _queryTask of queryTasks) {
        if (_queryTask.status === 'PENDING') {
          const taskState = _queryTask.taskState as ContributorsMatchTaskState;
          const userId = "system" // _queryTask.query.initiatorId; TODO: support user-specific github api
          const queryTask = new QueryTask(_queryTask.id, taskState, userId);
          if (!QueryTaskManager.userPendingQueryTasks.has(userId)) {
            QueryTaskManager.userPendingQueryTasks.set(userId, {
              tasks: [queryTask],
              ongoing: false,
            });
          } else {
            QueryTaskManager.userPendingQueryTasks.get(userId)!.tasks.push(queryTask);
          }
        }
      }

      for (const [userId, queryTasks] of QueryTaskManager.userPendingQueryTasks.entries()) {
        if (!queryTasks.ongoing) {
          QueryTaskManager.continueUserQueryTask(userId);
        }
      }
    }

    static async beginContributorsMatchQueryTask(queryId: string, config: ContributorsMatchTaskCfg): Promise<string> {
        const query = await prisma.query.findUniqueOrThrow({
            where: {
                id: queryId,
            },
        });
        const metadata = ContributorsMatchQueryMetadata.parse(query.metadata);
        const relevantRepos = await Github.search.repo("system", {
            keywords: metadata.keywords,
            in: ['name', 'description', 'readme', 'topic'],
        });
        if (relevantRepos.items.length === 0) {
            const queryTask = await prisma.queryTask.create({
                data: { status: 'COMPLETED' ,
                    query: {
                        connect: {
                            id: queryId,
                        }
                    },
                    taskState: {
                        type: 'contributors_match',
                        config,
                        repositories: {
                            contributorUrls: [],
                            index: 0,
                        },
                        matches: {},
                        ...metadata,
    
                    },
                },
            
            });

            await prisma.query.update({
                where: { id: queryId },
                data: { taskId: queryTask.id },
            });
      
            return queryTask.id;
        }

        const taskState: ContributorsMatchTaskState = {
            type: 'contributors_match',
            config,
            repositories: {
                contributorUrls: relevantRepos.items.map(repo => repo.contributors_url),
                index: 0,
            },
            matches: {},
            ...metadata,
        };

        const { id: queryTaskId } = await prisma.queryTask.create({
            data: {
                query: {
                    connect: {
                        id: queryId,
                    }
                },
                status: 'PENDING',
                taskState: taskState,
            }
        });

        await prisma.query.update({
            where: { id: queryId },
            data: { taskId: queryTaskId },
        });

        const userId = "system" // query.initiatorId; TODO: support user-specific github api
        const queryTask = new QueryTask(queryTaskId, taskState, "system");

        if (!QueryTaskManager.userPendingQueryTasks.has(userId)) {
            QueryTaskManager.userPendingQueryTasks.set(userId, {
              tasks: [queryTask],
              ongoing: false,
            });
          } else {
            QueryTaskManager.userPendingQueryTasks.get(userId)!.tasks.push(queryTask);
          }
        QueryTaskManager.continueUserQueryTask(userId);
        return queryTaskId;
    }

    static continueUserQueryTask(userId: string) {
        if (!QueryTaskManager.userPendingQueryTasks.has(userId)) return; 
        if (QueryTaskManager.userPendingQueryTasks.get(userId)!.ongoing) return;
        const queryTasks = QueryTaskManager.userPendingQueryTasks.get(userId);
        if (queryTasks) {
            const queryTask = queryTasks.tasks.shift();
            if (!queryTask) {
                queryTasks.ongoing = false;
                return;
            }
            queryTask.step().then(({ status }) => {
                if (status === 'PENDING') {
                    queryTasks.tasks.push(queryTask);
                }
                queryTasks.ongoing = false;
                QueryTaskManager.continueUserQueryTask(userId);
            });
        }
    }

    static async cancelQueryTask(queryTaskId: string) {
        await prisma.queryTask.update({
            where: { id: queryTaskId },
            data: { status: 'CANCELLED' },
        });
    }
}

export class QueryTask {

    constructor(private taskId: string, private state: QueryTaskState, private initiatorId: string) {
    }

    public async step(): Promise<QueryTaskResult> {
        if (this.state.type === 'contributors_match') {
            return this.stepContributorsMatch(this.state);
        }
        throw new Error(`Unknown task type: ${this.state.type}`);
    }

    private async stepContributorsMatch(state: ContributorsMatchTaskState): Promise<QueryTaskResult> {
        let currentBatch = 0;

        const persistState = async () => {
            await prisma.queryTask.update({
                where: {
                    id: this.taskId,
                },
                data: {
                    taskState: state,
                }
            });
        }

        const updateUserContributions = async (contributor: string, contributions: number): Promise<number> => {
            if (!state.matches[contributor]) {
                state.matches[contributor] = {
                    profile: await Github.get.userProfile(this.initiatorId, contributor),
                    total_contributions: contributions,
                    repositories: await Github.get.userRepos(this.initiatorId, contributor),
                };
                return 2;
            } else {
                state.matches[contributor].total_contributions += contributions;
                return 0;
            }
        }

        while (currentBatch < state.config.batchSize) {
                if (state.repositories.index == state.repositories.contributorUrls.length) {
                    await persistState();
                    return {
                        batchSize: currentBatch,
                        status: 'COMPLETED',
                    };
                }
                let repoContributions = await Github.get.contributors(this.initiatorId, state.repositories.contributorUrls[state.repositories.index]);
                currentBatch++;
                
                repoContributions = repoContributions
                    .filter(contribution => contribution.contributions >= state.config.minContributions)
                    .slice(0, state.config.maxContributors);
                 ;
                for (const contribution of repoContributions) {
                    currentBatch += await updateUserContributions(contribution.login, contribution.contributions);
                }
                state.repositories.index++;      
        }
    
        await persistState();
        return {
            batchSize: currentBatch,
            status: 'PENDING',
        };
    }
}