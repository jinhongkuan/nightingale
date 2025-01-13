import { GetContributorsResponse, GetUserProfileResponse, RepositoriesResponse } from './schema';

export const getContributors = async (apiKey: string, contributorsUrl: string) : Promise<{success: true, data: GetContributorsResponse} | {success: false}> => {
    const response = await fetch(contributorsUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        }
    });
    
    try {
        const data = await response.json();
        return GetContributorsResponse.safeParse(data);
    } catch (e) {
        return { success: false };
    }
}

export const getUserProfile = async (apiKey: string, login: string) : Promise<{success: true, data: GetUserProfileResponse} | {success: false}> => {
    const response = await fetch(`https://api.github.com/users/${login}`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        }
    });
    try {
        const data = await response.json();
        return GetUserProfileResponse.safeParse(data);
    } catch (e) {
        return { success: false };
    }
}

export const getUserRepos = async (apiKey: string, login: string) : Promise<{success: true, data: RepositoriesResponse} | {success: false}> => {
    const response = await fetch(`https://api.github.com/users/${login}/repos`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        }
    });
    try {
        const data = await response.json();
        return RepositoriesResponse.safeParse(data);
    } catch (e) {
        return { success: false };
    }
}