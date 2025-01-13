import { cancelQueryTask, getContributorsMatch, queryMatchingGithubUsers } from "$lib/algo";
import type { ContributorsMatchQueryMetadata } from "$lib/algo/schema";

export type GetContributorsMatchResponse = {
    metadata: ContributorsMatchQueryMetadata;
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
    status: 'COMPLETED' | 'RUNNING' | 'CANCELLED'  | null;
    indexedCount: number;
}

const matchScore = (totalContributions: number, rating: number) => {
    return Math.log(totalContributions) * rating;
}
export const GET = async ({ params, url }) => {
    const queryId = url.searchParams.get('queryId');
    if (!queryId) {
        return new Response(JSON.stringify({ error: 'queryId is required' }), { status: 400 });
    }
    const { metadata, matches: _matches, status, indexedCount } = await getContributorsMatch(queryId);
    if (!_matches) {
        return new Response(JSON.stringify({ metadata, matches: [], indexedCount }));
    }
    console.log('indexedCount', indexedCount);
    console.log('matches', _matches.length);
    const matches = _matches.filter(m => !!m.profile) ;
    console.log('matches with profile', matches.length);
    return new Response(JSON.stringify({ metadata, indexedCount, status, matches: matches.map(m => ({
        fullName: (m.profile!.name ? m.profile!.name.substring(0, 20) + (m.profile!.name.length > 20 ? '...' : '') : m.profile!.login),
        email: m.profile!.email,
        avatarUrl: m.profile!.avatar_url,
        htmlUrl: m.profile!.html_url,
        summary: m.summary,
        rating: m.rating,
        totalContributions: m.total_contributions,
        location: m.profile!.location,
        score: matchScore(m.total_contributions, m.rating),
    })).sort((a, b) => b.score - a.score) }));
}

export const POST = async ({ request }) => {
    const { query } = await request.json();
    const queryId = await queryMatchingGithubUsers(query);
    console.log("queryId", queryId);
    return new Response(JSON.stringify({ queryId }));
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