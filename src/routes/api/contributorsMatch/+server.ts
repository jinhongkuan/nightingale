import { cancelQueryTask, getContributorsMatch, getLinkedinProfilesMatch, queryMatchingGithubUsers, queryMatchingLinkedinUsers } from "$lib/algo";
import type { GithubContributorsMatchQueryMetadata, LinkedinProfilesMatchQueryMetadata } from "$lib/algo/schema";

export type GetContributorsMatchResponse = {
    metadata: GithubContributorsMatchQueryMetadata;
    matches: {
        fullName: string;
        avatarUrl: string;
        htmlUrl: string;
        summary: string;
        rating: number;
        totalContributions: number;
        score: number;
        location: string;
        email: string | null;
    }[];
    status: 'COMPLETED' | 'PENDING' | 'CANCELLED'  | null;
    indexedCount: number;
}

export type GetLinkedinProfilesMatchResponse = {
    metadata: LinkedinProfilesMatchQueryMetadata;
    matches: {
        fullName: string;
        avatarUrl: string;
        htmlUrl: string;
        summary: string;
        rating: number;
        location: string;
    }[];
    status: 'COMPLETED' | 'PENDING' | 'CANCELLED'  | null;
    indexedCount: number;
}

const matchGithubScore = (totalContributions: number, rating: number) => {
    return Math.log(totalContributions) * rating;
}
export const GET = async ({ params, url }) => {
    const queryId = url.searchParams.get('queryId');
    const platform = url.searchParams.get('platform');
    if (!queryId) {
        return new Response(JSON.stringify({ error: 'queryId is required' }), { status: 400 });
    }

    if (platform === 'github') {
        const { metadata, matches: _matches, status, indexedCount } = await getContributorsMatch(queryId);
        if (!_matches) {
            return new Response(JSON.stringify({ metadata, matches: [], indexedCount }));
        }

        const matches = _matches.filter(m => !!m.profile) ;
        return new Response(JSON.stringify({ metadata, indexedCount, status, matches: matches.map(m => ({
            fullName: (m.profile!.name ? m.profile!.name.substring(0, 20) + (m.profile!.name.length > 20 ? '...' : '') : m.profile!.login),
            email: m.profile!.email,
            avatarUrl: m.profile!.avatar_url,
            htmlUrl: m.profile!.html_url,
            summary: m.summary,
            rating: m.rating,
            totalContributions: m.total_contributions,
            location: m.profile!.location,
            score: matchGithubScore(m.total_contributions, m.rating),
        })).sort((a, b) => b.score - a.score) } as GetContributorsMatchResponse));
    } else if (platform === 'linkedin') {
        const { metadata, matches, status, indexedCount } = await getLinkedinProfilesMatch(queryId);
        if (!matches) {
            return new Response(JSON.stringify({ metadata, matches: [], indexedCount }));
        }

        return new Response(JSON.stringify({ metadata, indexedCount, status, matches: matches.map(m => ({
            fullName: m.fullName,
            avatarUrl: m.avatarUrl,
            htmlUrl: m.htmlUrl,
            summary: m.summary,
            rating: m.rating,
            location: m.location,
            score: m.rating,
        })).sort((a, b) => b.score - a.score) } as GetLinkedinProfilesMatchResponse));
    } else {
        return new Response(JSON.stringify({ error: 'Invalid platform' }), { status: 400 });
    }
}

export const POST = async ({ request }) => {
    const { query, platform } = await request.json();
    if (platform === 'github') {
        const queryId = await queryMatchingGithubUsers(query);
        return new Response(JSON.stringify({ queryId }));
    } else if (platform === 'linkedin') {
        const queryId = await queryMatchingLinkedinUsers(query);
        return new Response(JSON.stringify({ queryId }));
    } else {
        return new Response(JSON.stringify({ error: 'Invalid platform' }), { status: 400 });
    }
}

export const DELETE = async ({ url }) => {
    const queryId = url.searchParams.get('queryId');
    if (!queryId) {
        return new Response(JSON.stringify({ error: 'queryId is required' }), { status: 400 });
    }    try {
        await cancelQueryTask(queryId);
        return new Response(JSON.stringify({ queryId }));
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to cancel query task' }), { status: 500 });
    }
}