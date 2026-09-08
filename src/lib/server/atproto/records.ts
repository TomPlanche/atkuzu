// Writes com.tomplanche.atkuzu.result / .stats records to the player's own PDS on daily
// completion. See src/routes/daily/README.md and the lexicons under lexicons/com/tomplanche/atkuzu/.

import type { Agent } from "@atproto/api";
import { puzzleNumber, todayParisDate } from "$lib/game/daily";
import { logger } from "$lib/server/logger";
import type { BoardSize } from "$lib/game/board";

export const RESULT_COLLECTION = "com.tomplanche.atkuzu.result";
const STATS_COLLECTION = "com.tomplanche.atkuzu.stats";
const STATS_RKEY = "self";

type StatsValue = {
  currentStreak?: number;
  maxStreak?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  lastPuzzleNumber?: number;
};

export const isRecordNotFound = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { error?: string }).error === "RecordNotFound";

const isAlreadyExists = (err: unknown): boolean =>
  err instanceof Error && /already exists/i.test(err.message);

type WriteResultStatus = "created" | "already-recorded";

const writeResult = async (
  agent: Agent,
  did: string,
  rkey: string,
  record: Record<string, unknown>
): Promise<WriteResultStatus> => {
  try {
    await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: RESULT_COLLECTION,
      rkey,
      // Not every PDS resolves third-party lexicons over the network for validation yet
      // (confirmed failing here with "Unknown lexicon type"), so this stays unvalidated,
      // same caveat as the README's lexicons section.
      validate: false,
      record
    });
    return "created";
  } catch (err) {
    if (!isAlreadyExists(err)) {
      throw err;
    }

    // Write-once by convention: a duplicate submit (e.g. a page reload after solving)
    // is not an error, just nothing left to do.
    logger.info(`result ${rkey} already exists for ${did}, skipping`);
    return "already-recorded";
  }
};

/**
 * `num` is the puzzle just completed; `isCatchUp` means it's not today's puzzle, i.e. the
 * player went back and solved a day they missed. A catch-up still counts as a game played,
 * but it happened out of real time, so it must not start, extend, or break the streak of
 * live, same-day plays, nor move `lastPuzzleNumber` (which anchors that streak) backward.
 */
const nextStats = (
  existing: StatsValue | null,
  num: number,
  isCatchUp: boolean
): Required<StatsValue> => {
  const gamesPlayed = (existing?.gamesPlayed ?? 0) + 1;
  const gamesWon = (existing?.gamesWon ?? 0) + 1;

  if (isCatchUp) {
    return {
      currentStreak: existing?.currentStreak ?? 0,
      maxStreak: existing?.maxStreak ?? 0,
      gamesPlayed,
      gamesWon,
      lastPuzzleNumber: existing?.lastPuzzleNumber ?? 0
    };
  }

  const lastPuzzleNumber = existing?.lastPuzzleNumber ?? 0;

  // Same day, another size solved: another game, but not another streak day.
  if (lastPuzzleNumber === num) {
    return {
      currentStreak: existing?.currentStreak ?? 1,
      maxStreak: existing?.maxStreak ?? 1,
      gamesPlayed,
      gamesWon,
      lastPuzzleNumber: num
    };
  }

  // Consecutive day continues the streak; any other gap (or no prior live day) starts a new one.
  const currentStreak = lastPuzzleNumber === num - 1 ? (existing?.currentStreak ?? 0) + 1 : 1;

  return {
    currentStreak,
    maxStreak: Math.max(existing?.maxStreak ?? 0, currentStreak),
    gamesPlayed,
    gamesWon,
    lastPuzzleNumber: num
  };
};

const writeStats = async (
  agent: Agent,
  did: string,
  num: number,
  isCatchUp: boolean,
  isTest: boolean,
  now: string
) => {
  let existing: StatsValue | null = null;
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: STATS_COLLECTION,
      rkey: STATS_RKEY
    });

    existing = res.data.value as StatsValue;
  } catch (err) {
    if (!isRecordNotFound(err)) {
      throw err;
    }
  }

  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: STATS_COLLECTION,
    rkey: STATS_RKEY,
    validate: false,
    record: {
      $type: STATS_COLLECTION,
      ...nextStats(existing, num, isCatchUp),
      updatedAt: now,
      ...(isTest ? { test: true } : {})
    }
  });
};

export type DailyCompletion = {
  date: string;
  size: BoardSize;
  durationSeconds: number;
  toggleCount: number;
  /** Marks the write as test data (a `test-` rkey and a `test: true` field) instead of a real completion. */
  isTest: boolean;
};

export type DailyCompletionResult = { status: WriteResultStatus; rkey: string };

/**
 * Writes the write-once result record for a completed daily, then folds it into the
 * account's singleton stats record. Both calls are idempotent against a duplicate submit.
 * Returns the result record's rkey, plus whether it was newly created or was already
 * there, so callers can tell "just saved" apart from "you already recorded this one"
 * without guessing, and can link straight to the record.
 */
export const recordDailyCompletion = async (
  agent: Agent,
  did: string,
  { date, size, durationSeconds, toggleCount, isTest }: DailyCompletion
): Promise<DailyCompletionResult> => {
  const num = puzzleNumber(date);
  const rkey = `${isTest ? "test-" : ""}${num}-${size}`;
  const now = new Date().toISOString();
  // Solving anything but today's own puzzle is a catch-up on a missed day: see `nextStats`.
  const isCatchUp = num !== puzzleNumber(todayParisDate());

  const status = await writeResult(agent, did, rkey, {
    $type: RESULT_COLLECTION,
    puzzleNumber: num,
    puzzleDate: `${date}T00:00:00.000Z`,
    size,
    solved: true,
    durationSeconds,
    toggleCount,
    createdAt: now,
    ...(isTest ? { test: true } : {})
  });

  await writeStats(agent, did, num, isCatchUp, isTest, now);

  return { status, rkey };
};
