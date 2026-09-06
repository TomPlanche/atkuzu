/**
 * schedule-daily.ts: long-running process (meant to be kept alive by pm2)
 * that triggers scripts/generate-daily.ts once a day at French midnight
 * (Europe/Paris), ahead of the UTC day boundary. See the TODO in
 * src/routes/daily/README.md.
 *
 * Paris is always ahead of UTC (CET/UTC+1 or CEST/UTC+2), so at French
 * midnight the Paris calendar date already equals the UTC date about to
 * start — that's the date we generate.
 *
 * Requires ATKUZU_DAILY_SEED (read by generate-daily.ts itself via
 * dotenv/config; not needed by this process).
 *
 * Run directly (for testing): tsx scripts/schedule-daily.ts
 * Run under pm2: pm2 start ecosystem.config.cjs
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import schedule from "node-schedule";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");

const parisDate = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

const generateToday = () => {
  const date = parisDate();
  // Noon UTC keeps the timestamp safely inside `date` regardless of DST or scheduling jitter.
  const timestamp = Math.floor(Date.parse(`${date}T12:00:00Z`) / 1000);

  console.log(`[schedule-daily] generating ${date} (unix ${timestamp})`);

  try {
    execFileSync("pnpm", ["run", "daily:generate", "--", String(timestamp)], {
      cwd: REPO_ROOT,
      stdio: "inherit"
    });
  } catch (error) {
    // Never crash the scheduler over one failed run; today's grids stay
    // missing but tomorrow's job still fires.
    console.error(`[schedule-daily] generation failed for ${date}:`, error);
  }
};

schedule.scheduleJob({ rule: "0 0 * * *", tz: "Europe/Paris" }, generateToday);
console.log("[schedule-daily] scheduled: every day at 00:00 Europe/Paris");
