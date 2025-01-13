<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import type { GetContributorsMatchResponse } from './api/contributorsMatch/+server';

    let query = $state<string>('');
    let queryId = $state<string | null>(null);
    let matches = $state<(GetContributorsMatchResponse['matches'][number] & {removed: boolean})[]>([]);
    let searching = $state<boolean>(false);
    let searchInterval: NodeJS.Timer;
    let fetchingPrompt = $state<boolean>(false);
    let showMission = $state<boolean>(false);
    let flashBuildText = $state<boolean>(false);
    let matchCount = $state<number>(0);

    const SEARCH_INTERVAL = 5000;
    onMount(() => {
        setInterval(() => {
            flashBuildText = Math.random() < 0.2;
        }, 10000);
    });
    async function handleSubmit() {
        if (searching) {
            // Cancel search
            await fetch(`/api/contributorsMatch?queryId=${queryId}`, {
                method: 'DELETE'
            });
            searching = false;
            matchCount = 0;
            if (searchInterval) clearInterval(searchInterval);
        } else {
            // Start search
            searching = true;
            matches = [];
            matchCount = 0;
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
        const response = await fetch(`/api/contributorsMatch?queryId=${queryId}`);
        const data: GetContributorsMatchResponse = await response.json();
        
        // Preserve original order of matches and mark removed ones
        matches = matches
            .map(m => {
                const updatedMatch = data.matches.find(m2 => m2.htmlUrl === m.htmlUrl);
                return updatedMatch ? { ...updatedMatch, removed: false } : { ...m, removed: true };
            })
            .filter(m => !m.removed)
            .concat(data.matches.filter(m => !matches.some(m2 => m2.htmlUrl === m.htmlUrl)).map(m => ({ ...m, removed: false })));

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
        searchInterval = setInterval(() => fetchMatches(), SEARCH_INTERVAL);
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
        <div class="w-full max-w-md ">
            <p class="text-lg mb-4 flex flex-col sm:flex-row sm:items-center justify-center cursor-pointer hover:opacity-80" on:click={() => showMission = !showMission}>
                <span class:flash-build-text={flashBuildText}>Build what you believe in</span>
              
                <span class="mx-2 sm:hidden">•</span>
                <span class="mx-2 hidden sm:inline">•</span>
                <span>Catalyzing change with tech</span>

            </p>
            <!-- {#if showMission}
                <div class="bg-gray-50 border rounded-lg p-4 mb-8" transition:slide="{{ duration: 300 }}">
                    <p class="text-sm">
                         redirect the focus of technology towards human flourishing, 
                         and leverage market competition towards the greater good
                    </p>
                </div>
            {/if} -->
        </div>

        <div class="w-full max-w-md ">
            <textarea
                bind:value={query}
                placeholder="Describe your ideal collaborator/next hire"
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
                    {#if searching}
                        Cancel Search
                    {:else}
                        Find Match on <svg class="inline-block w-5 h-5 ml-1" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="currentColor"/></svg>
                    {/if}
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
                        <span class="text-sm">
                            {matchCount > 0 ? `Indexing ${matchCount} profiles...` : 'Searching...'}
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    </div>

        <div class="mt-12 w-full max-w-3xl" in:fade="{{ duration: 300 }}">
            <div class="max-h-[600px] overflow-y-auto">
               {#key matches} 
               {#each matches as match (match.htmlUrl)}
               <div class="border rounded-lg p-4 mb-4 flex items-start"
                    in:fade="{{ duration: 300 }}"
                    out:fade="{{ duration: 300 }}">
                   <img src={match.avatarUrl} alt={match.fullName} class="w-12 h-12 rounded-full mr-4">
                   <div class="flex-grow">
                       <div class="flex justify-between items-start">
                           <div class="flex items-center gap-2">
                               <a href={match.htmlUrl} target="_blank" rel="noopener noreferrer" 
                                  class="text-lg font-semibold hover:text-blue-600">
                                   {match.fullName}
                               </a>
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
                               {#if match.location}
                                   <span class="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                                       <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                           <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                                       </svg>
                                       {match.location}
                                   </span>
                               {/if}
                           </div>
                           <span class="text-sm text-gray-600">
                               Total Contributions: {match.totalContributions.toLocaleString()}
                           </span>
                       </div>
                       {@html `<p class="mt-2">
                           ${match.summary.split('|')[0]?.trim().split('+').filter(Boolean).map(text => 
                               `<span class="text-green-800">+${text}</span><br/>`
                           ).join('') ?? ''}
                           ${match.summary.split('|')[1]?.trim().split('-').filter(Boolean).map(text => 
                               `<span class="text-red-600">-${text}</span><br/>`
                           ).join('') ?? ''}
                       </p>`}
                   </div>
               </div>
           {/each}
               {/key}
            </div>
        </div>
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
    .flash-build-text {
        animation: characterGlow 1.5s ease-in-out;
    }

    @keyframes characterGlow {
        0%, 100% {
            text-shadow: none;
        }
        50% {
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.8),
                        0 0 12px #fabd1754;
        }
    }


</style>   
