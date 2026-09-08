// Difficulty tiers for /play. The wasm `dig` result (`$lib/game/generator.ts`) is already the
// hardest possible puzzle: minimal by inclusion, no clue removable without breaking solution
// uniqueness (see takuzu-grid-factory/src/takuzu.rs's `dig`). Easier tiers reveal extra cells
// back from the solution on top of that minimal puzzle. Revealing more cells can only ever
// keep the solution unique, never break it, so this needs no re-validation against the Rust
// search — it's a plain client-side post-process.

import type { Cell } from "$lib/game/board";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** Target fraction of cells revealed. Hard leaves the minimal dig untouched (0 extra reveals). */
const REVEAL_FRACTION: Record<Difficulty, number> = {
  easy: 0.65,
  medium: 0.5,
  hard: 0
};

/** Fisher-Yates. Not seeded: this is a display-only reveal order, not part of the puzzle's
 *  own reproducible generation (that's the wasm seed's job). */
const shuffle = <T>(items: T[]): void => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
};

/**
 * Applies `difficulty` on top of a minimal (hardest) puzzle, revealing extra cells from
 * `solution` in a random order until the tier's target clue count is reached. Leaves
 * `minimal` and `solution` untouched, returns a new grid.
 */
export const applyDifficulty = (
  minimal: Cell[][],
  solution: Cell[][],
  difficulty: Difficulty
): Cell[][] => {
  const size = minimal.length;
  const targetClues = Math.round(size * size * REVEAL_FRACTION[difficulty]);

  const hidden: [number, number][] = [];
  let currentClues = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (minimal[r][c] === null) {
        hidden.push([r, c]);
      } else {
        currentClues += 1;
      }
    }
  }

  const toReveal = targetClues - currentClues;
  const result = minimal.map((row) => [...row]);

  if (toReveal <= 0) {
    return result;
  }

  shuffle(hidden);

  for (const [r, c] of hidden.slice(0, toReveal)) {
    result[r][c] = solution[r][c];
  }

  return result;
};
