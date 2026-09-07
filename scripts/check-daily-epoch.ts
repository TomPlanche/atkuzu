/**
 * check-daily-epoch.ts: guards `DAILY_EPOCH_MS` in `src/lib/game/daily.ts`
 * against drift from the actual archive on disk.
 *
 * `puzzleNumber` feeds AT Protocol record keys (`<puzzleNumber>-<size>`)
 * that are written once and kept forever in players' PDSes, so the epoch
 * must stay a fixed constant rather than something derived at runtime from
 * `static/daily`. This script is the one-off check that the constant still
 * matches the earliest published archive; it does not compute the epoch on
 * its own, but can rewrite the constant when asked.
 *
 * Usage: pnpm run daily:check-epoch [-- --fix]
 *   --fix   apply the fix without prompting (for non-interactive use)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { puzzleNumber } from "../src/lib/game/daily";

const HERE = dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = resolve(HERE, "../static/daily");
const DAILY_TS = resolve(HERE, "../src/lib/game/daily.ts");

const dateFilePattern = /^(\d{4}-\d{2}-\d{2})\.json$/;

const dates = readdirSync(DAILY_DIR)
  .map((name) => name.match(dateFilePattern)?.[1])
  .filter((date): date is string => date !== undefined)
  .toSorted();

if (dates.length === 0) {
  console.error(`✗ no <YYYY-MM-DD>.json archives found in ${DAILY_DIR}`);
  process.exit(1);
}

const earliest = dates[0];
const num = puzzleNumber(earliest);

if (num === 1) {
  console.log(`✓ DAILY_EPOCH_MS matches the earliest archive (${earliest} = day 1)`);
  process.exit(0);
}

console.error(
  `✗ DAILY_EPOCH_MS is out of sync: earliest archive is ${earliest}, ` +
    `but puzzleNumber("${earliest}") = ${num} (expected 1).`
);

const epochLinePattern = /const DAILY_EPOCH_MS = Date\.parse\("[^"]+"\);/;

const applyFix = (): void => {
  const source = readFileSync(DAILY_TS, "utf8");

  if (!epochLinePattern.test(source)) {
    console.error(`✗ could not find the DAILY_EPOCH_MS declaration in ${DAILY_TS}`);
    process.exit(1);
  }

  const updated = source.replace(
    epochLinePattern,
    `const DAILY_EPOCH_MS = Date.parse("${earliest}T00:00:00Z");`
  );

  writeFileSync(DAILY_TS, updated);
  console.log(`✓ updated DAILY_EPOCH_MS to ${earliest}T00:00:00Z in ${DAILY_TS}`);
};

if (process.argv.includes("--fix")) {
  applyFix();
  process.exit(0);
}

if (!process.stdin.isTTY) {
  console.error(`Run with --fix to update it automatically, or fix ${DAILY_TS} by hand.`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(`Fix the date to ${earliest}? (y/N) `);
rl.close();

if (/^y(es)?$/i.test(answer.trim())) {
  applyFix();
  process.exit(0);
}

console.error("Left unchanged.");
process.exit(1);
