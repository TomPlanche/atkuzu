<script lang="ts">
  import type { PageProps } from "./$types";
  import { DAILY_SIZES, type DailyPuzzle, type DailySize } from "$lib/game/daily";
  import {
    type Cell,
    chunkRows,
    cloneGrid,
    computeInvalid,
    encodeGrid,
    parseGrid
  } from "$lib/game/board";
  import { sha256Hex } from "$lib/game/hash";
  import Board from "$lib/components/Board.svelte";
  import Button from "$lib/components/Button.svelte";

  let { data }: PageProps = $props();

  type SizeEntry = {
    puzzle: DailyPuzzle | undefined;
    initial: Cell[][];
    given: boolean[][];
  };

  const entries: Record<DailySize, SizeEntry> = Object.fromEntries(
    DAILY_SIZES.map((size) => {
      const puzzle = data.daily?.puzzles.find((p) => p.size === size);
      const initial = puzzle ? parseGrid(chunkRows(puzzle.puzzle, size)) : [];
      const given = initial.map((row) => row.map((c) => c !== null));

      return [size, { puzzle, initial, given }];
    })
  ) as Record<DailySize, SizeEntry>;

  const storageKey = (size: DailySize) => `atkuzu:daily:${data.date}:${size}`;

  const readStoredBoard = (size: DailySize): Cell[][] | null => {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(storageKey(size));
      if (!raw) {
        return null;
      }

      const stored = JSON.parse(raw) as Cell[][];
      return stored.length === entries[size].initial.length ? stored : null;
    } catch {
      return null;
    }
  };

  const boardFor = (size: DailySize): Cell[][] => {
    const entry = entries[size];
    if (!entry.puzzle) {
      return [];
    }

    return readStoredBoard(size) ?? cloneGrid(entry.initial);
  };

  const defaultSize: DailySize = 6;

  let selectedSize = $state<DailySize>(defaultSize);
  let board = $state<Cell[][]>(boardFor(defaultSize));
  let toggleCount = $state(0);
  let isSolved = $state(false);

  const selectSize = (size: DailySize) => {
    selectedSize = size;
    board = boardFor(size);
    toggleCount = 0;
  };

  const given = $derived(entries[selectedSize].given);
  const isFull = $derived(board.length > 0 && board.every((row) => row.every((c) => c !== null)));
  const invalid = $derived(board.length > 0 ? computeInvalid(board, selectedSize) : []);
  const isRuleValid = $derived(invalid.every((row) => row.every((v) => !v)));

  const cycleCell = (r: number, c: number) => {
    if (given[r][c] || isSolved) {
      return;
    }

    const current = board[r][c];
    board[r][c] = current === null ? 0 : current === 0 ? 1 : null;
    toggleCount += 1;
  };

  const resetBoard = () => {
    board = cloneGrid(entries[selectedSize].initial);
    toggleCount = 0;
  };

  $effect(() => {
    const entry = entries[selectedSize];
    if (!entry.puzzle) {
      return;
    }

    try {
      localStorage.setItem(storageKey(selectedSize), JSON.stringify(board));
    } catch {
      // localStorage unavailable (private mode, quota), so progress just won't persist.
    }
  });

  $effect(() => {
    const puzzle = entries[selectedSize].puzzle;
    if (!puzzle || !isFull || !isRuleValid) {
      isSolved = false;
      return;
    }

    let cancelled = false;
    sha256Hex(encodeGrid(board)).then((hash) => {
      if (!cancelled) {
        isSolved = hash === puzzle.solutionSha256;
      }
    });

    return () => {
      cancelled = true;
    };
  });
</script>

{#snippet resetIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
{/snippet}

<section class="daily">
  <div class="daily__bar">
    <h1>Daily <span class="daily__date">{data.date}</span></h1>

    {#if data.daily}
      <div class="daily__tabs" role="tablist" aria-label="Puzzle size">
        {#each DAILY_SIZES as size (size)}
          <button
            type="button"
            role="tab"
            class="tab"
            class:active={selectedSize === size}
            aria-selected={selectedSize === size}
            onclick={() => selectSize(size)}
          >
            {size}×{size}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if !data.daily}
    <p class="notice">Today's puzzles aren't published yet. Check back soon.</p>
  {:else if !entries[selectedSize].puzzle}
    <p class="notice">
      The {selectedSize}×{selectedSize} puzzle isn't published yet. Check back soon.
    </p>
  {:else}
    <div class="daily__actions">
      <span class="stat">Toggles <strong>{toggleCount}</strong></span>
      <Button icon={resetIcon} onclick={resetBoard} type="button" variant="secondary">Reset</Button>
    </div>

    <Board
      size={selectedSize}
      {board}
      {given}
      {invalid}
      solved={isSolved}
      oncellclick={cycleCell}
    />

    <p aria-hidden={!isSolved} class="solved-banner" class:visible={isSolved}>
      <span class="solved-banner__pill">Solved today's {selectedSize}×{selectedSize}.</span>
    </p>
  {/if}
</section>

<style lang="scss">
  .daily {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding-block: var(--space-8);

    &__bar {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-block-end: var(--space-6);
      flex-wrap: wrap;

      h1 {
        font-size: 1.1rem;
        font-weight: 700;
        // Overrides the global hero-style gradient heading (src/lib/styles/_base.scss):
        // that treatment fits the homepage's big title, not a compact page label.
        background: none;
        -webkit-background-clip: initial;
        background-clip: initial;
        color: var(--fg);
      }
    }

    &__date {
      margin-inline-start: var(--space-2);
      color: var(--muted);
      font-weight: 400;
    }

    &__tabs {
      display: flex;
      gap: var(--space-2);
    }

    &__actions {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-block-end: var(--space-6);
      font-size: 0.9rem;
      color: var(--muted);
    }
  }

  .stat strong {
    color: white;
    font-family: var(--font-mono);
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

  .notice {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
  }

  .solved-banner {
    flex-shrink: 0;
    margin-block-start: var(--space-6);
    text-align: center;
    visibility: hidden;

    &.visible {
      visibility: visible;
    }

    &__pill {
      display: inline-flex;
      padding: 0.4em 1em;
      border-radius: var(--radius-sm);
      background: color-mix(in oklab, var(--accent) 16%, transparent);
      color: var(--fg);
      font-weight: 600;
    }
  }
</style>
