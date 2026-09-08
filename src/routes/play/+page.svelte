<script lang="ts">
  import {
    BOARD_SIZES,
    type BoardSize,
    type Cell,
    cloneGrid,
    computeInvalid
  } from "$lib/game/board";
  import { applyDifficulty, DIFFICULTIES, type Difficulty } from "$lib/game/difficulty";
  import { generatePuzzle, randomSeed } from "$lib/game/generator";
  import { createMoveHistory } from "$lib/game/history.svelte";
  import { isRedoCombo, isUndoCombo } from "$lib/game/keys";
  import Board from "$lib/components/Board.svelte";
  import Button from "$lib/components/Button.svelte";
  import { TextMorph } from "torph/svelte";

  const history = createMoveHistory();

  let selectedSize = $state<BoardSize>(6);
  let selectedDifficulty = $state<Difficulty>("medium");

  // The wasm `dig` result (hardest puzzle) and its solution for the current seed, kept
  // around so switching difficulty re-reveals cells over them instead of drawing a new seed.
  let minimal = $state<Cell[][] | null>(null);
  let solution = $state<Cell[][] | null>(null);

  let initialBoard = $state<Cell[][]>([]);
  let given = $state<boolean[][]>([]);
  let board = $state<Cell[][]>([]);

  let loading = $state(true);
  let error = $state<string | null>(null);

  let toggleCount = $state(0);
  let elapsedSeconds = $state(0);

  const isFull = $derived(board.length > 0 && board.every((row) => row.every((c) => c !== null)));
  const isSolved = $derived(
    isFull &&
      solution !== null &&
      board.every((row, r) => row.every((c, col) => c === solution![r][col]))
  );

  const invalid = $derived(board.length > 0 ? computeInvalid(board, selectedSize) : []);

  /** Reveals `selectedDifficulty`'s cells over the current seed's minimal puzzle, resetting
   *  progress: the given cells are different per tier, so previous fills don't carry over. */
  const applyCurrentDifficulty = () => {
    if (!minimal || !solution) {
      return;
    }

    initialBoard = applyDifficulty(minimal, solution, selectedDifficulty);
    given = initialBoard.map((row) => row.map((c) => c !== null));
    board = cloneGrid(initialBoard);
    toggleCount = 0;
    elapsedSeconds = 0;
    history.clear();
  };

  /** Draws a fresh random seed and generates a new `selectedSize` puzzle. No date or
   *  puzzle-number scheme here on purpose (that's /daily's): every attempt is independent. */
  const newPuzzle = async () => {
    loading = true;
    error = null;

    try {
      const generated = await generatePuzzle(selectedSize, randomSeed());
      minimal = generated.puzzle;
      solution = generated.solution;

      applyCurrentDifficulty();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to generate a puzzle.";
    } finally {
      loading = false;
    }
  };

  const selectSize = (size: BoardSize) => {
    selectedSize = size;
    void newPuzzle();
  };

  const selectDifficulty = (difficulty: Difficulty) => {
    selectedDifficulty = difficulty;
    applyCurrentDifficulty();
  };

  const cycleCell = (r: number, c: number) => {
    if (given[r][c] || isSolved) {
      return;
    }

    const prev = board[r][c];
    const next = prev === null ? 0 : prev === 0 ? 1 : null;
    board[r][c] = next;
    toggleCount += 1;
    history.push({ r, c, prev, next });
  };

  const undo = () => {
    const move = history.undo();
    if (!move) {
      return;
    }

    board[move.r][move.c] = move.prev;
    toggleCount = Math.max(0, toggleCount - 1);
  };

  const redo = () => {
    const move = history.redo();
    if (!move) {
      return;
    }

    board[move.r][move.c] = move.next;
    toggleCount += 1;
  };

  const resetBoard = () => {
    board = cloneGrid(initialBoard);
    toggleCount = 0;
    elapsedSeconds = 0;
    history.clear();
  };

  // Dev-only shortcut to skip straight to the win state while working on
  // the board UI. Stripped from production builds by import.meta.env.DEV.
  const resolveNow = () => {
    if (solution) {
      board = cloneGrid(solution);
    }
  };

  const formatTime = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");

    return `${m}:${s}`;
  };

  $effect(() => {
    void newPuzzle();
  });

  $effect(() => {
    if (isSolved) {
      return;
    }

    const timer = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);

    return () => clearInterval(timer);
  });

  $effect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (isUndoCombo(event)) {
        event.preventDefault();
        undo();
      } else if (isRedoCombo(event)) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeydown);

    return () => window.removeEventListener("keydown", onKeydown);
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

