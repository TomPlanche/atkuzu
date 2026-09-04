<script lang="ts">
  // Purely decorative: renders the sample puzzle as an inert grid for the
  // homepage hero. Not the real game board (see routes/play for that).
  import { PUZZLE, SIZE } from "$lib/game/samplePuzzle";

  const cells = PUZZLE.flatMap((row) => row.split(""));
</script>

<div class="grid-preview" style="--size: {SIZE}" aria-hidden="true">
  {#each cells as cell, i (i)}
    <span class="cell" class:given={cell !== "."}>{cell === "." ? "" : cell}</span>
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
</style>
