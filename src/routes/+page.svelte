<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import type { GetContributorsMatchResponse } from './api/contributorsMatch/+server';

    let query = $state<string>('');
    let queryId = $state<string | null>(null);
    let matches = $state<GetContributorsMatchResponse['matches']>([]);
    let searching = $state<boolean>(false);
    let searchInterval: NodeJS.Timer;
    let fetchingPrompt = $state<boolean>(false);
    async function handleSubmit() {
        if (searching) {
            // Cancel search
            await fetch(`/api/contributorsMatch?queryId=${queryId}`, {
                method: 'DELETE'
            });
            queryId = null;
            searching = false;
            matches = [];
            if (searchInterval) clearInterval(searchInterval);
        } else {
            // Start search
            searching = true;
            const response = await fetch('/api/contributorsMatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await response.json();
            queryId = data.queryId;
            startPolling();
        }
    }

    async function fetchMatches() {
        if (!queryId) return;
        const response = await fetch(`/api/contributorsMatch?queryId=${queryId}`);
        const data: GetContributorsMatchResponse = await response.json();
        matches = data.matches;
        if (data.status === 'COMPLETED') {
            searching = false;
            if (searchInterval) clearInterval(searchInterval);
        }
    }

    async function handleRandomPrompt() {
        fetchingPrompt = true;
        try {
            const response = await fetch('/api/randomPrompt');
            const data = await response.json();
            query = data.prompt;
        } catch (error) {
            console.error('Failed to fetch random prompt:', error);
        } finally {
            fetchingPrompt = false;
        }
    }

    function startPolling() {
        searchInterval = setInterval(fetchMatches, 10000);
        fetchMatches(); // Initial fetch
    }

    onMount(() => {
        return () => {
            if (searchInterval) clearInterval(searchInterval);
        };
    });
</script>

<main class="min-h-screen flex flex-col items-center p-8">
    <div class="text-center">
        <h1 class="text-4xl font-bold mb-4 transition-opacity duration-500" class:flash={searching}>
            Nightingale
        </h1>
        <p class="text-lg mb-8">
            Build what you believe in <span class="mx-2">•</span> Find your partner in crime
        </p>

        <div class="w-full max-w-2xl">
            <textarea
                bind:value={query}
                placeholder="Describe your ideal technical collaborator"
                class="w-full p-4 border rounded-lg mb-4 min-h-[120px] resize-none"
                disabled={!!queryId}
            ></textarea>
            <div class="flex items-center justify-center gap-4">
                <button
                    on:click={handleSubmit}
                    class="px-6 h-10 rounded-lg {searching 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'} text-white"
                >
                    {searching ? 'Cancel Search' : 'Find Match'}
                </button>
                {#if !searching} 
                <button
                    class="px-1 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                    title="Random prompt"
                    on:click={handleRandomPrompt}
                >
                {#if fetchingPrompt}
                    <div class="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent"></div>
                {:else}
                    <img src="dice.png" alt="Random" class="h-8 w-8" />
                {/if}                
                </button>
                {/if}
                {#if searching}
                    <div class="flex items-center gap-2" transition:fade="{{ duration: 300 }}">
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span class="text-sm">Searching...</span>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    {#if matches && matches.length > 0}
        <div class="mt-12 w-full max-w-3xl" transition:fade="{{ duration: 300 }}">
            <div class="max-h-[600px] overflow-y-auto">
                {#each matches as match}
                    <div class="border rounded-lg p-4 mb-4 flex items-start">
                        <img src={match.avatarUrl} alt={match.fullName} class="w-12 h-12 rounded-full mr-4">
                        <div class="flex-grow">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-2">
                                    <a href={match.htmlUrl} target="_blank" rel="noopener noreferrer" 
                                       class="text-lg font-semibold hover:text-blue-600">
                                        {match.fullName}
                                    </a>
                                    {#if match.location}
                                    <span class="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                        </svg>
                                        {match.location}
                                    </span>
                                {/if}
                                    {#if match.email}
                                        <a href="mailto:{match.email}" 
                                           class="text-gray-600 hover:text-blue-600"
                                           title="Send email">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                            </svg>
                                        </a>
                                    {/if}
                              
                                </div>
                                <span class="text-sm text-gray-600">
                                    Total Contributions: {match.totalContributions.toLocaleString()}
                                </span>
                            </div>
                            <p class="text-gray-700 mt-2">{match.summary}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</main>

<style>
    @keyframes flash {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    .flash {
        animation: flash 1s;
    }
</style>   

