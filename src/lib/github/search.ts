import { SearchRepoResponse } from "./schema";

export type SearchRepoParams = {
    keywords?: string[];
    language?: string[];
    in?: string[];
    user?: string;
}

export const searchRepo = async (apiKey: string, params: SearchRepoParams) => {
    // Build query string from params
    const queryParts: string[] = [];
    if (params.keywords?.length) {
        queryParts.push(...params.keywords.map(kw => `"${kw}"`));
    }

    if (params.language?.length) {
        queryParts.push(...params.language.map(lang => `language:${lang}`));
    }

    if (params.in?.length) {
        queryParts.push(...params.in.map(scope => `in:${scope}`));
    }

    if (params.user) {
        queryParts.push(`user:${params.user}`);
    }

    const queryString = queryParts.join(' ');
    const searchParams = `q=${encodeURIComponent(queryString)}&sort=created&order=desc&per_page=50`;

    const response = await fetch(`https://api.github.com/search/repositories?${searchParams}`, {
        headers: {
            'Accept': 'application/vnd.github.text-match+json',
            'Authorization': `Bearer ${apiKey}`,
        }
    });


    const data = await response.json();
    return SearchRepoResponse.parse(data);
}

