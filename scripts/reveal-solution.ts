/**
 * reveal-solution.ts: given ATKUZU_DAILY_SEED, reproduces a daily's solution for a
 * (date, size) and shows whether it matches the published solutionSha256.
 *
 * `solutionSha256` is a SHA-256 hash, not a cipher: it cannot be "decrypted" back into a
 * grid. What this script does instead is the practical equivalent: the puzzle's seed is
 * deterministic (see generate-daily.ts's deriveSeed), so re-running the same generator with
 * the same master seed reproduces the exact same solution byte-for-byte, and hashing that
 * gives you `solutionSha256` back. Same trick as generate-daily.ts, run for one puzzle
 * instead of a whole day's archive, without writing anything.
 *
 * Requires:
 *   ATKUZU_DAILY_SEED   master seed for the daily archive (any string)
 *
 * Usage:
 *   pnpm run daily:reveal -- <YYYY-MM-DD> <6|8|12>
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chunkRows } from "../src/lib/game/board";
import { DAILY_SIZES, type DailyFile, type DailySize } from "../src/lib/game/daily";

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATOR_DIR = resolve(HERE, "../takuzu-grid-factory");
const GENERATOR_BIN = resolve(GENERATOR_DIR, "target/release/takuzu-grid-factory");
const ARCHIVE_DIR = resolve(HERE, "../static/daily");

const masterSeed = process.env.ATKUZU_DAILY_SEED;
if (!masterSeed) {
  console.error("Set ATKUZU_DAILY_SEED (master seed for the daily archive) to reveal.");
  process.exit(1);
}

// pnpm doesn't always strip the `--` separator before forwarding args (unlike npm), so guard
// against it showing up as a literal argument here.
const [dateArg, sizeArg] = process.argv.slice(2).filter((arg) => arg !== "--");
const date = dateArg;
const size = Number(sizeArg) as DailySize;

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !DAILY_SIZES.includes(size)) {
  console.error(`Usage: pnpm run daily:reveal -- <YYYY-MM-DD> <${DAILY_SIZES.join("|")}>`);
  process.exit(1);
}

if (!existsSync(GENERATOR_BIN)) {
  console.log("building takuzu-grid-factory (release)...");
  execFileSync("cargo", ["build", "--release"], { cwd: GENERATOR_DIR, stdio: "inherit" });
}

/** Identical to generate-daily.ts's deriveSeed: must match to reproduce the same solution. */
const deriveSeed = (d: string, s: DailySize): bigint => {
  const digest = createHash("sha256").update(`${masterSeed}:${d}:${s}`).digest("hex");

  return BigInt(`0x${digest.slice(0, 16)}`);
};

const seed = deriveSeed(date, size);

const output = execFileSync(GENERATOR_BIN, ["--size", String(size), "--seed", seed.toString()], {
  encoding: "utf8"
});
const lines = output.split("\n");

const readBlock = (heading: string): string => {
  const start = lines.indexOf(heading) + 1;
  if (start === 0) {
    throw new Error(`generator output has no "${heading}" block:\n${output}`);
  }

  return lines.slice(start, start + size).join("");
};

const solution = readBlock("solution");
const solutionSha256 = createHash("sha256").update(solution).digest("hex");

console.log(`date:     ${date}`);
console.log(`size:     ${size}x${size}`);
console.log(`seed:     ${seed}`);
console.log(`sha256:   ${solutionSha256}`);
console.log("solution:");
for (const row of chunkRows(solution, size)) {
  console.log(`  ${row}`);
}

const archivePath = resolve(ARCHIVE_DIR, `${date}.json`);
if (!existsSync(archivePath)) {
  console.log(`\n(no local ${archivePath} to compare against)`);
  process.exit(0);
}

const archive: DailyFile = JSON.parse(readFileSync(archivePath, "utf8"));
const published = archive.puzzles.find((p) => p.size === size);

if (!published) {
  console.log(`\n(no ${size}x${size} entry in ${archivePath})`);
} else if (published.solutionSha256 === solutionSha256) {
  console.log(`\n✓ matches solutionSha256 published in ${archivePath}`);
} else {
  console.log(`\n✗ does NOT match ${archivePath}'s solutionSha256 (${published.solutionSha256})`);
  console.log("  ATKUZU_DAILY_SEED is probably not the one this archive was generated with.");
}
