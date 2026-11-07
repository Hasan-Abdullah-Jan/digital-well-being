/**
 * Keeps the Android guard service in sync with what the user set up in the app:
 * app limits, "pause and think" apps, phone-free windows, bedtime and focus sessions.
 */
import { readDeviceUsage } from '@/features/usage';
import { getContent, t } from '@/i18n';
import { guard, type GuardConfig } from '@/native/guard';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { hhmmToMinutes } from '@/utils/time';

export function buildGuardConfig(): GuardConfig {
  const habits = useHabits.getState();
  const settings = useSettings.getState();
  const content = getContent();
  const limits = habits.limits
    .filter((l) => l.enabled)
    .map((l) => ({ pkg: l.packageName, label: l.label, minutes: l.minutesPerDay, pauseOnOpen: l.pauseOnOpen }));
  const bedStart = hhmmToMinutes(settings.bedtime);
  const bedEnd = hhmmToMinutes(settings.wakeTime);
  return {
    limits,
    watched: settings.watchedApps,
    frictionMinutes: settings.frictionMinutes,
    windows: habits.windows
      .filter((w) => w.enabled && w.lockApps)
      .map((w) => ({ label: w.label, days: w.days, start: hhmmToMinutes(w.start), end: hhmmToMinutes(w.end) })),
    bedtime: {
      enabled: habits.bedtime.enabled && habits.bedtime.lockApps,
      start: bedStart,
      end: bedEnd,
      grayscale: habits.bedtime.enabled && habits.bedtime.grayscale,
    },
    focusUntil: habits.activeFocus?.endsAt ?? 0,
    strings: {
      serviceTitle: t('guard.serviceTitle'),
      serviceBody: t('guard.serviceBody'),
      channelName: t('guard.channelName'),
      nudgeChannelName: t('guard.nudgeChannelName'),
      pauseTitle: t('guard.pauseTitle'),
      pauseBody: t('guard.pauseBody'),
      limitTitle: t('guard.limitTitle'),
      limitBody: t('guard.limitBody'),
      windowTitle: t('guard.windowTitle'),
      windowBody: t('guard.windowBody'),
      bedtimeTitle: t('guard.bedtimeTitle'),
      bedtimeBody: t('guard.bedtimeBody'),
      focusTitle: t('guard.focusTitle'),
      focusBody: t('guard.focusBody'),
      todayUsage: t('guard.todayUsage'),
      tryInstead: t('guard.tryInstead'),
      closeApp: t('guard.closeApp'),
      openAnyway: t('guard.openAnyway'),
      openAnywayWait: t('guard.openAnywayWait'),
      footer: t('guard.footer'),
      breathe: t('guard.breathe'),
      nudgeTitle: t('guard.nudgeTitle'),
      nudgeBody: t('guard.nudgeBody'),
      blockedNoticeTitle: t('guard.blockedNoticeTitle'),
      blockedNoticeBody: t('guard.blockedNoticeBody'),
    },
    suggestions: content.swaps.filter((s) => s.minutes <= 10).map((s) => s.text),
  };
}

/** True when something needs the background guard (limits/pauses or watched apps). */
export function guardHasWork(): boolean {
  const habits = useHabits.getState();
  const settings = useSettings.getState();
  return habits.limits.some((l) => l.enabled) || settings.watchedApps.length > 0;
}

export function syncGuard(): void {
  if (!guard.isAvailable() || useApp.getState().demoMode) return;
  const habits = useHabits.getState();
  guard.setGuardConfig(buildGuardConfig());
  const shouldRun = habits.guardEnabled && guard.hasUsageAccess() && guardHasWork();
  if (shouldRun && !guard.isGuardRunning()) guard.startGuard();
  if (!shouldRun && guard.isGuardRunning()) guard.stopGuard();
}

/** Pull fresh Android usage data and pause-screen outcomes into the local stores. */
export async function refreshDeviceData(): Promise<void> {
  if (!guard.isAvailable() || useApp.getState().demoMode) return;
  const days = await readDeviceUsage(7);
  if (days.length > 0) useHabits.getState().mergeUsage(days);
  const events = guard.consumeGuardEvents();
  if (events.length > 0) useHabits.getState().addGuardEvents(events);
}
