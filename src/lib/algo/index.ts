import { GithubContributorsMatchQueryMetadata, ContributorsMatchTaskState, LinkedinProfilesMatchTaskState, LinkedinProfilesMatchQueryMetadata } from './schema';
import { QueryTaskManager } from './queryTask';
import {  summarizeContributorMatch, summarizeLinkedinMatch } from './prompts';
import prisma from '$lib/db/prisma';
import type { QueryTaskStatus } from '@prisma/client';
import type { LinkedInProfile } from '$lib/linkedin/schema';

export const queryMatchingGithubUsers = async (query: string): Promise<string> => {

    const { queryId } = await QueryTaskManager.beginGithubContributorsMatchQuery(query, {
        batchSize: 20,
        minContributions: 25,
        maxContributors: 10,
        maxResults: 30,
        haltOnRContributorsCount: 50,
    });
    return queryId;
}

export const queryMatchingLinkedinUsers = async (query: string): Promise<string> => {
    const { queryId } = await QueryTaskManager.beginLinkedinContributorsMatchQuery(query, {
        maxProfiles: 100,
        maxCompanies: 20,
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
    const summaries = matchRecords.filter(m => !!m.githubUser).map(m => ({
        ...matches[m.githubUser!.username],
        summary: m.summary,
        rating: m.rating,
    }));


    const recordedUsers = matchRecords.map(m => m.githubUser!);
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
        summarizeContributorMatch(queryTaskId, query, matches[user].profile, matches[user].repositories.filter(r => r.description) as { description: string; name: string; language: string | null; created_at: string }[]).then(({ summary, rating }) => {
            console.log('');
            prisma.queryMatch.update({
            where: {
                id,
            },
            data: {
                summary,
                rating,
            },
        }).then(() => {
            console.log('');
        });
    });

    }
    return {
        summaries: summaries.filter(m => m.rating > 0),
        indexedCount: summaries.length,
    };
}

const getLinkedinProfilesMatchSummaries = async (matches: LinkedinProfilesMatchTaskState['profiles'], queryTaskId: string, query: string): Promise<{
    summaries: (LinkedInProfile & { summary: string; rating: number })[];
    indexedCount: number;
}> => {
    const matchedUsers = Object.keys(matches);
    const matchRecords = await prisma.queryMatch.findMany({
        where: {
            queryTaskId,
            linkedinProfile: {
                linkedInId: {
                    in: matchedUsers,
                },
            },
        },
        include: {
            linkedinProfile: { select: { linkedInId: true }},
        },
    });
    const summaries = matchRecords.map(m => ({
        ...matches[m.linkedinProfile!.linkedInId],
        summary: m.summary,
        rating: m.rating,
    }));


    const recordedUsers = matchRecords.map(m => m.linkedinProfile?.linkedInId).filter(Boolean);
    const missingUsers = matchedUsers.filter(u => !recordedUsers.some(r => r === u));

    // Create db entry as we await openai response
    const missingUsersWithDbEntry = await Promise.all(missingUsers.map(async (user) => {
        return [(await prisma.queryMatch.create({
            data: {
                queryTaskId,
                linkedinProfileId: (await prisma.linkedinProfile.upsert({
                    where: { linkedInId: user },
                    create: { linkedInId: user },
                    update: {},
                })).id,
                summary: "",
                rating: 0,
            },
        })).id, user];
    }));
    for (const [id, profile] of missingUsersWithDbEntry) {
        // Run them asynchronously
        summarizeLinkedinMatch(queryTaskId, query, matches[profile].description, matches[profile].location).then(({ summary, rating }) => {
            console.log('');
            prisma.queryMatch.update({
            where: {
                id,
            },
            data: {
                summary,
                rating,
            },
        }).then(() => {
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
    metadata: GithubContributorsMatchQueryMetadata;
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

    const searchParams = GithubContributorsMatchQueryMetadata.parse(query.metadata);
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

export const getLinkedinProfilesMatch = async (queryId: string): Promise<{
    metadata: LinkedinProfilesMatchQueryMetadata;
    status: QueryTaskStatus | null;
    matches: (LinkedInProfile & { summary: string; rating: number })[] | null;
    indexedCount: number;
}> => {
    const query = await prisma.query.findUniqueOrThrow({
        where: { id: queryId },
        include: {
            task: true,
        },
    });

    const searchParams = LinkedinProfilesMatchQueryMetadata.parse(query.metadata);
    const task = query.task;
    if (!task) {
        return {
            metadata: searchParams,
            status: null,
            matches: null,
            indexedCount: 0,
        };
    }
    const state = LinkedinProfilesMatchTaskState.parse(task.taskState);

    const summaries = await getLinkedinProfilesMatchSummaries(state.profiles, task.id, query.query);
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