<script lang="ts">
	// Handle typeahead against the public Bluesky appview.
	// Debounces the search, shows a rich dropdown (avatar + displayName + handle),
	// remembers recently picked handles in localStorage, and supports keyboard navigation.

	type ActorSuggestion = { did: string; handle: string; displayName?: string; avatar?: string };
	type TypeaheadResponse = { actors?: ActorSuggestion[] };

	const SEARCH_HOST = 'https://public.api.bsky.app';
	const SEARCH_PATH = '/xrpc/app.bsky.actor.searchActorsTypeahead';
	const MIN_SEARCH = 2;
	const DEBOUNCE_MS = 200;
	const SEARCH_TIMEOUT_MS = 4000;
	const RESULT_LIMIT = 8;
	const RECENT_KEY = 'atkuzu_recent_handles';
	const RECENT_MAX = 5;

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
	let recent = $state<ActorSuggestion[]>(loadRecent());
	let open = $state(false);
	let loading = $state(false);
	let fetchError = $state<string | null>(null);
	let focusIndex = $state(-1);

	let container: HTMLDivElement;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let currentAbort: AbortController | null = null;

	const showingRecent = $derived(value.trim().length === 0);
	const items = $derived(showingRecent ? recent : suggestions);

	function loadRecent(): ActorSuggestion[] {
		try {
			const raw = localStorage.getItem(RECENT_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	}

	function saveRecent(actor: ActorSuggestion) {
		try {
			const next = [actor, ...recent.filter((a) => a.handle !== actor.handle)].slice(0, RECENT_MAX);
			localStorage.setItem(RECENT_KEY, JSON.stringify(next));
			recent = next;
		} catch {
			// localStorage unavailable (private mode, quota) — not fatal
		}
	}

	async function search(q: string) {
		if (currentAbort) currentAbort.abort();
		currentAbort = new AbortController();
		const controller = currentAbort;

		loading = true;
		fetchError = null;

		const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
		try {
			const url = new URL(SEARCH_PATH, SEARCH_HOST);
			url.searchParams.set('q', q);
			url.searchParams.set('limit', String(RESULT_LIMIT));

			const res = await fetch(url, { signal: controller.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data: TypeaheadResponse = await res.json();

			if (controller.signal.aborted) return;
			suggestions = data.actors ?? [];
			focusIndex = -1;
			open = true;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			fetchError = e instanceof Error ? e.message : 'Failed to load suggestions';
			suggestions = [];
		} finally {
			clearTimeout(timer);
			if (controller === currentAbort) loading = false;
		}
	}

	function onInput(ev: Event) {
		value = (ev.target as HTMLInputElement).value;
		fetchError = null;

		if (debounceTimer) clearTimeout(debounceTimer);
		if (currentAbort) {
			currentAbort.abort();
			currentAbort = null;
		}

		const q = value.trim();
		if (q.length === 0) {
			suggestions = [];
			open = recent.length > 0;
			return;
		}

		if (q.length < MIN_SEARCH) {
			open = false;
			return;
		}

		debounceTimer = setTimeout(() => search(q), DEBOUNCE_MS);
	}

	function onFocus() {
		if (showingRecent && recent.length > 0) open = true;
	}

	function select(actor: ActorSuggestion) {
		value = actor.handle;
		open = false;
		focusIndex = -1;
		saveRecent(actor);
	}

	function onKeydown(ev: KeyboardEvent) {
		if (!open || items.length === 0) return;

		if (ev.key === 'ArrowDown') {
			ev.preventDefault();
			focusIndex = (focusIndex + 1) % items.length;
		} else if (ev.key === 'ArrowUp') {
			ev.preventDefault();
			focusIndex = focusIndex <= 0 ? items.length - 1 : focusIndex - 1;
		} else if (ev.key === 'Enter') {
			if (focusIndex >= 0 && items[focusIndex]) {
				ev.preventDefault();
				select(items[focusIndex]);
			}
		} else if (ev.key === 'Escape') {
			open = false;
			focusIndex = -1;
		}
	}

	function onWindowClick(ev: MouseEvent) {
		if (container && !container.contains(ev.target as Node)) {
			open = false;
			focusIndex = -1;
		}
	}
</script>

<svelte:window onclick={onWindowClick} />

<style>
	.handle-input {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 10;
		margin: 2px 0 0;
		padding: 4px;
		list-style: none;
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		max-height: 260px;
		overflow-y: auto;
	}

	.dropdown-header {
		padding: 4px 8px;
		font-size: 0.75rem;
		color: #888;
		text-transform: uppercase;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 3px;
		cursor: pointer;
	}

	.item.focused,
	.item:hover {
		background: #f0f0f0;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: #ddd;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.text {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		overflow: hidden;
	}

	.name {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.at-handle {
		color: #666;
		font-size: 0.85rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status {
		margin: 2px 0 0;
		font-size: 0.85rem;
	}

	.error {
		color: red;
	}
</style>

<div class="handle-input" bind:this={container}>
	<input
		type="text"
		{name}
		{id}
		{placeholder}
		{required}
		{value}
		oninput={onInput}
		onfocus={onFocus}
		onkeydown={onKeydown}
		autocomplete="off"
		spellcheck="false"
		role="combobox"
		aria-expanded={open}
		aria-controls={`${id}-listbox`}
		aria-autocomplete="list"
	/>

	{#if open && items.length > 0}
		<ul class="dropdown" id={`${id}-listbox`} role="listbox">
			{#if showingRecent}
				<li class="dropdown-header">Recent</li>
			{/if}
			{#each items as item, i (item.did ?? item.handle)}
				<li
					class="item"
					class:focused={i === focusIndex}
					role="option"
					aria-selected={i === focusIndex}
					onmousedown={(e) => {
						e.preventDefault();
						select(item);
					}}
				>
					<span class="avatar">
						{#if item.avatar}
							<img src={item.avatar} alt="" loading="lazy" />
						{/if}
					</span>
					<span class="text">
						{#if showDisplayName && item.displayName && item.displayName !== item.handle}
							<span class="name">{item.displayName}</span>
						{/if}
						<span class="at-handle">@{item.handle}</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if loading}
		<p class="status">Searching…</p>
	{/if}
	{#if fetchError}
		<p class="status error">{fetchError}</p>
	{/if}
</div>
