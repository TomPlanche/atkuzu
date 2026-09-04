// Types and helpers for ADR 0001: dailies are pre-generated offline and
// published as immutable static JSON at /daily/<YYYY-MM-DD>.json.

export type DailySize = 6 | 8 | 12;

export const DAILY_SIZES: DailySize[] = [6, 8, 12];

export type DailyPuzzle = {
  size: DailySize;
  /** Provenance only, per the ADR. Not used by the client. A u64, so a decimal string (not a number) to keep full precision. */
  seed: string;
  puzzle: string;
  solutionSha256: string;
};

export type DailyFile = {
  version: number;
  date: string;
  generator: string;
  puzzles: DailyPuzzle[];
};

/** Today's date at the UTC day boundary, as `YYYY-MM-DD`. */
export const todayUtcDate = (): string => new Date().toISOString().slice(0, 10);

export const dailyFileUrl = (date: string): string => `/daily/${date}.json`;
