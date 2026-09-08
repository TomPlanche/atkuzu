<script lang="ts">
  // Handle typeahead against the public Bluesky appview.
  // Debounces the search, shows a rich dropdown (avatar + displayName + handle),
  // remembers recently picked handles in localStorage, and supports keyboard navigation.

  type ActorSuggestion = { did: string; handle: string; displayName?: string; avatar?: string };
  type TypeaheadResponse = { actors?: ActorSuggestion[] };

  const SEARCH_HOST = "https://public.api.bsky.app";
  const SEARCH_PATH = "/xrpc/app.bsky.actor.searchActorsTypeahead";
  const MIN_SEARCH = 2;
  const DEBOUNCE_MS = 200;
  const SEARCH_TIMEOUT_MS = 4000;
  const RESULT_LIMIT = 8;
  const RECENT_KEY = "atkuzu_recent_handles";
  const RECENT_MAX = 5;

  let {
    value = $bindable(""),
    name = "handle",
    placeholder = "Handle or Display name",
    required = true,
    id = "handle-input",
    showDisplayName = false
  }: {
    value?: string;
    name?: string;
    placeholder?: string;
    required?: boolean;
    id?: string;
    showDisplayName?: boolean;
  } = $props();

  const loadRecent = (): ActorSuggestion[] => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

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

  const saveRecent = (actor: ActorSuggestion) => {
    try {
      const next = [actor, ...recent.filter((a) => a.handle !== actor.handle)].slice(0, RECENT_MAX);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      recent = next;
    } catch {
      // localStorage unavailable (private mode, quota), not fatal
    }
  };

  const search = async (q: string) => {
    if (currentAbort) {
      currentAbort.abort();
    }
    currentAbort = new AbortController();
    const controller = currentAbort;

    loading = true;
    fetchError = null;

    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
      const url = new URL(SEARCH_PATH, SEARCH_HOST);
      url.searchParams.set("q", q);
      url.searchParams.set("limit", String(RESULT_LIMIT));

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: TypeaheadResponse = await res.json();

      if (controller.signal.aborted) {
        return;
      }
      suggestions = data.actors ?? [];
      focusIndex = -1;
      open = true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      fetchError = e instanceof Error ? e.message : "Failed to load suggestions";
      suggestions = [];
    } finally {
      clearTimeout(timer);
      if (controller === currentAbort) {
        loading = false;
      }
    }
  };

  const onInput = (ev: Event) => {
    value = (ev.target as HTMLInputElement).value;
    fetchError = null;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
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
  };

  const onFocus = () => {
    if (showingRecent && recent.length > 0) {
      open = true;
    }
  };

  const select = (actor: ActorSuggestion) => {
    value = actor.handle;
    open = false;
    focusIndex = -1;
    saveRecent(actor);
  };

  const onKeydown = (ev: KeyboardEvent) => {
    if (!open || items.length === 0) {
      return;
    }

    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      focusIndex = (focusIndex + 1) % items.length;
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      focusIndex = focusIndex <= 0 ? items.length - 1 : focusIndex - 1;
    } else if (ev.key === "Enter") {
      if (focusIndex >= 0 && items[focusIndex]) {
        ev.preventDefault();
        select(items[focusIndex]);
      }
    } else if (ev.key === "Escape") {
      open = false;
      focusIndex = -1;
    }
  };

  const onWindowClick = (ev: MouseEvent) => {
    if (container && !container.contains(ev.target as Node)) {
      open = false;
      focusIndex = -1;
    }
  };

  // Positioned in the viewport (not relative to the input) so it never gets folded into a
  // scrollable ancestor's overflow region: inside the login modal, a `position: absolute`
  // dropdown was measured as part of the dialog's own `overflow-y: auto` content instead of
  // floating over it, so "Recent" only showed up if you scrolled the (visually static) modal.
  let dropdownPos = $state<{ top: number; left: number; width: number } | null>(null);

  const updateDropdownPos = () => {
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    dropdownPos = { top: rect.bottom, left: rect.left, width: rect.width };
  };

  $effect(() => {
    if (!open) {
      return;
    }

    updateDropdownPos();

    window.addEventListener("resize", updateDropdownPos);
    window.addEventListener("scroll", updateDropdownPos, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPos);
      window.removeEventListener("scroll", updateDropdownPos, true);
    };
  });
</script>

<svelte:window onclick={onWindowClick} />

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

  {#if open && items.length > 0 && dropdownPos}
    <ul
      class="dropdown"
      id={`${id}-listbox`}
      role="listbox"
      style:top="{dropdownPos.top}px"
      style:left="{dropdownPos.left}px"
      style:width="{dropdownPos.width}px"
    >
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

<style lang="scss">
  .handle-input {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  // Fixed, not absolute: its top/left/width come from the input's own getBoundingClientRect
  // (see updateDropdownPos), so it floats over the page instead of expanding a scrollable
  // ancestor's content box (that was the bug in the login modal: Modal.svelte's dialog has
  // overflow-y: auto, which folded this in as hidden, scroll-to-reveal content).
  .dropdown {
    position: fixed;
    z-index: 1000;
    margin: 2px 0 0;
    padding: 4px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    max-height: 260px;
    overflow-y: auto;

    &-header {
      padding: 4px 8px;
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
    }
  }

  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;

    &.focused,
    &:hover {
      background: color-mix(in oklab, var(--surface) 70%, var(--fg));
    }
  }

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--border);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
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
    color: var(--muted);
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
    color: var(--danger);
  }
</style>
