<script lang="ts">
  import { PUZZLE, SIZE, SOLUTION } from "$lib/game/samplePuzzle";
  import { type Cell, cloneGrid, computeInvalid, parseGrid } from "$lib/game/board";
  import Board from "$lib/components/Board.svelte";
  import Button from "$lib/components/Button.svelte";

  const initialBoard: Cell[][] = parseGrid(PUZZLE);
  const given: boolean[][] = initialBoard.map((row) => row.map((c) => c !== null));
  const solution: Cell[][] = parseGrid(SOLUTION);

  let board = $state<Cell[][]>(cloneGrid(initialBoard));
  let toggleCount = $state(0);
  let elapsedSeconds = $state(0);

  const isFull = $derived(board.every((row) => row.every((c) => c !== null)));
  const isSolved = $derived(
    isFull && board.every((row, r) => row.every((c, col) => c === solution[r][col]))
  );

  const invalid = $derived(computeInvalid(board, SIZE));

  const cycleCell = (r: number, c: number) => {
    if (given[r][c] || isSolved) {
      return;
    }

    const current = board[r][c];
    board[r][c] = current === null ? 0 : current === 0 ? 1 : null;
    toggleCount += 1;
  };

  const resetBoard = () => {
    board = cloneGrid(initialBoard);
    toggleCount = 0;
    elapsedSeconds = 0;
  };

  // Dev-only shortcut to skip straight to the win state while working on
  // the board UI. Stripped from production builds by import.meta.env.DEV.
  const resolveNow = () => {
    board = cloneGrid(solution);
  };

  const formatTime = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");

    return `${m}:${s}`;
  };

  $effect(() => {
    if (isSolved) {
      return;
    }

    const timer = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);

    return () => clearInterval(timer);
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

{#snippet resolveIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
{/snippet}

<section class="play">
  <div class="play__bar">
    <span class="stat">Time <strong>{formatTime(elapsedSeconds)}</strong></span>
    <span class="stat">Toggles <strong>{toggleCount}</strong></span>
    <div class="play__actions">
      {#if import.meta.env.DEV}
        <Button variant="secondary" icon={resolveIcon} type="button" onclick={resolveNow}>
          Resolve
        </Button>
      {/if}
      <Button icon={resetIcon} onclick={resetBoard} type="button" variant="secondary">Reset</Button>
    </div>
  </div>

  <Board size={SIZE} {board} {given} {invalid} solved={isSolved} oncellclick={cycleCell} />

  <p aria-hidden={!isSolved} class="solved-banner" class:visible={isSolved}>
    <span class="solved-banner__pill">
      Solved in {formatTime(elapsedSeconds)} with {toggleCount} toggles.
    </span>
  </p>
</section>

<style lang="scss">
  .play {
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
      font-size: 0.9rem;
      color: var(--muted);
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
  }

  .stat strong {
    color: white;
    font-family: var(--font-mono);
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
