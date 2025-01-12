import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

class OpenAIRequestQueue {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static queue: (() => Promise<any>)[] = [];
    private static buffer: Promise<void>[] = [];
    private static readonly MAX_CONCURRENT = 10; // Max concurrent requests
    private static readonly BUFFER_WINDOW = 1000;
    private static readonly PAUSE_ON_ERROR = 1000; // Pause for 1 second on error

    static async add<T>(fn: () => Promise<T>): Promise<T> {
        // Clean expired buffer entries
        this.buffer = this.buffer.filter(p => p !== Promise.resolve());

        // If at capacity, wait for a slot
        if (this.buffer.length >= this.MAX_CONCURRENT) {
            await Promise.race(this.buffer);
        }

        // Add new request to buffer with timeout
        const bufferPromise = new Promise<void>(resolve => {
            setTimeout(resolve, this.BUFFER_WINDOW);
        });
        this.buffer.push(bufferPromise);

        // If there are queued items, add to queue
        if (this.queue.length > 0) {
            return new Promise((resolve, reject) => {
                this.queue.push(async () => {
                    try {
                        resolve(await fn());
                    } catch (err) {
                        // Pause on error
                        await new Promise(resolve => setTimeout(resolve, this.PAUSE_ON_ERROR));
                        // Re-add failed task to front of queue
                        this.queue.unshift(async () => {
                            try {
                                resolve(await fn());
                            } catch (retryErr) {
                                reject(retryErr);
                            }
                        });
                    }
                });
            });
        }

        try {
            // Execute request
            const result = await fn();
            
            // Process next in queue if any
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                next?.().catch(console.error);
            }

            return result;
        } catch (err) {
            // Pause on error
            await new Promise(resolve => setTimeout(resolve, this.PAUSE_ON_ERROR));
            // Re-add failed task to front of queue
            this.queue.unshift(fn);
            
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                next?.().catch(console.error);
            }
            
            // Return a new promise that will resolve when the retried task completes
            return this.add(fn);
        }
    }
}

export const queryJSON = async (query: string) => {
    return OpenAIRequestQueue.add(async () => {
        const response = await openai.beta.chat.completions.parse({
            model: 'gpt-4o',
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
            model: 'gpt-4o',
            messages: [{ role: 'user', content: query }],
        });
        return response.choices[0].message.content;
    });
}