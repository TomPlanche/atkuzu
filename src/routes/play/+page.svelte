<script lang="ts">
	import { PUZZLE, SOLUTION } from '$lib/game/samplePuzzle';
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

	$effect(() => {
		if (isSolved) {
			return;
		}
		const timer = setInterval(() => {
			elapsedSeconds += 1;
		}, 1000);
		return () => clearInterval(timer);
	});

	const cycle = (r: number, c: number) => {
		if (given[r][c] || isSolved) {
			return;
		}
		const current = board[r][c];
		board[r][c] = current === null ? 0 : current === 0 ? 1 : null;
		toggleCount += 1;
	};

	const reset = () => {
		board = initialBoard.map((row) => [...row]);
		toggleCount = 0;
		elapsedSeconds = 0;
	};

	const formatTime = (total: number): string => {
		const m = Math.floor(total / 60).toString().padStart(2, '0');
		const s = (total % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	};
</script>

{#snippet resetIcon()}
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
{/snippet}

<section class="play">
	<div class="play__bar">
		<span class="stat">Time <strong>{formatTime(elapsedSeconds)}</strong></span>
		<span class="stat">Toggles <strong>{toggleCount}</strong></span>
		<Button variant="secondary" icon={resetIcon} type="button" onclick={reset}>Reset</Button>
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
						disabled={given[r][c]}
						aria-label={`Row ${r + 1}, column ${c + 1}`}
						onclick={() => cycle(r, c)}
					>
						{cell === null ? '' : cell}
					</button>
				{/each}
			{/each}
		</div>
	</div>

	{#if isSolved}
		<p class="solved-banner">Solved in {formatTime(elapsedSeconds)} with {toggleCount} toggles.</p>
	{/if}
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
		color: var(--fg);
		font-family: var(--font-mono);
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
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--fg);
		font-family: var(--font-mono);
		font-size: clamp(1.25rem, 5vw, 1.75rem);
		font-weight: 600;
		cursor: pointer;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast);
	}

	.cell:not(.given):hover {
		background: var(--surface-hover);
	}

	.cell:not(.given):focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.cell.filled:not(.given) {
		border-color: color-mix(in oklab, var(--accent) 45%, var(--border));
	}

	.cell.given {
		background: color-mix(in oklab, var(--surface) 55%, var(--fg));
		color: var(--fg);
		cursor: default;
		opacity: 1;
	}

	.board.solved .cell {
		border-color: var(--accent);
	}

	.solved-banner {
		margin-block-start: var(--space-6);
		text-align: center;
		color: var(--accent);
		font-weight: 600;
	}
</style>
