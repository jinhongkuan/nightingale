import { z } from 'zod';

export const GoogleImageSchema = z.object({
  contextLink: z.string(),
  height: z.number().int(),
  width: z.number().int(), 
  byteSize: z.number().int(),
  thumbnailLink: z.string(),
  thumbnailHeight: z.number().int(),
  thumbnailWidth: z.number().int()
});

export const GoogleLabelSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  label_with_op: z.string()
});

export const GoogleSearchResultSchema = z.object({
  kind: z.string(),
  title: z.string(),
  htmlTitle: z.string(),
  link: z.string(),
  displayLink: z.string(),
  snippet: z.string(),
  htmlSnippet: z.string(),
  cacheId: z.string(),
  formattedUrl: z.string(),
  htmlFormattedUrl: z.string(),
  pagemap: z.record(z.any()),
  mime: z.string(),
  fileFormat: z.string(),
  image: GoogleImageSchema,
  labels: z.array(GoogleLabelSchema),
  metatags: z.array(z.any())
});

export type GoogleSearchResult = z.infer<typeof GoogleSearchResultSchema>;

export const GoogleSearchResponseSchema = z.object({
  items: z.array(GoogleSearchResultSchema),
  searchInformation: z.object({
    formattedTotalResults: z.number(),
  })
});

export type GoogleSearchResponse = z.infer<typeof GoogleSearchResponseSchema>;
