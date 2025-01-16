import { GOOGLE_LINKEDIN_ENGINE_ID } from '$env/static/private';
import { GoogleSearchResponseSchema } from './schema';

export type CustomSearchParams = {
	query: string;
	page?: number;
}
export const customLinkedinSearch = async (params: CustomSearchParams, apiKey: string) => {
	const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${GOOGLE_LINKEDIN_ENGINE_ID}&q=${params.query}${params.page ? `&start=${params.page * 10 + 1}` : ''}`);
	const data = await response.json();
	const parsedData = GoogleSearchResponseSchema.safeParse(data);
	return parsedData;
}