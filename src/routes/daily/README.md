# /daily

This route renders the daily Takuzu puzzles: 6x6, 8x8, and 12x12, identical for every player on a given UTC day. No backend: puzzles are pre-generated offline (`scripts/generate-daily.ts`, wrapping the vendored `takuzu-grid-factory`) and published as immutable static JSON at `/daily/<YYYY-MM-DD>.json`. `+page.ts` only fetches that file; the route holds no generator and no solution. A completed, rule-valid board is confirmed against the file's `solutionSha256`, so the answer is never sent to the client.

Board rendering and rule validation are shared with `/play` via `$lib/game/board.ts` and `$lib/components/Board.svelte`.

Board progress persists per date and size in `localStorage`. No account required to play.

When logged in, `src/routes/daily/status/+server.ts` looks up the player's own PDS for a `com.tomplanche.atkuzu.result` record for that date, one deterministic `getRecord` call per size (rkeys are `<puzzleNumber>-<size>`, no `listRecords` scan needed). A match (e.g. already solved on another device, or a past day already caught up on) marks that size as solved here too, without needing the local board to actually be filled in: the client still never holds the solution, so a puzzle synced this way stops accepting input and shows the solved banner, but the grid itself isn't rendered filled.

`/daily` always covers today (`+page.ts` loads `todayUtcDate()`); `/daily/[date]` plays or views any other published day, for catching up on one you missed. Both routes render the same `$lib/components/DailyPuzzle.svelte`. `/daily/[date]/+page.ts` 404s a malformed or future date or one with no archive file, and redirects the current date to plain `/daily`. `$lib/components/DailyHistory.svelte`'s day list fetches `/daily/index.json` on open and folds in every published date it doesn't already have a completion for (`mergeArchiveDays` in `$lib/game/completions.ts`), each linking to `/daily/<date>`, so a day never played anywhere still shows up (dimmed, all sizes unsolved) to catch up on.

Catching up on a missed day still writes a normal `com.tomplanche.atkuzu.result` record and counts toward `gamesPlayed`, but it happened out of real time, so it is deliberately excluded from streak accounting on both sides: `nextStats` (`$lib/server/atproto/records.ts`) takes an `isCatchUp` flag (`puzzleNumber(date) !== puzzleNumber(todayUtcDate())` at write time) and leaves `currentStreak`/`maxStreak`/`lastPuzzleNumber` untouched when it's set; the client's `computeStreaks` (`$lib/game/completions.ts`) mirrors this by comparing each `Completion`'s `completedAt` against its `date` and dropping any non-live entry from the streak chain (still counted in `gamesPlayed`). A catch-up must never start, extend, break, or backdate the streak.

Clicking the date in the header (`$lib/components/DailyPuzzle.svelte`) opens `$lib/components/DailyCalendar.svelte`: a month grid built on `bits-ui`'s headless `Calendar` (grid/weekday/month-navigation mechanics), fed the same `/daily/index.json` + local-completions data as the History modal, laid out by date instead of as a list. `minValue`/`maxValue` bound navigation to the archive's earliest month through the current one; `isDateDisabled` blocks any day outside the published archive (including a gap, e.g. one removed by hand) regardless of that range. A day cell is colored by how many sizes are solved (none/some/all); selecting an available day navigates to `/daily/<date>` and closes the modal.

## TODO

- [x] Schedule `scripts/generate-daily.ts` so tomorrow's archive is always published ahead of the UTC day boundary (`scripts/schedule-daily.ts`, run under pm2 via `ecosystem.config.cjs`).
- [x] Add a streaks and history view backed by `localStorage` completions (`$lib/game/completions.ts`, `$lib/components/DailyHistory.svelte`, opened from the "History" button next to the size tabs). Streak arithmetic mirrors `nextStats` in `$lib/server/atproto/records.ts`.
- [x] Add an archive index (`/daily/index.json`) for browsing past days. `scripts/generate-daily.ts` rewrites it from a directory scan (`{ dates: string[] }`, ascending) on every run, so it self-heals if a file is ever added or removed by hand. `$lib/components/DailyHistory.svelte` fetches it once per modal open and merges it with local completions (`mergeArchiveDays`), so every published day is browsable via `/daily/<date>`, including ones never played on any device.
- [x] Guard `DAILY_EPOCH_MS` (`$lib/game/daily.ts`) against drift from the actual archive: `pnpm run daily:check-epoch` fails if the earliest `static/daily/<date>.json` no longer maps to puzzle number 1. The epoch itself stays a hardcoded constant, never derived at runtime, since it feeds AT Protocol record keys already written to players' PDSes.
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
