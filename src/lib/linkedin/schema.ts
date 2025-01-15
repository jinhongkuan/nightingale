import { z } from 'zod';

export const LinkedInProfileResultSchema = z.object({
	title: z.string(),
    link: z.string().startsWith("https://www.linkedin.com/in/"),
    pagemap: z.object({
        metatags: z.array(z.object({
            "og:description": z.string(),
            "profile:first_name": z.string(),
            "profile:last_name": z.string(),
        })),
        "cse_image": z.array(z.object({
            src: z.string()
        }))
    }),

})

export const LinkedInCompanyResultSchema = z.object({
    title: z.string(),
    link: z.string().startsWith("https://www.linkedin.com/company/"),
    pagemap: z.object({
        metatags: z.array(z.object({
            "og:description": z.string(),
        }))
    }),
    "cse_image": z.array(z.object({
        src: z.string()
    }))
})

export const LinkedInProfile = z.object({ id: z.string(), location: z.string().optional(), fullName: z.string(), description: z.string(), avatarUrl: z.string().optional(), htmlUrl: z.string() });
export type LinkedInProfile = z.infer<typeof LinkedInProfile>;
export type LinkedInCompany = z.infer<typeof LinkedInCompanyResultSchema>;
