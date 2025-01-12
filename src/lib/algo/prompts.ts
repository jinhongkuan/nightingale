import * as OpenAI from "$lib/openai"
import { OpenAIQueryMatchingUsersResponse, OpenAIQueryMatchingUsersSummaryResponse } from "./schema"
const getPromptMatchingUsersSummary = (query: string, profile: { location: string | null }, repositories: { description: string, name: string,  language: string | null, created_at: string }[]) => {
    return `
    Summarize in a paragraph of 1-3 sentences why this person is a good fit for the query, and then give a holistic rating on the scale of 5-10 on how well they match the query. Return answer in JSON format.
    Example response: {
        "summary": "James has extensive experience with the Svelte and have worked on relevant projects. For instance, he was a core contributor to XYZ which does ABC.",
        "rating": 8.5
    }
    Query: ${query}
    Projects: ${repositories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(repo => {
        return `
        Name: ${repo.name}
        Description: ${repo.description}
        ${repo.language ? `Language: ${repo.language}` : ''}
        `
    }).join('\n')}
    ${profile.location ? `Location: ${profile.location}` : ''}

    `
}

const getPromptMatchingUsers = (query: string) => {
    return `
    Return a list of domain keywords, developer role and language in JSON format that are relevant to the query. Ignore language id it is not explicitly mentioned. Avoid any other text in the response.
    e.g.
    Query: "I am looking for a frontend developer with Svelte experience interested in healthcare"
    Response: 
        {
            "keywords": ["healthcare", "medical", "doctor", "claims"],
            "role": ["frontend", "fullstack"],
            "language": ["svelte", "typescript"]
        }
    
    Query: ${query}
    `
}

const getRandomPrompt =  () => {
    return "Short description of a technical collaborator for a random project idea that uses technology to solve a real problem that will bring about public good. be specific about the problem, ideally a hot-button issue.  be specific about the role of the person (e.g. backend developer with Golang experience, frontend developer with Svelte experience). 1 sentence. no need to be formal. omit 'looking for'/'need a' etc. specify location (ideally related to the issue)"
}

export const obtainSearchParamsForMatchingContributors = async (query: string) => {
    const openai = await OpenAI.queryJSON(getPromptMatchingUsers(query));
    return OpenAIQueryMatchingUsersResponse.parse(openai);
}



export const summarizeQueryMatch = async (query: string, profile: { location: string | null }, repositories: { description: string , name: string,  language: string | null, created_at: string }[]) => {
   if (repositories.length < 3) {
    return {
        summary: '',
        rating: 5,
    };
   }
    const prompt = getPromptMatchingUsersSummary(query, profile, repositories);
    const summary = await OpenAI.queryJSON(prompt);
    return OpenAIQueryMatchingUsersSummaryResponse.parse(summary);
}

export const obtainRandomPrompt = async () => {
    const response = await OpenAI.queryText(getRandomPrompt());
    return response;
}