import type { Streak } from '@/store/types';
import { addDaysToKey, dateKey } from '@/utils/time';

/**
 * Consecutive kept days ending today (if today is logged) or yesterday
 * (if today has not been logged yet). A slip today means 0 — and a fresh start.
 */
export function currentStreakLength(streak: Pick<Streak, 'log'>, today: string = dateKey()): number {
  let cursor = today;
  if (streak.log[cursor] === undefined) cursor = addDaysToKey(today, -1);
  let count = 0;
  while (streak.log[cursor] === true) {
    count += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return count;
}

/** Total kept days, ever. Slips never erase these. */
export function totalKeptDays(streak: Pick<Streak, 'log'>): number {
  return Object.values(streak.log).filter(Boolean).length;
}

export function isLoggedToday(streak: Pick<Streak, 'log'>, today: string = dateKey()): boolean {
  return streak.log[today] !== undefined;
}

/** Longest run of kept days anywhere in the log. */
export function longestRun(streak: Pick<Streak, 'log'>): number {
  const keys = Object.keys(streak.log).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    const consecutive = prev !== null && addDaysToKey(prev, 1) === key;
    if (streak.log[key]) {
      run = consecutive || run === 0 ? run + 1 : 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    prev = key;
  }
  return best;
}
