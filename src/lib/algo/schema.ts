import { GetUserProfileResponse, RepositoriesResponse } from '$lib/github/schema';
import { LinkedInProfile } from '$lib/linkedin/schema';
import { z } from 'zod';

export type QueryTaskResult = {
    batchSize: number;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export const GithubContributorsMatchQueryMetadata = z.object({
    keywordsString: z.string(),
    role: z.array(z.string()),
    language: z.array(z.string()).optional(),
    location: z.array(z.string()).optional(),
});

export type GithubContributorsMatchQueryMetadata = z.infer<typeof GithubContributorsMatchQueryMetadata>;

export const LinkedinProfilesMatchQueryMetadata = z.object({
    query: z.string(),
});

export type LinkedinProfilesMatchQueryMetadata = z.infer<typeof LinkedinProfilesMatchQueryMetadata>;

export const OpenAIQueryMatchingUsersResponse = GithubContributorsMatchQueryMetadata
export const OpenAIQueryMatchingUsersSummaryResponse = z.object({
    summary: z.string(),
    rating: z.number(),
});

// --- Github Contributors Match Task ---
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
}).extend(GithubContributorsMatchQueryMetadata.shape);
export type ContributorsMatchTaskCfg = z.infer<typeof ContributorsMatchTaskCfg>;

// --- Linkedin Contributors Match Task ---
export const LinkedinProfilesMatchTaskCfg = z.object({
    maxProfiles: z.number(),
    maxCompanies: z.number(),
});

export const LinkedinProfilesMatchTaskState = z.object({
    type: z.literal('linkedin_profiles_match'),
    config: LinkedinProfilesMatchTaskCfg,
    page: z.number(),
    query: z.string(),
    profiles: z.record(z.string(), LinkedInProfile),
    companies: z.object({
        companyUrls: z.array(z.string()),
        index: z.number(),
    }),
});
export type LinkedinProfilesMatchTaskState = z.infer<typeof LinkedinProfilesMatchTaskState>;


export type LinkedinProfilesMatchTaskCfg = z.infer<typeof LinkedinProfilesMatchTaskCfg>;
export const QueryTaskState = z.discriminatedUnion('type', [ContributorsMatchTaskState, LinkedinProfilesMatchTaskState]);

export type OpenAIQueryMatchingUsersResponse = z.infer<typeof OpenAIQueryMatchingUsersResponse>;
export type OpenAIQueryMatchingUsersSummaryResponse = z.infer<typeof OpenAIQueryMatchingUsersSummaryResponse>;
export type QueryTaskState = z.infer<typeof QueryTaskState>;
export type ContributorsMatchTaskState = z.infer<typeof ContributorsMatchTaskState>;