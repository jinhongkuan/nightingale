import { z } from 'zod';

export const GoogleSearchResultSchema = z.object({
  kind: z.string(),
  title: z.string(),
  htmlTitle: z.string(),
  link: z.string(),
 
  formattedUrl: z.string(),
  pagemap: z.record(z.any()),
  metatags: z.array(z.any()).optional()
});

export type GoogleSearchResult = z.infer<typeof GoogleSearchResultSchema>;

export const GoogleSearchResponseSchema = z.object({
  items: z.array(GoogleSearchResultSchema),
  searchInformation: z.object({
    formattedTotalResults: z.string().transform(str => parseInt(str.replace(/,/g, ''))),
  })
});

export type GoogleSearchResponse = z.infer<typeof GoogleSearchResponseSchema>;
