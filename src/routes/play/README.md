# /play

This route renders the Binairo/Takuzu board.
It uses, for now, a hardcoded sample puzzle (`$lib/game/samplePuzzle.ts`).
It tracks the toggle count and the elapsed time in the browser.
It checks for a win by comparing the filled grid to the known solution.
It has no rule engine and no persistence yet.

## TODO

- [ ] Add live rule validation. Highlight violations as the player plays, not only on completion. Three identical symbols in a row or column turn red. An unbalanced row or column (more than half 0s or 1s) turns red. A duplicate row or column turns red.
- [ ] Connect a real puzzle source instead of the single hardcoded sample. Use `takuzu-grid-factory`, or a generated dataset, with a deterministic puzzle-of-the-day scheme.
- [ ] Write the result to the player's PDS on completion. Use `com.tomplanche.atkuzu.result`: puzzleNumber, solved, durationSeconds, toggleCount.
- [ ] Update `com.tomplanche.atkuzu.stats` (streak, gamesPlayed, gamesWon) after each completed attempt.
- [ ] Add keyboard support. Use arrow keys to move focus between cells. Use the spacebar to toggle the focused cell. Use enter to submit the puzzle for validation.
