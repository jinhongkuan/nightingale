import prisma from "$lib/db/prisma";

export interface RequestQueueConfig {
    maxConcurrent?: number;
    pauseOnError?: number;
    maxRetries?: number;
}

export class RequestQueue {
    private queue: Promise<unknown>[] = [];
    private readonly maxConcurrent: number;
    private readonly pauseOnError: number;
    private readonly maxRetries: number;

    constructor(config?: RequestQueueConfig) {
        this.maxConcurrent = config?.maxConcurrent ?? 10;
        this.pauseOnError = config?.pauseOnError ?? 1000;
        this.maxRetries = config?.maxRetries ?? 3;
    }

    async add<T>(queryTaskId: string | null, fn: () => Promise<T>, retryCount = 0): Promise<T | null> {
        // Wait if at capacity
        while (this.queue.length >= this.maxConcurrent) {
            await Promise.race(this.queue);
        }

        if (queryTaskId) {
            try {
                await prisma.queryTask.findUniqueOrThrow({ where: { id: queryTaskId, status: { not: 'CANCELLED' } } })
            } catch (e) {
                console.error(e);
                return null;
            }
        }
           
        // Add request to queue and execute
        const promise = fn();
        this.queue.push(promise);
        const result = await promise;
            
        if (result === null) {
            // Remove failed request
            this.queue = this.queue.filter(p => p !== fn());
    
            if (retryCount < this.maxRetries) {
                // Pause and retry on error
                await new Promise(resolve => setTimeout(resolve, this.pauseOnError));
                return this.add(queryTaskId, fn, retryCount + 1);
            }
            return null;
        } else {
            // Remove from queue when done
            this.queue = this.queue.filter(p => p !== promise);
            return result;
        }
    }
}
