<script lang="ts">
  import { PUZZLE, SIZE, SOLUTION } from '$lib/game/samplePuzzle';
  import Button from '$lib/components/Button.svelte';

  type Cell = 0 | 1 | null;

  const parseRow = (row: string): Cell[] =>
    row.split('').map((ch) => (ch === '0' ? 0 : ch === '1' ? 1 : null));

  const initialBoard: Cell[][] = PUZZLE.map(parseRow);
  const given: boolean[][] = initialBoard.map((row) => row.map((c) => c !== null));
  const solution: Cell[][] = SOLUTION.map(parseRow);

  let board = $state<Cell[][]>(initialBoard.map((row) => [...row]));
  let toggleCount = $state(0);
  let elapsedSeconds = $state(0);

  const isFull = $derived(board.every((row) => row.every((c) => c !== null)));
  const isSolved = $derived(
    isFull && board.every((row, r) => row.every((c, col) => c === solution[r][col]))
  );

  const getColumn = (b: Cell[][], c: number): Cell[] => b.map((row) => row[c]);

  /**
   * Live rule check: three in a row, an unbalanced line, or a duplicate line.
   * Marks every cell that takes part in a broken rule. A duplicate line marks
   * the whole line. An unbalanced line marks only the cells holding the value
   * that goes over the limit.
   *
   * @param b - The current board state.
   * @returns A same-shape grid where each `true` cell breaks a rule.
   */
  const computeInvalid = (b: Cell[][]): boolean[][] => {
    const invalid = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));

    const mark = (r: number, c: number) => {
      invalid[r][c] = true;
    };

    const checkTriples = (line: Cell[], markAt: (i: number) => void) => {
      for (let i = 0; i < line.length - 2; i++) {
        const [a, b2, c2] = [line[i], line[i + 1], line[i + 2]];

        if (a !== null && a === b2 && b2 === c2) {
          markAt(i);
          markAt(i + 1);
          markAt(i + 2);
        }
      }
    };

    const checkBalance = (line: Cell[], markAt: (i: number) => void) => {
      const zeros = line.filter((v) => v === 0).length;
      const ones = line.filter((v) => v === 1).length;

      const overflowing = zeros > SIZE / 2 ? 0 : ones > SIZE / 2 ? 1 : null;
      if (overflowing !== null) {
        line.forEach((v, i) => {
          if (v === overflowing) {
            markAt(i);
          }
        });
      }
    };

    for (let r = 0; r < SIZE; r++) {
      checkTriples(b[r], (c) => mark(r, c));
      checkBalance(b[r], (c) => mark(r, c));
    }

    for (let c = 0; c < SIZE; c++) {
      const column = getColumn(b, c);

      checkTriples(column, (r) => mark(r, c));
      checkBalance(column, (r) => mark(r, c));
    }

    const rowKey = (line: Cell[]) => line.join(',');

    // Duplicate rows
    for (let i = 0; i < SIZE; i++) {
      if (!b[i].every((v) => v !== null)) {
        continue;
      }

      for (let j = i + 1; j < SIZE; j++) {
        if (b[j].every((v) => v !== null) && rowKey(b[i]) === rowKey(b[j])) {
          for (let c = 0; c < SIZE; c++) {
            mark(i, c);
            mark(j, c);
          }
        }
      }
    }

    // Duplicate columns
    for (let i = 0; i < SIZE; i++) {
      const colI = getColumn(b, i);

      if (!colI.every((v) => v !== null)) {
        continue;
      }

      for (let j = i + 1; j < SIZE; j++) {
        const colJ = getColumn(b, j);
        if (colJ.every((v) => v !== null) && rowKey(colI) === rowKey(colJ)) {
          for (let r = 0; r < SIZE; r++) {
            mark(r, i);
            mark(r, j);
          }
        }
      }
    }

    return invalid;
  };

  const invalid = $derived(computeInvalid(board));

  const cycleCell = (r: number, c: number) => {
    if (given[r][c] || isSolved) {
      return;
    }

    const current = board[r][c];
    board[r][c] = current === null ? 0 : current === 0 ? 1 : null;
    toggleCount += 1;
  };

  const resetBoard = () => {
    board = initialBoard.map((row) => [...row]);
    toggleCount = 0;
    elapsedSeconds = 0;
  };

  // Dev-only shortcut to skip straight to the win state while working on
  // the board UI. Stripped from production builds by import.meta.env.DEV.
  const resolveNow = () => {
    board = solution.map((row) => [...row]);
  };

  const formatTime = (total: number): string => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');

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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
{/snippet}

{#snippet resolveIcon()}
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5"/>
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

  <div class="board-wrap">
    <div class="board" class:solved={isSolved}>
      {#each board as row, r (r)}
        {#each row as cell, c (c)}
          <button
              type="button"
              class="cell"
              class:given={given[r][c]}
              class:filled={cell !== null}
              class:invalid={invalid[r][c]}
              disabled={given[r][c]}
              aria-label={`Row ${r + 1}, column ${c + 1}`}
              onclick={() => cycleCell(r, c)}
          >
            {cell === null ? '' : cell}
          </button>
        {/each}
      {/each}
    </div>
  </div>

  <p aria-hidden={!isSolved} class="solved-banner" class:visible={isSolved}>
		<span class="solved-banner__pill">
			Solved in {formatTime(elapsedSeconds)} with {toggleCount} toggles.
		</span>
  </p>
</section>

<style>
    .play {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding-block: var(--space-8);
    }

    .play__bar {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        margin-block-end: var(--space-6);
        font-size: 0.9rem;
        color: var(--muted);
    }

    .stat strong {
        color: white;
        font-family: var(--font-mono);
    }

    .play__actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .board-wrap {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .board {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
        width: 80%;
        height: auto;
        max-height: 100%;
        aspect-ratio: 1;
    }

    .cell {
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        min-width: 0;
        min-height: 0;
        padding: 0;
        background-color: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: white;
        font-family: var(--font-mono);
        font-size: clamp(1.25rem, 5vw, 1.75rem);
        font-weight: 600;
        cursor: pointer;
        transition: background var(--transition-fast),
        border-color var(--transition-fast);
    }

    .cell:not(.given):hover {
        background-color: var(--surface-hover);
    }

    .cell:not(.given):focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    .cell.filled:not(.given) {
        border-color: color-mix(in oklab, var(--accent) 45%, var(--border));
    }

    .cell.given {
        background-color: color-mix(in oklab, var(--surface) 55%, white);
        color: white;
        cursor: default;
        opacity: 1;
    }

    .cell.invalid {
        border-color: var(--danger);
        background-color: var(--surface);
        background-image: repeating-linear-gradient(
                45deg,
                color-mix(in oklab, var(--danger) 70%, black) 0,
                color-mix(in oklab, var(--danger) 70%, black) 6px,
                transparent 6px,
                transparent 12px
        );
    }

    .cell.invalid.given {
        background-color: color-mix(in oklab, var(--surface) 55%, white);
    }

    .board.solved .cell {
        border-color: var(--accent);
    }

    .solved-banner {
        flex-shrink: 0;
        margin-block-start: var(--space-6);
        text-align: center;
        visibility: hidden;
    }

    .solved-banner.visible {
        visibility: visible;
    }

    .solved-banner__pill {
        display: inline-flex;
        padding: 0.4em 1em;
        border-radius: var(--radius-sm);
        background: color-mix(in oklab, var(--accent) 16%, transparent);
        color: var(--fg);
        font-weight: 600;
    }
</style>
