import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

class OpenAIRequestQueue {
    private static queue: Promise<unknown>[] = [];
    private static readonly MAX_CONCURRENT = 10;
    private static readonly PAUSE_ON_ERROR = 1000;

    static async add<T>(fn: () => Promise<T>): Promise<T> {
        // Wait if at capacity
        while (this.queue.length >= this.MAX_CONCURRENT) {
            await Promise.race(this.queue);
        }

        try {
            // Add request to queue and execute
            const promise = fn();
            this.queue.push(promise);
            const result = await promise;
            
            // Remove from queue when done
            this.queue = this.queue.filter(p => p !== promise);
            
            return result;
        } catch (error) {
            // Remove failed request
            this.queue = this.queue.filter(p => p !== fn());
            
            // Pause and retry on error
            await new Promise(resolve => setTimeout(resolve, this.PAUSE_ON_ERROR));
            return this.add(fn);
        }
    }
}

export const queryJSON = async (query: string) => {
    return OpenAIRequestQueue.add(async () => {
        const response = await openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: query }],
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        console.log(content);
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        const str = jsonMatch ? jsonMatch[1] : content;
        try {
            return JSON.parse(str);
        } catch (e) {
            throw new Error(`Failed to parse JSON from OpenAI response: ${str}. Error: ${e}`);
        }
    });
}

export const queryText = async (query: string) => {
    return OpenAIRequestQueue.add(async () => {
        const response = await openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: query }],
        });
        return response.choices[0].message.content;
    });
}