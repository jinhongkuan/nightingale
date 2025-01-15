import * as Github from '$lib/github';
import prisma from '$lib/db/prisma';
import { GithubContributorsMatchQueryMetadata, ContributorsMatchTaskState, QueryTaskState, type ContributorsMatchTaskCfg, type QueryTaskResult, LinkedinProfilesMatchTaskCfg, LinkedinProfilesMatchTaskState } from './schema';
import type { RepositoriesResponse } from '$lib/github/schema';
import * as Linkedin from '$lib/linkedin';
import {  obtainSearchParamsForMatchingContributors, obtainSearchParamsForMatchingLinkedinUsers } from './prompts';

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

    static async beginGithubContributorsMatchQuery(query: string, config: ContributorsMatchTaskCfg): Promise<{ queryId: string, queryTaskId: string }> {
   
        let relevantRepos: RepositoriesResponse = [];
        let searchParams: GithubContributorsMatchQueryMetadata | null = null;
        while(relevantRepos.length < 20) {
            searchParams = await obtainSearchParamsForMatchingContributors(query);
       
            relevantRepos = (await Github.search.repo("system", {
                keywordsString: searchParams.keywordsString,
                in: ['description'],
            })).items;
        }
        const { id: queryId } = await prisma.query.create({
            data: {
                query: query,
                metadata: searchParams!,
            },
        });
        const metadata = GithubContributorsMatchQueryMetadata.parse(searchParams!);

        const taskState: ContributorsMatchTaskState = {
            type: 'contributors_match',
            config,
            repositories: {
                contributorUrls: relevantRepos.map(repo => repo.contributors_url),
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
        return { queryId, queryTaskId };
    }

    static async beginLinkedinContributorsMatchQuery(query: string, config: LinkedinProfilesMatchTaskCfg): Promise<{ queryId: string, queryTaskId: string }> {
        const linkedinQuery = await obtainSearchParamsForMatchingLinkedinUsers(query);
        const { id: queryId } = await prisma.query.create({
            data: {
                query: query,
                metadata: linkedinQuery,
            },
        });
        const taskState: LinkedinProfilesMatchTaskState = {
            type: 'linkedin_profiles_match',
            config,
            page: 0,
            profiles: {},
            companies: {
                companyUrls: [],
                index: 0,
            },
            query,
        };
        const { id: queryTaskId } = await prisma.queryTask.create({
            data: {
                query: {
                    connect: {
                        id: queryId,
                    }
                },
                status: 'PENDING',
                taskState,
            }
        });

        return { queryId, queryTaskId };
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
        let result: QueryTaskResult;
        if (this.state.type === 'contributors_match') {
            result = await this.stepContributorsMatch(this.state);
        } else if (this.state.type === 'linkedin_profiles_match') {
            result = await this.stepLinkedinProfilesMatch(this.state);
        } else {
            throw new Error(`Unknown task type`);
        }
        if (result.status === 'COMPLETED') {
            await prisma.queryTask.update({
                where: { id: this.taskId },
                data: { status: 'COMPLETED' },
            });
        }
        return result;
    }
    
    private async persistState(state: QueryTaskState) {
        await prisma.queryTask.update({
            where: {
                id: this.taskId,
            },
            data: {
                taskState: state,
            }
        });
    }

    private async stepContributorsMatch(state: ContributorsMatchTaskState): Promise<QueryTaskResult> {
        let currentBatch = 0;

      

        const updateUserContributions = async (contributor: string, contributions: number): Promise<number> => {
            if (!state.matches[contributor]) {
                const profile = await Github.get.userProfile(this.initiatorId, contributor);
                if (!profile.success) {
                    console.log('failed to get profile', contributor);
                    return 0;
                }
                const repos = await Github.get.userRepos(this.initiatorId, contributor);
                if (!repos.success) {
                    console.log('failed to get repos', contributor);
                    return 0;
                }
                state.matches[contributor] = {
                    profile: profile.data,
                    total_contributions: contributions,
                    repositories: repos.data,
                };
                return 2;
            } else {
                state.matches[contributor].total_contributions += contributions;
                return 0;
            }
        }

        while (currentBatch < state.config.batchSize) {
            
                if (state.repositories.index >= state.repositories.contributorUrls.length || (Object.keys(state.matches).length >= state.config.haltOnRContributorsCount)) {
                    await this.persistState(state);
                    return {
                        batchSize: currentBatch,
                        status: 'COMPLETED',
                    };
                }
                console.log(state.repositories.index, state.repositories.contributorUrls.length, Object.keys(state.matches).length, state.config.haltOnRContributorsCount);
                const repoContributions = await Github.get.contributors(this.initiatorId, state.repositories.contributorUrls[state.repositories.index]);
                if (repoContributions.success) {
                    const filteredContributions = repoContributions.data
                    .filter(contribution => contribution.contributions >= state.config.minContributions)
                    .slice(0, state.config.maxContributors);
                    ;
                    for (const contribution of filteredContributions) {
                        currentBatch += await updateUserContributions(contribution.login, contribution.contributions);
                    }
                } else {
                    console.log('failed to get contributors', state.repositories.contributorUrls[state.repositories.index]);
                }

                currentBatch++;
                             
                state.repositories.index++;      
        }
    
        await this.persistState(state);
        return {
            batchSize: currentBatch,
            status: 'PENDING',
        };
    }

    private async stepLinkedinProfilesMatch(state: LinkedinProfilesMatchTaskState): Promise<QueryTaskResult> {
        const results = await Linkedin.search.profiles({ query: state.query, page: state.page }, this.initiatorId);
        const batchSize = 10; // 10 results per page
        if (!results) {
            return {
                batchSize,
                status: 'CANCELLED',
            };
        }
        results.profiles.forEach(profile => {
            state.profiles[profile.id] = profile;
        });
        state.companies.companyUrls.push(...results.companies.map(company => company.link));
        state.page++;
        if (results.remainingPages === 0 || Object.keys(state.profiles).length >= state.config.maxProfiles) {
            return {
                batchSize,
                status: 'COMPLETED',
            };
        }
        return {
            batchSize,
            status: 'PENDING',
        };
    }
}
