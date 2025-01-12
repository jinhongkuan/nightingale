import { z } from 'zod';

export const GetContributorsResponse = z.array(z.object({
    login: z.string(),
    contributions: z.number()
}));

export type GetContributorsResponse = z.infer<typeof GetContributorsResponse>;

export const RepositoriesResponse = z.array(z.object({
    description: z.string().nullable(),
    name: z.string(),
    html_url: z.string().url(),
    language: z.string().nullable(),
    contributors_url: z.string(),
    created_at: z.string().datetime(),
}));

export type RepositoriesResponse = z.infer<typeof RepositoriesResponse>;

export const SearchRepoResponse = z.object({
    items: RepositoriesResponse
});

export type SearchRepoResponse = z.infer<typeof SearchRepoResponse>;

export const GetUserProfileResponse = z.object({
    login: z.string(),
    name: z.string().nullable(),
    location: z.string().nullable(),
    email: z.string().nullable(),
    html_url: z.string().url(),
    avatar_url: z.string().url()
});

export type GetUserProfileResponse = z.infer<typeof GetUserProfileResponse>;

export const GetRateLimitResponse = z.object({
    resources: z.object({
        core: z.object({
            limit: z.number().int(),
            used: z.number().int(),
            remaining: z.number().int(),
            reset: z.number().int()
        }),
        search: z.object({
            limit: z.number().int(),
            used: z.number().int(), 
            remaining: z.number().int(),
            reset: z.number().int()
        })
    })
});