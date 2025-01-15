import * as OpenAI from "$lib/openai"
import { OpenAIQueryMatchingUsersResponse, OpenAIQueryMatchingUsersSummaryResponse } from "./schema"
const getPromptMatchingContributorSummary = (query: string, profile: { location: string | null }, repositories: { description: string, name: string,  language: string | null, created_at: string }[]) => {
    return `
    Summarize why this person is a good fit for the query, and then give a holistic rating on the scale of 5-20 on how well they match the query. Highly prioritize proximal location if provided for the sake of rating, but do not mention it in the summary. Return answer in JSON format, pros first, followed by cons.
    Example response: {
        "summary": "+worked on project ABC, which applies ML to healthcare+knowledge of Javascript|-location unknown-no experience with Svelte",
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

    `
}

const getPromptMatchingLinkedinProfileSummary = (query: string, description: string, location?: string) => {
    return `
    Summarize why this person is a good fit for the query, and then give a holistic rating on the scale of 5-20 on how well they match the query. Highly prioritize proximal location if provided for the sake of rating, but do not mention it in the summary. Return answer in JSON format, pros first, followed by cons.
    Example response: {
        "summary": "+worked on project ABC, which applies ML to healthcare+knowledge of Javascript|-location unknown-no experience with Svelte",
        "rating": 8.5
    }
    Query: ${query}
    Description: ${description}
    ${location ? `Location: ${location}` : ''}
    `
}

const getGithubPromptMatchingUsers = (query: string) => {
    return `
    Return a list of domain keywords that would make for an effective github search query, developer role and language in JSON format that are relevant to the query. Ignore language id it is not explicitly mentioned. Avoid any other text in the response.
    e.g.
    Query: "I am looking for a frontend developer with Svelte experience interested in healthcare"
    Response: 
        {
            "keywordsString": "\\"healthcare\\" AND (\\"medical\\" OR \\"doctor\\" OR \\"claims\\")",
            "role": ["frontend", "fullstack"],
            "language": ["svelte", "typescript"]
        }
    
    Query: ${query}
    `
}

export const getLinkedinPromptMatchingUsers = (query: string) => {
    return `
    Generate query string (in one line, without explanations and without site:linkedin.com) that should be passed to google search over .linked.com to fetch the following candidate:    Query: ${query}
    ${query}`
}

const getRandomPrompt =  () => {
    return "Short description of a technical collaborator for a random project idea that uses technology to solve a real problem that will bring about public good. be specific about the problem, ideally a hot-button issue.  be specific about the role of the person (e.g. backend developer with Golang experience, frontend developer with Svelte experience). 1 sentence. no need to be formal. omit 'looking for'/'need a' etc."
}

export const obtainSearchParamsForMatchingContributors = async ( query: string) => {
    const openai = await OpenAI.queryJSON(null, getGithubPromptMatchingUsers(query));
    if (!openai) {
        throw new Error('Failed to obtain search params for matching contributors');
    }
    return OpenAIQueryMatchingUsersResponse.parse(openai);
}

export const obtainSearchParamsForMatchingLinkedinUsers = async ( query: string) => {
    const openai = await OpenAI.queryText(null, getLinkedinPromptMatchingUsers(query));
    if (!openai) {
        throw new Error('Failed to obtain search params for matching linkedin profiles');
    }
    return openai;
}

export const summarizeContributorMatch = async (queryTaskId: string, query: string, profile: { location: string | null }, repositories: { description: string , name: string,  language: string | null, created_at: string }[]) => {
   if (repositories.length < 3) {
    return {
        summary: '',
        rating: 5,
    };
   }
    const prompt = getPromptMatchingContributorSummary(query, profile, repositories);
    const summary = await OpenAI.queryJSON(queryTaskId, prompt);
    if (!summary) {
        return {
            summary: '',
            rating: 5,
        };
    }
    return OpenAIQueryMatchingUsersSummaryResponse.parse(summary);
}

export const summarizeLinkedinMatch = async (queryTaskId: string, query: string, description: string, location?: string ) => {

     const prompt = getPromptMatchingLinkedinProfileSummary(query, description, location);
     const summary = await OpenAI.queryJSON(queryTaskId, prompt);
     if (!summary) {
         return {
             summary: '',
             rating: 5,
         };
     }
     return OpenAIQueryMatchingUsersSummaryResponse.parse(summary);
 }

export const obtainRandomPrompt = async () => {
    const response = await OpenAI.queryText(null, getRandomPrompt());
    return response;
}