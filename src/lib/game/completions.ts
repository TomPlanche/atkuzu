import { type DailySize } from "$lib/game/daily";

export type Completion = {
  date: string;
  size: DailySize;
  puzzleNumber: number;
  durationSeconds: number;
  toggleCount: number;
};

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
 * consecutive day continues the streak, and any other gap starts a new one.
 */
export const computeStreaks = (completions: Completion[]): StreakStats => {
  const sorted = completions.toSorted((a, b) => a.puzzleNumber - b.puzzleNumber);

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

  return { currentStreak, maxStreak, gamesPlayed: sorted.length };
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
