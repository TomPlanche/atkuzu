// A single 6x6 puzzle, captured from `cargo run --release` in takuzu-grid-factory. /play no
// longer uses this (it generates real puzzles via $lib/game/generator.ts, wasm-backed); this
// is now only the inert homepage decoration in $lib/components/GridPreview.svelte, which
// needs a fixed board to render, not a solution to check against.

export const SIZE = 6;

export const PUZZLE = [".1...0", "11.1..", "...0..", ".1...1", "...0..", "......"];
