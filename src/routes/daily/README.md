# /daily

This route renders the daily Takuzu puzzles: 6x6, 8x8, and 12x12, identical for every player on a given UTC day. No backend: puzzles are pre-generated offline (`scripts/generate-daily.ts`, wrapping the vendored `takuzu-grid-factory`) and published as immutable static JSON at `/daily/<YYYY-MM-DD>.json`. `+page.ts` only fetches that file; the route holds no generator and no solution. A completed, rule-valid board is confirmed against the file's `solutionSha256`, so the answer is never sent to the client.

Board rendering and rule validation are shared with `/play` via `$lib/game/board.ts` and `$lib/components/Board.svelte`.

Board progress persists per date and size in `localStorage`. No account required to play.

## TODO

- [ ] Schedule `scripts/generate-daily.ts` so tomorrow's archive is always published ahead of the UTC day boundary.
- [ ] Add a streaks and history view backed by `localStorage` completions (design not started).
- [ ] Add an archive index (`/daily/index.json`) for browsing past days.
- [x] Write the result to the player's PDS on completion (`src/routes/daily/complete/+server.ts`, `src/lib/server/atproto/records.ts`).
  - [x] Call `createRecord` for `com.tomplanche.atkuzu.result` when the player solves a daily, keyed by `<puzzleNumber>-<size>` so each size is recorded once.
  - [x] Skip the write when the player is not logged in.
  - [x] Handle a failed write (no network, no scope) without blocking the solved banner.
  - [x] Local (`DEV`) writes use a `test-` rkey prefix and a `test: true` field so they never collide with or count as real completions.
- [x] Update `com.tomplanche.atkuzu.stats` after each completed daily.
  - [x] Read the player's current stats record, or start from zero if none exists.
  - [x] Compute the next `gamesPlayed`, `gamesWon`, `currentStreak`, and `maxStreak` values.
  - [x] Detect a broken streak from the gap between the last solved puzzle number and today's.
  - [x] Write the updated stats record after the result record.
- Per-cell "this one is wrong" hints are not possible while the client holds no solution. Out of scope unless that design changes.
