import { getContributors, getUserProfile, getUserRepos } from "./get";
import { searchRepo, type SearchRepoParams } from "./search";
import { GITHUB_API_KEY } from "$env/static/private";
import { GetRateLimitResponse } from "./schema";
const MAX_CONCURRENT = 100;
type UserRequests = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requests: (() => Promise<any>)[];
  running: number;
}

export class RequestQueue  {
  private static userRequests: Map<string, UserRequests> = new Map();

  private static async waitForRateLimit(userId: string) {
    const limits = await getRateLimit(userId);
    const { core, search } = limits.resources;

    const waitForReset = async (reset: number) => {
      const now = Math.floor(Date.now() / 1000);
      if (reset > now) {
        await new Promise(resolve => setTimeout(resolve, (reset - now) * 1000));
      }
    };

    if (core.remaining < 50) {
      await waitForReset(core.reset);
    }
    if (search.remaining < 2) {
      await waitForReset(search.reset);
    }
  }

  static async add<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.userRequests.has(userId)) {
      this.userRequests.set(userId, { requests: [], running: 0 });
    }
    const userRequests = this.userRequests.get(userId)!;
    if (userRequests.running >= MAX_CONCURRENT) {
      // Wait in queue
      await new Promise<void>((resolve) => {
        userRequests.requests.push(() => {
          resolve();
          return fn();
        });
      });
    }
    userRequests.running++;
    try {
      await this.waitForRateLimit(userId);
      await this.waitForRateLimit(userId);
      const result = await fn();
      return result;
    } finally {
      userRequests.running--;
      if (userRequests.requests.length > 0) {
        const next = userRequests.requests.shift();
        // Execute the queued function and handle its promise
        next?.().catch(console.error);
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getAPIKey = async (userId: string) => {
  return GITHUB_API_KEY;
}

const getRateLimit = async (userId: string) => {
  const response = await fetch(`https://api.github.com/rate_limit`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${await getAPIKey(userId)}`,
    }
  });
  const data = await response.json();
  return GetRateLimitResponse.parse(data);
}

// Wrap the functions with queue
const get = {
  contributors: async (userId: string, contributorsUrl: string) => 
    getAPIKey(userId).then(apiKey => RequestQueue.add(userId, () => getContributors(apiKey, contributorsUrl))),
  userProfile: async (userId: string, login: string) => 
    getAPIKey(userId).then(apiKey => RequestQueue.add(userId, () => getUserProfile(apiKey, login))),
  userRepos: async (userId: string, login: string) => 
    getAPIKey(userId).then(apiKey => RequestQueue.add(userId, () => getUserRepos(apiKey, login))),
};

const search = {
  repo: async (userId: string, params: SearchRepoParams) => 
    getAPIKey(userId).then(apiKey => RequestQueue.add(userId, () => searchRepo(apiKey, params)))
};

export { get, search };