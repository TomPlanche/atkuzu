# /play

This route renders the Binairo/Takuzu board.
For now it uses a hardcoded sample puzzle (`$lib/game/samplePuzzle.ts`).
It tracks the toggle count and the elapsed time in the browser.
It checks for a win by comparing the filled grid to the known solution.
It has no persistence yet.

## TODO

- [x] Add live rule validation.
  - [x] Highlight violations as the player plays, not only on completion.
    - [x] Three identical symbols in a row or column turn red.
    - [x] An unbalanced row or column (more than half 0s or 1s) turns red. Only the cells holding the overflowing value turn red, not the whole line.
    - [x] A duplicate row or column turns red.
- [ ] Connect a real puzzle source instead of the single hardcoded sample.
  - [ ] Pick the puzzle size and the difficulty tiers to generate.
  - [ ] Generate a dataset of puzzles with `takuzu-grid-factory`.
  - [ ] Store the dataset in a format the app can read, such as a JSON file or an API route.
  - [ ] Compute the puzzle number from the date, with the same deterministic scheme the result record will use.
  - [ ] Load the puzzle for the current day in the `/play` route.
- [ ] Write the result to the player's PDS on completion.
  - [ ] Call `createRecord` for `com.tomplanche.atkuzu.result` when the player solves the puzzle.
  - [ ] Skip the write when the player is not logged in.
  - [ ] Use the puzzle number in the record key, so each puzzle can be recorded once.
  - [ ] Handle a failed write (no network, no scope) without blocking the win screen.
- [ ] Update `com.tomplanche.atkuzu.stats` after each completed attempt.
  - [ ] Read the player's current stats record, or start from zero if none exists.
  - [ ] Compute the next `gamesPlayed`, `gamesWon`, `currentStreak`, and `maxStreak` values.
  - [ ] Detect a broken streak from the gap between `lastPuzzleNumber` and the current puzzle.
  - [ ] Write the updated stats record after the result record.
- [ ] Add keyboard support.
  - [ ] Move focus between cells with the arrow keys.
  - [ ] Toggle the focused cell with the spacebar.
  - [ ] Submit the puzzle for validation with enter.
- [ ] Add theme support.
  - [ ] Let the player pick a symbol set: 0/1, sun/moon, or colors.
  - [ ] Store the choice as a user preference on the PDS.
  - [ ] Read the preference on load and render the board with it.
