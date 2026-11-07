/** Derived data used by several screens. Pure functions + small hooks. */
import { useMemo } from 'react';

import { useHabits } from '@/store/habits';
import type { PhoneFreeWindow } from '@/store/types';
import { addDays, dateKey, hhmmToMinutes, isWithinWindow, lastNDays, minutesOfDay } from '@/utils/time';

import { minutesForDays, type DayMinutes, type UsageSource } from './usage';

export function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = date.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function useLastDays(n = 7): { days: DayMinutes[]; source: UsageSource } {
  const usage = useHabits((s) => s.usage);
  const checkins = useHabits((s) => s.screenCheckins);
  return useMemo(() => minutesForDays(lastNDays(n), usage, checkins), [usage, checkins, n]);
}

export type WindowStatus = { window: PhoneFreeWindow; active: boolean; startsAt: Date };

/** The phone-free window that is active now, or the next one to start this week. */
export function nextWindow(windows: PhoneFreeWindow[], now = new Date()): WindowStatus | null {
  const enabled = windows.filter((w) => w.enabled && w.days.length > 0);
  const nowMin = minutesOfDay(now);
  let best: WindowStatus | null = null;
  for (const w of enabled) {
    const start = hhmmToMinutes(w.start);
    const end = hhmmToMinutes(w.end);
    // Active now? (A window that started yesterday evening and crosses midnight counts too.)
    const today = now.getDay();
    const yesterday = (today + 6) % 7;
    const activeToday = w.days.includes(today) && isWithinWindow(nowMin, start, end) && (start < end || nowMin >= start);
    const activeFromYesterday = start > end && w.days.includes(yesterday) && nowMin < end;
    if (activeToday || activeFromYesterday) return { window: w, active: true, startsAt: now };
    for (let offset = 0; offset < 8; offset++) {
      const day = addDays(now, offset);
      if (!w.days.includes(day.getDay())) continue;
      if (offset === 0 && start <= nowMin) continue;
      const startsAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(start / 60), start % 60);
      if (!best || startsAt < best.startsAt) best = { window: w, active: false, startsAt };
      break;
    }
  }
  return best;
}

export function todayKey(): string {
  return dateKey();
}
