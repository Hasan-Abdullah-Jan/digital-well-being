/**
 * Screen-time data for charts and insights.
 * Source priority: Android device data > self-reported check-ins > nothing.
 */
import { Platform } from 'react-native';

import { guard } from '@/native/guard';
import type { DailyUsage, ScreenCheckin } from '@/store/types';
import { addDays, dateKey, lastNDays, parseDateKey, startOfDay } from '@/utils/time';

export type UsageSource = 'device' | 'self' | 'demo' | 'none';

export type DayMinutes = { date: string; minutes: number | null };

/** Minutes per day for the given dates; null where we have no data. */
export function minutesForDays(
  dates: string[],
  usage: DailyUsage[],
  checkins: ScreenCheckin[],
): { days: DayMinutes[]; source: UsageSource } {
  const usageByDate = new Map(usage.map((u) => [u.date, u]));
  const checkinByDate = new Map(checkins.map((c) => [c.date, c]));
  let deviceDays = 0;
  let selfDays = 0;
  let demoDays = 0;
  const days = dates.map((date) => {
    const u = usageByDate.get(date);
    if (u) {
      if (u.source === 'demo') demoDays++;
      else deviceDays++;
      return { date, minutes: u.totalMinutes };
    }
    const c = checkinByDate.get(date);
    if (c) {
      selfDays++;
      return { date, minutes: c.minutes };
    }
    return { date, minutes: null };
  });
  const source: UsageSource =
    demoDays > 0 ? 'demo' : deviceDays > 0 ? 'device' : selfDays > 0 ? 'self' : 'none';
  return { days, source };
}

export function averageMinutes(days: DayMinutes[]): number | null {
  const values = days.map((d) => d.minutes).filter((m): m is number => m !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Reads the last `days` days from Android's usage API. Returns [] if unavailable. */
export async function readDeviceUsage(days = 7): Promise<DailyUsage[]> {
  if (Platform.OS !== 'android' || !guard.isAvailable() || !guard.hasUsageAccess()) return [];
  const result: DailyUsage[] = [];
  const today = startOfDay();
  for (const key of lastNDays(days)) {
    const start = parseDateKey(key);
    const end = key === dateKey(today) ? new Date() : addDays(start, 1);
    const usage = await guard.getUsageForRange(start.getTime(), end.getTime());
    if (!usage) continue;
    result.push({
      date: key,
      totalMinutes: Math.round(usage.totalMs / 60000),
      pickups: usage.pickups >= 0 ? usage.pickups : undefined,
      apps: usage.apps
        .filter((a) => a.ms >= 60_000)
        .slice(0, 12)
        .map((a) => ({
          packageName: a.packageName,
          label: a.label,
          minutes: Math.round(a.ms / 60000),
          opens: a.opens,
          category: a.category,
        })),
      source: 'device',
    });
  }
  return result;
}

/** Minutes spent in game-category apps on the given days (Android data only). */
export function gameMinutesFromUsage(usage: DailyUsage[], dates: string[]): number {
  const set = new Set(dates);
  return usage
    .filter((u) => set.has(u.date))
    .reduce((sum, u) => sum + u.apps.filter((a) => a.category === 'game').reduce((s, a) => s + a.minutes, 0), 0);
}
