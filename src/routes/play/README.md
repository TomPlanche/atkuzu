# /play

This route renders a free-roam, random Takuzu board: not the daily, which is its own route (see `/daily`).

For now it uses a hardcoded sample puzzle (`$lib/game/samplePuzzle.ts`). It tracks the toggle count and the elapsed time in the browser. It checks for a win by comparing the filled grid to the known solution. It has no persistence yet.

Board rendering and rule validation are shared with `/daily` via `$lib/game/board.ts` and `$lib/components/Board.svelte`.

## TODO

- [x] Add live rule validation.
  - [x] Highlight violations as the player plays, not only on completion.
    - [x] Three identical symbols in a row or column turn red.
    - [x] An unbalanced row or column (more than half 0s or 1s) turns red. Only the cells holding the overflowing value turn red, not the whole line.
    - [x] A duplicate row or column turns red.
- [ ] Connect a real puzzle source instead of the single hardcoded sample.
  - [ ] Compile `takuzu-grid-factory` to `wasm32-unknown-unknown` and call it from the client.
  - [ ] Pick the puzzle size and the difficulty tiers to generate.
  - [ ] Draw a fresh random seed per attempt. No date or puzzle-number scheme here; that belongs to `/daily`.
- [x] Add keyboard support (shared by `/daily` through `Board.svelte`).
  - [x] Move focus between cells with the arrow keys.
  - [x] Toggle the focused cell with the spacebar.
  - [x] Submit the puzzle for validation with enter.
- [ ] Add theme support (shared by `/daily` through `Board.svelte`).
  - [ ] Let the player pick a symbol set: 0/1, sun/moon, or colors.
  - [ ] Store the choice as a user preference on the PDS.
  - [ ] Read the preference on load and render the board with it.