{#snippet newPuzzleIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m16 3 4 4-4 4" />
    <path d="M20 7H8a4 4 0 0 0-4 4v1" />
    <path d="m8 21-4-4 4-4" />
    <path d="M4 17h12a4 4 0 0 0 4-4v-1" />
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

{#snippet undoIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
{/snippet}

{#snippet redoIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m15 14 5-5-5-5" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
{/snippet}

<section class="play">
  <div class="play__bar">
    <div class="play__bar-left">
      <div class="play__tabs" role="tablist" aria-label="Puzzle size">
        {#each BOARD_SIZES as size (size)}
          <button
            type="button"
            role="tab"
            class="tab"
            class:active={selectedSize === size}
            aria-selected={selectedSize === size}
            disabled={loading}
            onclick={() => selectSize(size)}
          >
            {size}×{size}
          </button>
        {/each}
      </div>
      <div class="play__tabs" role="tablist" aria-label="Difficulty">
        {#each DIFFICULTIES as difficulty (difficulty)}
          <button
            type="button"
            role="tab"
            class="tab"
            class:active={selectedDifficulty === difficulty}
            aria-selected={selectedDifficulty === difficulty}
            disabled={loading}
            onclick={() => selectDifficulty(difficulty)}
          >
            {difficulty[0].toUpperCase()}{difficulty.slice(1)}
          </button>
        {/each}
      </div>
    </div>
    <div class="play__stats">
      <span class="stat">Time <TextMorph as="strong" text={formatTime(elapsedSeconds)} /></span>
      <span class="stat">Toggles <TextMorph as="strong" text={String(toggleCount)} /></span>
    </div>
  </div>

  <div class="play__actions">
    {#if import.meta.env.DEV}
      <Button variant="secondary" icon={resolveIcon} type="button" onclick={resolveNow}>
        Resolve
      </Button>
    {/if}
    <Button
      disabled={!history.canUndo}
      icon={undoIcon}
      onclick={undo}
      type="button"
      variant="secondary"
    >
      Undo
    </Button>
    <Button
      disabled={!history.canRedo}
      icon={redoIcon}
      onclick={redo}
      type="button"
      variant="secondary"
    >
      Redo
    </Button>
    <Button
      disabled={loading}
      icon={resetIcon}
      letter="r"
      onclick={resetBoard}
      type="button"
      variant="secondary"
    >
      Reset
    </Button>
    <Button
      disabled={loading}
      icon={newPuzzleIcon}
      letter="n"
      onclick={() => newPuzzle()}
      type="button"
      variant="secondary"
    >
      New puzzle
    </Button>
  </div>

  {#if error}
    <p class="notice notice--error">{error}</p>
  {:else if loading || board.length === 0}
    <p class="notice">Generating a {selectedSize}×{selectedSize} puzzle…</p>
  {:else}
    <Board
      {board}
      {given}
      {invalid}
      oncellclick={cycleCell}
      size={selectedSize}
      solved={isSolved}
    />

    <p aria-hidden={!isSolved} class="solved-banner" class:visible={isSolved}>
      <span class="solved-banner__pill">
        Solved in {formatTime(elapsedSeconds)} with {toggleCount} toggles.
      </span>
    </p>
  {/if}
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
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-block-end: var(--space-4);
      font-size: 0.9rem;
      color: var(--muted);
    }

    &__bar-left {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-4);
    }

    &__tabs {
      display: flex;
      gap: var(--space-2);
    }

    &__stats {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      flex-shrink: 0;
      align-items: center;
      gap: var(--space-2);
      margin-block-end: var(--space-6);
    }
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

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .stat :global(strong) {
    color: white;
    font-family: var(--font-mono);
  }

  .notice {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);

    &--error {
      color: var(--danger);
    }
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
