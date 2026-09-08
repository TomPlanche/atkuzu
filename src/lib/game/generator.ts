// Client-side puzzle generation for /play, backed by the takuzu-grid-factory wasm build (see
// takuzu-grid-factory/src/wasm.rs, and `pnpm run wasm:build`). /daily never calls this: it
// stays on the native CLI path (scripts/generate-daily.ts), generated offline ahead of time.

import { type BoardSize, type Cell, chunkRows, parseGrid } from "$lib/game/board";

export type GeneratedPuzzle = {
  puzzle: Cell[][];
  given: boolean[][];
  solution: Cell[][];
};

let wasmReady: Promise<typeof import("$lib/wasm/pkg/takuzu_grid_factory.js")> | null = null;

const loadWasm = () => {
  if (!wasmReady) {
    wasmReady = import("$lib/wasm/pkg/takuzu_grid_factory.js").then(async (mod) => {
      await mod.default();

      return mod;
    });
  }

  return wasmReady;
};

/** A fresh random u64 seed, drawn from the browser's CSPRNG. No date/puzzle-number scheme
 *  here on purpose (unlike /daily's `puzzleNumber`-derived seeds): every attempt is unrelated
 *  to the last. */
export const randomSeed = (): bigint => crypto.getRandomValues(new BigUint64Array(1))[0];

export const generatePuzzle = async (size: BoardSize, seed: bigint): Promise<GeneratedPuzzle> => {
  const { generate_puzzle } = await loadWasm();
  const { puzzle: flatPuzzle, solution: flatSolution } = generate_puzzle(size, seed);

  const puzzle = parseGrid(chunkRows(flatPuzzle, size));
  const solution = parseGrid(chunkRows(flatSolution, size));
  const given = puzzle.map((row) => row.map((c) => c !== null));

  return { puzzle, given, solution };
};
