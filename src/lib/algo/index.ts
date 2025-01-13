import { ContributorsMatchQueryMetadata, ContributorsMatchTaskState } from './schema';
import { QueryTaskManager } from './queryTask';
import { obtainSearchParamsForMatchingContributors, summarizeQueryMatch } from './prompts';
import prisma from '$lib/db/prisma';
import type { QueryTaskStatus } from '@prisma/client';

export const queryMatchingGithubUsers = async (query: string): Promise<string> => {
    const searchParams = await obtainSearchParamsForMatchingContributors(query);
    const { id: queryId } = await prisma.query.create({
        data: {
            query: query,
            metadata: searchParams,
        },
    });
    console.log("queryId", queryId);
     await QueryTaskManager.beginContributorsMatchQueryTask(queryId, {
        batchSize: 20,
        minContributions: 25,
        maxContributors: 10,
        maxResults: 30,
        haltOnRContributorsCount: 50,
    });
    return queryId;
}

const getContributorsMatchSummaries = async (matches: ContributorsMatchTaskState['matches'], queryTaskId: string, query: string): Promise<{
    summaries: (ContributorsMatchTaskState['matches'][string] & { summary: string; rating: number })[];
    indexedCount: number;
}> => {
    const matchedUsers = Object.keys(matches);
    const matchRecords = await prisma.queryMatch.findMany({
        where: {
            queryTaskId,
            githubUser: {
                username: {
                    in: matchedUsers,
                },
            },
        },
        include: {
            githubUser: { select: { username: true }},
        },
    });
    const summaries = matchRecords.map(m => ({
        ...matches[m.githubUser.username],
        summary: m.summary,
        rating: m.rating,
    }));


    const recordedUsers = matchRecords.map(m => m.githubUser);
    const missingUsers = matchedUsers.filter(u => !recordedUsers.some(r => r.username === u));

    // Create db entry as we await openai response
    const missingUsersWithDbEntry = await Promise.all(missingUsers.map(async (user) => {
        return [(await prisma.queryMatch.create({
            data: {
                queryTaskId,
                githubUserId: (await prisma.githubUser.upsert({
                    where: { username: user },
                    create: { username: user },
                    update: {},
                })).id,
                summary: "",
                rating: 0,
            },
        })).id, user];
    }));
    for (const [id, user] of missingUsersWithDbEntry) {
        // Run them asynchronously
        summarizeQueryMatch(queryTaskId, query, matches[user].profile, matches[user].repositories.filter(r => r.description) as { description: string; name: string; language: string | null; created_at: string }[]).then(({ summary, rating }) => {
            console.log('');
            prisma.queryMatch.update({
            where: {
                id,
            },
            data: {
                summary,
                rating,
            },
        }).then(m => {
            console.log('');
        });
    });

    }
    return {
        summaries: summaries.filter(m => m.rating > 0),
        indexedCount: summaries.length,
    };
}

export const getContributorsMatch = async (queryId: string): Promise<{
    metadata: ContributorsMatchQueryMetadata;
    status: QueryTaskStatus | null;
    matches: (ContributorsMatchTaskState['matches'][string] & { summary: string; rating: number })[] | null;
    indexedCount: number;
}> => {
    const query = await prisma.query.findUniqueOrThrow({
        where: { id: queryId },
        include: {
            task: true,
        },
    });

    const searchParams = ContributorsMatchQueryMetadata.parse(query.metadata);
    const task = query.task;
    if (!task) {
        return {
            metadata: searchParams,
            status: null,
            matches: null,
            indexedCount: 0,
        };
    }
    const state = ContributorsMatchTaskState.parse(task.taskState);

    // Only get summaries for the top contenders 
    const topContenders = Object.fromEntries(Object.entries(state.matches)   .sort((a, b) => {
        const aHasEmail = a[1].profile.email ? 1 : 0;
        const bHasEmail = b[1].profile.email ? 1 : 0;
        if (bHasEmail !== aHasEmail) {
            return bHasEmail - aHasEmail;
        }
        return b[1].total_contributions - a[1].total_contributions;
    })
    .slice(0, state.config.maxResults));
    const summaries = await getContributorsMatchSummaries(topContenders, task.id, query.query);
    return {
        metadata: searchParams,
        status: task.status,
        matches: summaries.summaries,
        indexedCount: summaries.indexedCount,
    };
}

export const cancelQueryTask = async (queryId: string) => {
    const query = await prisma.query.findUniqueOrThrow({
        where: { id: queryId },
        include: {
            task: true,
        },
    });
    if (!query.task) {
        return;
    }
    await QueryTaskManager.cancelQueryTask(query.task.id);
}