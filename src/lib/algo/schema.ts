import { GetUserProfileResponse, RepositoriesResponse } from '$lib/github/schema';
import { z } from 'zod';

export type QueryTaskResult = {
    batchSize: number;
    status: 'PENDING' | 'COMPLETED';
}

export const ContributorsMatchQueryMetadata = z.object({
    keywordsString: z.string(),
    role: z.array(z.string()),
    language: z.array(z.string()).optional(),
    location: z.array(z.string()).optional(),
});

export type ContributorsMatchQueryMetadata = z.infer<typeof ContributorsMatchQueryMetadata>;

export const OpenAIQueryMatchingUsersResponse = ContributorsMatchQueryMetadata
export const OpenAIQueryMatchingUsersSummaryResponse = z.object({
    summary: z.string(),
    rating: z.number(),
});
export const ContributorsMatchTaskCfg = z.object({
    batchSize: z.number(),
    minContributions: z.number(),
    maxContributors: z.number(),
    maxResults: z.number(),
    haltOnRContributorsCount: z.number(),
});
export const ContributorsMatchTaskState = z.object({
    type: z.literal('contributors_match'),
    config: ContributorsMatchTaskCfg,
    
    repositories: z.object({
        contributorUrls: z.array(z.string()),
        index: z.number(),
    }),

    matches: z.record(z.string(), z.object({
        profile: GetUserProfileResponse,
        total_contributions: z.number(),
        repositories: RepositoriesResponse,
    })),
}).extend(ContributorsMatchQueryMetadata.shape);


export type ContributorsMatchTaskCfg = z.infer<typeof ContributorsMatchTaskCfg>;

export const QueryTaskState = z.discriminatedUnion('type', [ContributorsMatchTaskState]);

export type OpenAIQueryMatchingUsersResponse = z.infer<typeof OpenAIQueryMatchingUsersResponse>;
export type OpenAIQueryMatchingUsersSummaryResponse = z.infer<typeof OpenAIQueryMatchingUsersSummaryResponse>;
export type QueryTaskState = z.infer<typeof QueryTaskState>;
export type ContributorsMatchTaskState = z.infer<typeof ContributorsMatchTaskState>;