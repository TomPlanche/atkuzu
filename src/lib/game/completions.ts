import { type DailySize, puzzleNumber } from "$lib/game/daily";

export type Completion = {
  date: string;
  size: DailySize;
  puzzleNumber: number;
  durationSeconds: number;
  toggleCount: number;
  /** ISO timestamp of the actual completion, not the puzzle's own date. Compared against
   *  `date` to tell a live, same-day solve from a catch-up on a missed day (see `computeStreaks`). */
  completedAt: string;
};

/**
 * Completed on the day its puzzle was published, not caught up on later. `completedAt` is
 * missing on completions logged before this field existed; treat those as live rather than
 * silently dropping pre-existing streaks over a data-shape gap.
 */
const isLive = (completion: Completion): boolean =>
  (completion.completedAt?.slice(0, 10) ?? completion.date) === completion.date;

const STORAGE_KEY = "atkuzu:daily:completions";

export const readCompletions = (): Completion[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Completion[]) : [];
  } catch {
    return [];
  }
};

/** Write-once per (date, size): a duplicate call (a remount, an undo after solving) is a no-op. */
export const recordCompletion = (completion: Completion): void => {
  try {
    const completions = readCompletions();
    const alreadyLogged = completions.some(
      (c) => c.date === completion.date && c.size === completion.size
    );
    if (alreadyLogged) {
      return;
    }

    completions.push(completion);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completions));
  } catch {
    // localStorage unavailable (private mode, quota); this completion just won't show up
    // in the history view.
  }
};

export type StreakStats = {
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
};

/**
 * Mirrors the streak arithmetic in $lib/server/atproto/records.ts's `nextStats`, so this
 * client-only (no account needed) view agrees with the PDS-backed stats a logged-in player
 * sees: solving another size on the same day is another game but not another streak day, a
 * consecutive day continues the streak, and any other gap starts a new one. Catching up on a
 * missed day (`!isLive`) still counts toward `gamesPlayed`, but is left out of the streak
 * chain entirely: it must not bridge a gap, start one, or move `lastPuzzleNumber` at all.
 */
export const computeStreaks = (completions: Completion[]): StreakStats => {
  const sorted = completions.filter(isLive).toSorted((a, b) => a.puzzleNumber - b.puzzleNumber);

  let currentStreak = 0;
  let maxStreak = 0;
  let lastPuzzleNumber: number | undefined;

  for (const completion of sorted) {
    if (completion.puzzleNumber === lastPuzzleNumber) {
      continue;
    }

    currentStreak = lastPuzzleNumber === completion.puzzleNumber - 1 ? currentStreak + 1 : 1;
    maxStreak = Math.max(maxStreak, currentStreak);
    lastPuzzleNumber = completion.puzzleNumber;
  }

  return { currentStreak, maxStreak, gamesPlayed: completions.length };
};

export type DayGroup = {
  date: string;
  puzzleNumber: number;
  sizes: Partial<Record<DailySize, Completion>>;
};

/** Groups completions by date, most recent day first. */
export const groupByDay = (completions: Completion[]): DayGroup[] => {
  const byDate = new Map<string, DayGroup>();

  for (const completion of completions) {
    const day = byDate.get(completion.date);
    if (day) {
      day.sizes[completion.size] = completion;
    } else {
      byDate.set(completion.date, {
        date: completion.date,
        puzzleNumber: completion.puzzleNumber,
        sizes: { [completion.size]: completion }
      });
    }
  }

  return [...byDate.values()].toSorted((a, b) => b.puzzleNumber - a.puzzleNumber);
};

/**
 * Fills in every published archive date (from `/daily/index.json`) that `days` doesn't
 * already have a completion for, as an empty (all sizes unsolved) `DayGroup`, so the history
 * view can show every day that exists to catch up on, not only the ones already played.
 */
export const mergeArchiveDays = (days: DayGroup[], archiveDates: string[]): DayGroup[] => {
  const byDate = new Map(days.map((day) => [day.date, day]));

  for (const date of archiveDates) {
    if (!byDate.has(date)) {
      byDate.set(date, { date, puzzleNumber: puzzleNumber(date), sizes: {} });
    }
  }

  return [...byDate.values()].toSorted((a, b) => b.puzzleNumber - a.puzzleNumber);
};
