<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type {
		GetContributorsMatchResponse,
		GetLinkedinProfilesMatchResponse
	} from './api/contributorsMatch/+server';
	import { base } from '$app/paths';

	let query = $state<string>('');
	let queryId = $state<string | null>(null);
	let matches = $state<
		(
			| GetContributorsMatchResponse['matches'][number]
			| GetLinkedinProfilesMatchResponse['matches'][number]
		)[]
	>([]);
	let searching = $state<boolean>(false);
	let searchInterval: NodeJS.Timer;
	let fetchingPrompt = $state<boolean>(false);
	let showMission = $state<boolean>(false);
	let flashBuildText = $state<boolean>(false);
	let matchCount = $state<number>(0);
	let searchPlatform = $state<'github' | 'linkedin' | null>(null);
	let selectedOption = $state<'Next Hire' | 'Collaborators'>('Next Hire');
	let showTextarea = $state<boolean>(true);
	let searchComplete = $state<boolean>(false);

	let searchMessages = [
		'Optimizing for optimism',
		'Turning the tides',
		'Seeding serendipity',
		'Accelerating compassion',
		'Rediscovering humanity',
		'Crushing cynicism'
	];
	let currentMessageIndex = $state<number>(0);

	const SEARCH_INTERVAL = 5000;
	onMount(() => {
		setInterval(() => {
			flashBuildText = Math.random() < 0.2;
		}, 10000);

		const messageInterval = setInterval(() => {
			if (searching && matchCount === 0) {
				currentMessageIndex = (currentMessageIndex + 1) % searchMessages.length;
			}
		}, 10000);

		return () => {
			clearInterval(messageInterval);
		};
	});
	async function handleSearch(platform: 'github' | 'linkedin') {
		if (searching) {
			// Cancel search
			await fetch(`/api/contributorsMatch?queryId=${queryId}`, {
				method: 'DELETE'
			});
			searching = false;
			searchComplete = false;
			matchCount = 0;
			searchPlatform = null;
			if (searchInterval) clearInterval(searchInterval);
		} else {
			// Start search
			searching = true;
			searchComplete = false;
			showTextarea = false;
			searchPlatform = platform;
			matches = [];
			matchCount = 0;
			const response = await fetch('/api/contributorsMatch?platform=' + platform, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, platform })
			});
			const data = await response.json();
			queryId = data.queryId;
			startPolling();
		}
	}

	async function fetchMatches() {
		const response = await fetch(
			`/api/contributorsMatch?queryId=${queryId}&platform=${searchPlatform}`
		);
		const data: GetContributorsMatchResponse | GetLinkedinProfilesMatchResponse =
			await response.json();

		// Preserve original order of matches and mark removed ones
		matches = matches
			.map((m) => {
				const updatedMatch = data.matches.find((m2) => m2.htmlUrl === m.htmlUrl);
				return updatedMatch ? updatedMatch : m;
			})
			.concat(data.matches.filter((m) => !matches.some((m2) => m2.htmlUrl === m.htmlUrl)));

		matchCount = data.indexedCount;

		if (data.status === 'COMPLETED') {
			searching = false;
			searchComplete = true;
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

	function handleEditPrompt() {
		showTextarea = true;
		searchComplete = false;
		queryId = null;
		matches = [];
		matchCount = 0;
	}
</script>

<main class="flex min-h-screen flex-col items-center p-8">
	<div class="text-center">
		<h1
			class="flex items-center justify-center text-4xl font-bold transition-opacity duration-500"
			class:flash={searching}
		>
			<span class="flex items-center">
				<p class="text-4xl font-bold">Nightingale</p>
				<img src="{base}/logo.png" alt="Nightingale Logo" class="ml-3 h-16 w-16" />
			</span>
		</h1>
		<p
			class="mb-4 flex cursor-pointer flex-col justify-center text-lg hover:opacity-80 sm:flex-row sm:items-center"
			onclick={() => (showMission = !showMission)}
		>
			<span class:flash-build-text={flashBuildText}>Removing the barriers to do good</span>
		</p>

		<br />
		<div class="relative w-full max-w-4xl">
			{#if showTextarea}
				<textarea
					bind:value={query}
					placeholder="Describe your mission and what you need help with"
					class="mb-4 min-h-[180px] w-full resize-none rounded-lg border p-4"
					disabled={!!queryId}
				></textarea>
				{#if !searching}
					<button
						class="absolute bottom-6 right-0 h-10 rounded-lg px-1 transition-all {!fetchingPrompt
							? 'hover:bg-gray-100 hover:shadow-lg hover:shadow-gray-200/50'
							: ''}"
						title="Random prompt"
						onclick={handleRandomPrompt}
					>
						{#if fetchingPrompt}
							<div
								class="h-8 w-8 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
							></div>
						{:else}
							<img src="dice.png" alt="Random" class="h-8 w-8" />
						{/if}
					</button>
				{/if}
			{:else}
				<div class="mb-4 flex items-center justify-between rounded-lg border p-4">
					<p class="text-left text-gray-700">{query}</p>
					<button
						onclick={handleEditPrompt}
						class="ml-4 rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
					>
						Edit Prompt
					</button>
				</div>
			{/if}
		</div>

		{#if !searching && !searchComplete}
			<span class="rounded-lg border p-4">
				Looking for:
				<select bind:value={selectedOption} class="mb-4 border-white bg-transparent font-bold">
					<option>Next Hire</option>
					<option>Collaborators</option>

					<option disabled>Job Opportunities</option>
					<option disabled>Grant/Fundraising</option>
				</select>
			</span>
		{/if}

		<div class="flex items-center justify-center gap-4">
			<div class="flex gap-2">
				{#if !searching}
					{#if !searchComplete}
						{#if selectedOption === 'Collaborators'}
							<button
								onclick={() => handleSearch('github')}
								class="h-10 rounded-lg bg-[#24292f] px-6 text-white hover:bg-[#1b1f23]"
							>
								Match on <svg
									class="ml-1 inline-block h-5 w-5"
									viewBox="0 0 98 96"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
										fill="currentColor"
									/>
								</svg>
							</button>
						{:else}
							<button
								onclick={() => handleSearch('linkedin')}
								class="h-10 rounded-lg bg-[#24292f] px-6 text-white hover:bg-[#1b1f23]"
							>
								Match on <svg
									class="ml-1 inline-block h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
								>
									<path
										d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
										fill="currentColor"
									/>
								</svg>
								<svg
									class="ml-1 inline-block h-5 w-5"
									viewBox="0 0 98 96"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
										fill="currentColor"
									/>
								</svg>
							</button>
						{/if}
					{:else}
						<div
							class="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-green-700"
							transition:fade={{ duration: 300 }}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Search complete</span>
						</div>
					{/if}
				{:else}
					<button
						onclick={() => handleSearch(searchPlatform!)}
						class="h-10 rounded-lg bg-red-600 px-6 text-white hover:bg-red-700"
					>
						Cancel Search
					</button>
				{/if}
			</div>
			{#if searching}
				<div class="flex items-center gap-2" transition:fade={{ duration: 300 }}>
					<div class="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
					<span class="text-sm">
						{#key matchCount}
							{#if matchCount > 0}
								Indexing {matchCount} profiles...
							{:else}
								{#key currentMessageIndex}
									<span transition:fade={{ duration: 300 }}>
										{searchMessages[currentMessageIndex]}...
									</span>
								{/key}
							{/if}
						{/key}
					</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="mt-12 w-full max-w-4xl" in:fade={{ duration: 300 }}>
		<div class="max-h-[600px] overflow-y-auto">
			{#key matches}
				{#each matches as match (match.htmlUrl)}
					<div
						class="mb-4 flex items-start rounded-lg border p-4"
						in:fade={{ duration: 300 }}
						out:fade={{ duration: 300 }}
					>
						<img src={match.avatarUrl} alt={match.fullName} class="mr-4 h-12 w-12 rounded-full" />
						<div class="flex-grow">
							<div class="flex items-start justify-between">
								<div class="flex items-center gap-2">
									<a
										href={match.htmlUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-lg font-semibold hover:text-blue-600"
									>
										{match.fullName}
									</a>
									{#if 'email' in match}
										<a
											href="mailto:{match.email}"
											class="text-gray-600 hover:text-blue-600"
											title="Send email"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"
												/>
												<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
											</svg>
										</a>
									{/if}
									{#if match.location}
										<span
											class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-600"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
													clip-rule="evenodd"
												/>
											</svg>
											{match.location}
										</span>
									{/if}
								</div>
								{#if 'totalContributions' in match}
									<span class="text-sm text-gray-600">
										Total Contributions: {match.totalContributions.toLocaleString()}
									</span>
								{/if}
							</div>
							{@html `<p class="mt-2">
                           ${(() => {
															const summary = match.summary?.trim() ?? '';
															const hasPros = summary.includes('+');
															const hasCons = summary.includes('-');
															const parts = summary.split('|');

															let pros = '';
															let cons = '';

															if (hasPros) {
																// If there's a |, pros are in first part, otherwise check full string
																const prosText = parts.length > 1 ? parts[0] : summary;
																pros = prosText
																	.split('+')
																	.filter(Boolean)
																	.map(
																		(text) => `<span class="text-green-800">+${text}</span><br/>`
																	)
																	.join('');
															}

															if (hasCons) {
																// If there's a |, cons are in second part, otherwise check full string
																const consText = parts.length > 1 ? parts[1] : summary;
																cons = consText
																	.split('-')
																	.filter(Boolean)
																	.map((text) => `<span class="text-red-600">-${text}</span><br/>`)
																	.join('');
															}

															return pros + cons;
														})()}
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
		0%,
		100% {
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
		0%,
		100% {
			text-shadow: none;
		}
		50% {
			text-shadow:
				0 0 8px rgba(255, 255, 255, 0.8),
				0 0 12px #fabd1754;
		}
	}
</style>
