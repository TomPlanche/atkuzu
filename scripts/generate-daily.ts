/**
 * generate-daily.ts: pre-generates the three daily Takuzu puzzles (6x6, 8x8,
 * 12x12) for one or more days and writes them as static JSON, per ADR 0001
 * ("Daily puzzles as static JSON, no backend").
 *
 * Each puzzle's seed is derived from a master secret plus its UTC date and
 * size (sha256, first 8 bytes as a u64), so the same master seed always
 * reproduces the same archive while the master itself never appears in the
 * published files. `takuzu-grid-factory` (vendored at ../takuzu-grid-factory)
 * does the actual grid search.
 *
 * Requires:
 *   ATKUZU_DAILY_SEED   master seed for the daily archive (any string)
 *
 * Usage:
 *   npm run daily:generate -- <unix-seconds> [<unix-seconds> ...] [--force]
 *
 * Each positional argument is a Unix timestamp (seconds) inside the UTC day
 * to generate; one output file is written per distinct day. Dailies are
 * immutable once published, so an existing static/daily/<date>.json is left
 * alone unless --force is given.
 *
 * Every run also rewrites static/daily/index.json (`{ dates: string[] }`,
 * ascending) from a directory scan, so the archive index for `/daily`'s
 * history browsing self-heals even if a file is ever added or removed by
 * hand instead of through this script.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { BOARD_SIZES, type BoardSize } from "../src/lib/game/board";

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATOR_DIR = resolve(HERE, "../takuzu-grid-factory");
const GENERATOR_BIN = resolve(GENERATOR_DIR, "target/release/takuzu-grid-factory");
const GENERATOR_VERSION = "0.3.0"; // takuzu-grid-factory/Cargo.toml
const OUT_DIR = resolve(HERE, "../static/daily");

const masterSeed = process.env.ATKUZU_DAILY_SEED;
if (!masterSeed) {
  console.error("Set ATKUZU_DAILY_SEED (master seed for the daily archive) to generate.");
  process.exit(1);
}

const force = process.argv.includes("--force");
const timestamps = process.argv.slice(2).filter((arg) => arg !== "--force");

if (timestamps.length === 0) {
  console.error("Usage: npm run daily:generate -- <unix-seconds> [<unix-seconds> ...] [--force]");
  process.exit(1);
}

const toUtcDate = (unixSeconds: number): string =>
  new Date(unixSeconds * 1000).toISOString().slice(0, 10);

/** Deterministic per-(date, size) u64 seed. The master seed never appears in the published files. */
const deriveSeed = (date: string, size: BoardSize): bigint => {
  const digest = createHash("sha256").update(`${masterSeed}:${date}:${size}`).digest("hex");

  return BigInt(`0x${digest.slice(0, 16)}`);
};

type Generated = { puzzle: string; solution: string };

/** Runs the Rust generator for one (size, seed) and parses its plain-text report. */
const runGenerator = (size: BoardSize, seed: bigint): Generated => {
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

  return { puzzle: readBlock("puzzle"), solution: readBlock("solution") };
};

if (!existsSync(GENERATOR_BIN)) {
  console.log("building takuzu-grid-factory (release)...");
  execFileSync("cargo", ["build", "--release"], { cwd: GENERATOR_DIR, stdio: "inherit" });
}

mkdirSync(OUT_DIR, { recursive: true });

const dates = [
  ...new Set(
    timestamps.map((raw) => {
      const unixSeconds = Number(raw);
      if (!Number.isFinite(unixSeconds)) {
        console.error(`"${raw}" is not a Unix timestamp in seconds`);
        process.exit(1);
      }

      return toUtcDate(unixSeconds);
    })
  )
];

for (const date of dates) {
  const outPath = resolve(OUT_DIR, `${date}.json`);

  if (existsSync(outPath) && !force) {
    console.error(
      `${outPath} already exists. Dailies are immutable once published; pass --force to overwrite.`
    );
    process.exit(1);
  }

  const puzzles = BOARD_SIZES.map((size) => {
    const seed = deriveSeed(date, size);
    const { puzzle, solution } = runGenerator(size, seed);

    return {
      size,
      seed: seed.toString(),
      puzzle,
      solutionSha256: createHash("sha256").update(solution).digest("hex")
    };
  });

  const file = {
    version: 1,
    date,
    generator: `takuzu-grid-factory ${GENERATOR_VERSION}`,
    puzzles
  };

  writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`wrote ${outPath}`);
}

// Rebuild the archive index from what's actually on disk, not just the dates generated this
// run, so it self-heals if a file was ever added or removed by hand.
const dateFilePattern = /^(\d{4}-\d{2}-\d{2})\.json$/;
const publishedDates = readdirSync(OUT_DIR)
  .map((name) => name.match(dateFilePattern)?.[1])
  .filter((d): d is string => d !== undefined)
  .toSorted();

const indexPath = resolve(OUT_DIR, "index.json");
writeFileSync(indexPath, `${JSON.stringify({ dates: publishedDates }, null, 2)}\n`);
console.log(`wrote ${indexPath} (${publishedDates.length} day(s))`);
