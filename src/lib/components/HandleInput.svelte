<script lang="ts">
	type ActorSuggestion = { handle: string; displayName?: string };
	type TypeaheadResponse = { actors?: ActorSuggestion[] };

	let {
		value = $bindable(''),
		name = 'handle',
		placeholder = 'Handle or Display name',
		required = true,
		id = 'handle-input',
		showDisplayName = false
	}: {
		value?: string;
		name?: string;
		placeholder?: string;
		required?: boolean;
		id?: string;
		showDisplayName?: boolean;
	} = $props();

	let suggestions = $state<ActorSuggestion[]>([]);
	let loading = $state(false);
	let fetchError = $state<string | null>(null);

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let currentAbort: AbortController | null = null;

	async function fetchSuggestions(q: string) {
		if (currentAbort) currentAbort.abort();
		currentAbort = new AbortController();
		loading = true;
		fetchError = null;

		if(suggestions.length > 0) {
			const isThereAnExactMatch = suggestions.find(s => s.handle === q);
			if (isThereAnExactMatch) {
				loading = false;
				return;
			}
		}

		try {
			const url = `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(q)}&limit=5`;
			const res = await fetch(url, { signal: currentAbort.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data: TypeaheadResponse = await res.json();
			suggestions = data.actors ?? [];
			if(suggestions.length === 1){
				value = suggestions[0].handle;
			}
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			fetchError = e instanceof Error ? e.message : 'Failed to load suggestions';
			suggestions = [];
		} finally {
			loading = false;
		}
	}

	function onHandleInput(ev: Event) {
		const target = ev.target as HTMLInputElement;
		value = target.value;

		if (debounceTimer) clearTimeout(debounceTimer);

		if (value.trim().length >= 3) {
			debounceTimer = setTimeout(() => {
				fetchSuggestions(value.trim());
			}, 300);
		} else {
			suggestions = [];
			fetchError = null;
			if (currentAbort) {
				currentAbort.abort();
				currentAbort = null;
			}
		}
	}

	const datalistId = `${() => id}-suggestions`;
</script>
<style>
	.handle-input {
		display: flex;
		flex-direction: column;
		/*gap: 0.75rem;*/
	}
</style>
<div class="handle-input">
	<input
		type="text"
		{name}
		{id}
		{placeholder}
		{required}
		bind:value
		oninput={onHandleInput}
		list={datalistId}
		autocomplete="off"
		spellcheck="false"
	/>
	<datalist id={datalistId}>
		{#each suggestions as s, index (s.handle + index)}
			<option value={s.handle}>
				{#if s.displayName && showDisplayName}{`(${s.displayName})`}{/if} {s.handle}
			</option>
		{/each}
	</datalist>

	{#if loading}
		<p>Searching…</p>
	{/if}
	{#if fetchError}
		<p>{fetchError}</p>
	{/if}
</div>