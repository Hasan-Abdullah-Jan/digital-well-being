/**
 * Background housekeeping that runs at start-up and whenever the app comes back
 * to the foreground. Everything here runs on the device.
 */
import { appConfig } from '@/config';
import { getContent } from '@/i18n';
import { guard } from '@/native/guard';
import { getCommunity } from '@/services/community';
import { refreshDeviceData, syncGuard } from '@/services/guardSync';
import { syncReminders } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { dateKey } from '@/utils/time';

import { checkBadges } from './badges';
import { checkUsageCelebration } from './celebrations';

/** Quotes that match the goals the user picked (falls back to all quotes). */
export function personalisedQuotes(): string[] {
  const { goals } = useSettings.getState();
  const quotes = getContent().quotes;
  const matching = quotes.filter((q) => q.tags.some((tag) => (goals as string[]).includes(tag)));
  return (matching.length >= 5 ? matching : quotes).map((q) => q.text);
}

/** Fills in app-streak days from screen-time data (Android or demo), never today. */
export function autoLogAppStreaks(): void {
  const { usage } = useHabits.getState();
  const progress = useProgress.getState();
  const today = dateKey();
  for (const streak of progress.streaks) {
    if (!streak.active || streak.target.kind !== 'app') continue;
    const target = streak.target;
    for (const day of usage) {
      if (day.date >= today || day.date < streak.createdOn) continue;
      if (useProgress.getState().streaks.find((s) => s.id === streak.id)?.log[day.date] !== undefined) continue;
      const minutes = day.apps.find((a) => a.packageName === target.packageName)?.minutes ?? 0;
      useProgress.getState().logStreak(streak.id, minutes <= target.maxMinutes, day.date);
    }
  }
}

async function loadStaffRoles(): Promise<void> {
  const settings = useSettings.getState();
  const service = getCommunity();
  if (!service) return;
  if (service.mode === 'cloud' && !settings.communityConsent?.granted) return;
  try {
    useApp.getState().setStaff(await service.getStaffRoles());
  } catch {
    useApp.getState().setStaff(null);
  }
}

export async function onForeground(): Promise<void> {
  try {
    await refreshDeviceData();
  } catch {
    // Device data is a bonus; the app works without it.
  }
  autoLogAppStreaks();
  syncGuard();
  checkUsageCelebration();
  checkBadges();
}

export async function afterStart(): Promise<void> {
  await onForeground();
  guard.setWidgetQuotes(personalisedQuotes());
  await syncReminders().catch(() => undefined);
  if (appConfig.features.peerSpace) await loadStaffRoles();
}
