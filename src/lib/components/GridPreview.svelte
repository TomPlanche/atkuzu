<script lang="ts">
  // Purely decorative: renders the sample puzzle as an inert grid for the
  // homepage hero. Not the real game board (see routes/play for that).
  import { PUZZLE, SIZE } from "$lib/game/samplePuzzle";
  import { themeStore } from "$lib/state/theme.svelte";

  const cells = PUZZLE.flatMap((row) => row.split(""));
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

<div
  class="grid-preview"
  class:theme-colors={themeStore.theme === "colors"}
  style="--size: {SIZE}"
  aria-hidden="true"
>
  {#each cells as cell, i (i)}
    <span
      class="cell"
      class:given={cell !== "."}
      class:cell--zero={cell === "0"}
      class:cell--one={cell === "1"}
    >
      {#if cell !== "." && themeStore.theme === "sunmoon"}
        <span class="cell__icon">{@render (cell === "1" ? sunIcon : moonIcon)()}</span>
      {:else if themeStore.theme !== "colors"}
        {cell === "." ? "" : cell}
      {/if}
    </span>
  {/each}
</div>

<!-- Mirrors the real board's .cell/.given look (routes/play/+page.svelte) so the
     hero preview reads as a screenshot of the actual game, not a mockup. -->
<style lang="scss">
  .grid-preview {
    display: grid;
    grid-template-columns: repeat(var(--size), 1fr);
    gap: 6px;
    width: 100%;
    aspect-ratio: 1;
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    min-width: 0;
    min-height: 0;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: white;
    font-family: var(--font-mono);
    font-size: clamp(0.85rem, 4vw, 1.25rem);
    font-weight: 600;

    &.given {
      background-color: color-mix(in oklab, var(--surface) 55%, white);
    }
  }

  .cell__icon {
    display: inline-flex;
    width: clamp(0.9rem, 3.5vw, 1.4rem);
    height: clamp(0.9rem, 3.5vw, 1.4rem);

    :global(svg) {
      width: 100%;
      height: 100%;
    }
  }

  // Same theme-colors handling as Board.svelte: the fill *is* the value, so it has to win
  // over .given's lighter background too.
  .theme-colors .cell.cell--zero,
  .theme-colors .cell.cell--zero.given {
    background-color: color-mix(in oklab, var(--rust-green) 55%, var(--surface));
  }

  .theme-colors .cell.cell--one,
  .theme-colors .cell.cell--one.given {
    background-color: color-mix(in oklab, var(--accent) 55%, var(--surface));
  }
</style>
