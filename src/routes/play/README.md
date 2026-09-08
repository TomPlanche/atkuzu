# /play

This route renders a free-roam, random Takuzu board: not the daily, which is its own route (see `/daily`).

Every puzzle is generated client-side by `takuzu-grid-factory` compiled to wasm (`$lib/game/generator.ts`, `pnpm run wasm:build`), for a picked size (`$lib/game/board.ts`'s `BOARD_SIZES`, shared with `/daily`) and difficulty (`$lib/game/difficulty.ts`), from a fresh `crypto.getRandomValues` seed drawn per attempt — no date or puzzle-number scheme, unlike `/daily`, which stays on the native CLI path (`scripts/generate-daily.ts`) and is untouched by any of this. It tracks the toggle count and the elapsed time in the browser. It checks for a win by comparing the filled grid to the known solution (held client-side the whole time: unlike `/daily`, there's no server round-trip to keep it hidden). It has no persistence yet.

Board rendering and rule validation are shared with `/daily` via `$lib/game/board.ts` and `$lib/components/Board.svelte`.

**wasm and native threading.** `takuzu.rs`'s uniqueness search (the expensive part of digging a puzzle) parallelizes via `rayon::join` natively, which needs real OS threads — unavailable to `wasm32-unknown-unknown` without `SharedArrayBuffer` + Web Workers + COOP/COEP headers. Rather than take that on, `rayon` (and `clap`, CLI-only) are excluded from the wasm build entirely (`Cargo.toml`'s `[target.'cfg(...)'.dependencies]`), and the one `rayon::join` call site falls back to a plain sequential `join` helper on `wasm32` (`takuzu.rs`). Measured in-browser: 12x12 (the largest size `/play` offers) generates in ~250ms single-threaded, so this was never worth the complexity — confirm this still holds if `/play` ever offers larger sizes. `main.rs` (native CLI, used offline by `scripts/generate-daily.ts`) is unaffected and keeps the parallel path.

**Difficulty tiers.** The wasm `generate_puzzle` call always returns the _hardest_ puzzle for its seed (`dig` is minimal by inclusion — no clue removable without breaking uniqueness). Easy and Medium are a client-side post-process on top of that (`$lib/game/difficulty.ts`'s `applyDifficulty`): reveal extra cells from the solution, in a random order, up to a target clue fraction (~65% / ~50%; Hard reveals nothing extra). This needs no re-validation against the Rust search — revealing more cells can only narrow the solution set, never break its uniqueness.

## TODO

- [x] Add live rule validation.
  - [x] Highlight violations as the player plays, not only on completion.
    - [x] Three identical symbols in a row or column turn red.
    - [x] An unbalanced row or column (more than half 0s or 1s) turns red. Only the cells holding the overflowing value turn red, not the whole line.
    - [x] A duplicate row or column turns red.
- [x] Connect a real puzzle source instead of the single hardcoded sample.
  - [x] Compile `takuzu-grid-factory` to `wasm32-unknown-unknown` and call it from the client.
  - [x] Pick the puzzle size and the difficulty tiers to generate.
  - [x] Draw a fresh random seed per attempt. No date or puzzle-number scheme here; that belongs to `/daily`.
- [x] Add keyboard support (shared by `/daily` through `Board.svelte`).
  - [x] Move focus between cells with the arrow keys.
  - [x] Toggle the focused cell with the spacebar.
  - [x] Submit the puzzle for validation with enter.
- [ ] Add theme support (shared by `/daily` through `Board.svelte`).
  - [ ] Let the player pick a symbol set: 0/1, sun/moon, or colors.
  - [ ] Store the choice as a user preference on the PDS.
  - [ ] Read the preference on load and render the board with it.
