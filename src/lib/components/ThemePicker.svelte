<script lang="ts">
  import { THEMES, themeStore, type Theme } from "$lib/state/theme.svelte";

  const LABELS: Record<Theme, string> = {
    digits: "Digits",
    sunmoon: "Sun & Moon",
    colors: "Colors"
  };
</script>

{#snippet sunIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
{/snippet}

{#snippet moonIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
{/snippet}

<h2 id="theme-modal-title">Board theme</h2>
<p class="subtitle">How filled cells are drawn on the board, on both /play and /daily.</p>

<div class="theme-tabs" role="tablist" aria-label="Board theme">
  {#each THEMES as theme (theme)}
    <button
      type="button"
      role="tab"
      class="tab"
      class:active={themeStore.theme === theme}
      aria-selected={themeStore.theme === theme}
      onclick={() => themeStore.set(theme)}
    >
      {LABELS[theme]}
    </button>
  {/each}
</div>

{#if themeStore.fetchedFromPds}
  <p class="synced-note">Fetched from PDS.</p>
{/if}

<div class="preview">
  <span class="preview__cell" class:preview__cell--one={themeStore.theme === "colors"}>
    {#if themeStore.theme === "sunmoon"}
      <span class="preview__icon">{@render sunIcon()}</span>
    {:else if themeStore.theme !== "colors"}
      1
    {/if}
  </span>
  <span class="preview__cell" class:preview__cell--zero={themeStore.theme === "colors"}>
    {#if themeStore.theme === "sunmoon"}
      <span class="preview__icon">{@render moonIcon()}</span>
    {:else if themeStore.theme !== "colors"}
      0
    {/if}
  </span>
</div>

<style lang="scss">
  h2 {
    margin-block-end: var(--space-2);
  }

  .subtitle {
    margin: 0 0 var(--space-4);
    color: var(--muted);
    font-size: 0.9rem;
  }

  .theme-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block-end: var(--space-6);
  }

  .tab {
    padding: 0.4em 0.9em;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
    }

    &.active {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-contrast);
    }
  }

  .synced-note {
    margin: calc(-1 * var(--space-4)) 0 var(--space-4);
    color: var(--muted);
    font-size: 0.8rem;
  }

  .preview {
    display: flex;
    gap: var(--space-2);
  }

  .preview__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: white;
    font-family: var(--font-mono);
    font-size: 1.25rem;
    font-weight: 600;

    &--one {
      background: color-mix(in oklab, var(--accent) 55%, var(--surface));
    }

    &--zero {
      background: color-mix(in oklab, var(--rust-green) 55%, var(--surface));
    }
  }

  .preview__icon {
    display: inline-flex;
    width: 1.4rem;
    height: 1.4rem;

    :global(svg) {
      width: 100%;
      height: 100%;
    }
  }
</style>
