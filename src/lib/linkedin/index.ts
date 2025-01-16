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

const linkedinSearch = async (params: LinkedinSearchParams, apiKey: string): Promise<LinkedinSearchResult | null> => {
	const searchResult = await customLinkedinSearch(params, apiKey);
	if (!searchResult.success) {
		console.error(searchResult.error);
		return null;
	}
	const data = searchResult.data;
	const profiles = data.items.filter(item => LinkedInProfileResultSchema.safeParse(item).success).map(item => {
		const parsed = LinkedInProfileResultSchema.parse(item);
		const description = parsed.pagemap.metatags?.map(m => m["og:description"]).join(";") ?? undefined;
		return {
			id: parsed.link.split("/in/")[1],
			location: description?.match(/Location: ([^·]+)/)?.[1]?.trim() ?? undefined,
			fullName: `${parsed.pagemap.metatags[0]["profile:first_name"]} ${parsed.pagemap.metatags[0]["profile:last_name"]}`,
			description,
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
    profiles: async (params: LinkedinSearchParams, userId: string) => getAPIKey(userId).then(apiKey => linkedinSearchQueue.add(null, () => linkedinSearch(params, apiKey))),
}

export { search };