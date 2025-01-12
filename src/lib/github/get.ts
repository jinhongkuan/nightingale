import { GetContributorsResponse, GetUserProfileResponse, RepositoriesResponse } from './schema';

export const getContributors = async (apiKey: string, contributorsUrl: string) => {
    const response = await fetch(contributorsUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        }
    });
    const data = await response.json();
    return GetContributorsResponse.parse(data);

}

export const getUserProfile = async (apiKey: string, login: string) => {
    const response = await fetch(`https://api.github.com/users/${login}`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        }
    });
    const data = await response.json();
    return GetUserProfileResponse.parse(data);
}

export const getUserRepos = async (apiKey: string, login: string) => {
    const response = await fetch(`https://api.github.com/users/${login}/repos`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        }
    });
    const data = await response.json();
    return RepositoriesResponse.parse(data);
}
