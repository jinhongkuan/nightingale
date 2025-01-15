import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { RequestQueue } from '$lib/utils/requestQueue';

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const OpenAIRequestQueue = new RequestQueue({
    maxConcurrent: 20,
    pauseOnError: 1000,
});

export const queryJSON = async (queryTaskId: string | null, query: string) => {
    return OpenAIRequestQueue.add(queryTaskId, async () => {
        const response = await openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: query }],
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        const str = jsonMatch ? jsonMatch[1] : content;
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error(e);
            return null;
        }
    });
}

export const queryText = async (queryTaskId: string | null, query: string) => {
    return OpenAIRequestQueue.add(queryTaskId, async () => {
        const response = await openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: query }],
        });
        return response.choices[0].message.content;
    });
}