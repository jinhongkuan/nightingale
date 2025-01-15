import { GOOGLE_CUSTOM_SEARCH_API_KEY } from "$env/static/private";
import { customLinkedinSearch } from "$lib/google/googleCustomSearch";
import { RequestQueue } from "$lib/utils/requestQueue";
import { LinkedInCompanyResultSchema, LinkedInProfileResultSchema, type LinkedInCompany, type LinkedInProfile } from "./schema";

const linkedinSearchQueue = new RequestQueue({
    maxConcurrent: 10,
    pauseOnError: 1000,
});

export type LinkedinSearchParams = {
	query: string;
	page?: number;
}

export type LinkedinSearchResult = {
	profiles: LinkedInProfile[];
	companies: LinkedInCompany[];
	remainingPages: number;
}

const linkedinSearch = async (params: LinkedinSearchParams, apiKey: string): Promise<LinkedinSearchResult> => {
	const data = await customLinkedinSearch(params, apiKey);
	const profiles = data.items.filter(item => LinkedInProfileResultSchema.safeParse(item).success).map(item => {
		const parsed = LinkedInProfileResultSchema.parse(item);
		return {
			id: parsed.link.split("/in/")[1],
			location: parsed.title.includes('|') ? parsed.title.split('|')[0].trim().split('-').slice(1).join('-').trim() : undefined,
			fullName: `${parsed.pagemap.metatags[0]["profile:first_name"]} ${parsed.pagemap.metatags[0]["profile:last_name"]}`,
			description: parsed.pagemap.metatags.map(m => m["og:description"]).join(";"),
			avatarUrl: parsed.pagemap.cse_image[0]?.src ?? undefined,
			htmlUrl: parsed.link,
		}
	});
	const companies = data.items.filter(item => LinkedInCompanyResultSchema.safeParse(item).success).map(item => LinkedInCompanyResultSchema.parse(item));
	return { profiles, companies, remainingPages: Math.ceil(data.searchInformation.formattedTotalResults / 10) - (params.page ?? 1) };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getAPIKey = async (userId: string) => {
	return GOOGLE_CUSTOM_SEARCH_API_KEY;
  }
  
const search = {
    profiles: async (params: LinkedinSearchParams, userId: string) => getAPIKey(userId).then(apiKey => linkedinSearchQueue.add(userId, () => linkedinSearch(params, apiKey))),
}

export { search };