/**
 * Keeps the Android guard service in sync with what the user set up in the app:
 * app limits, "pause and think" apps, phone-free windows, bedtime and focus sessions.
 */
import { readDeviceUsage } from '@/features/usage';
import { getContent, t } from '@/i18n';
import { guard, type GuardConfig } from '@/native/guard';
import { useApp } from '@/store/app';
import { useBody } from '@/store/body';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { hhmmToMinutes } from '@/utils/time';

function focusRunning(): boolean {
  const focus = useHabits.getState().activeFocus;
  return !!focus && focus.endsAt > Date.now();
}

/** Smart eye-rest reminders run in the guard service (they follow real screen-on time). */
export function usesNativeEyeRest(): boolean {
  return (
    guard.isAvailable() &&
    !useApp.getState().demoMode &&
    guard.hasUsageAccess() &&
    useBody.getState().reminders.eye.enabled
  );
}

export function buildGuardConfig(): GuardConfig {
  const habits = useHabits.getState();
  const settings = useSettings.getState();
  const body = useBody.getState();
  const content = getContent();
  // Pause screens follow the user's master switch; a running focus session always applies.
  const pauseOn = habits.guardEnabled;
  const focusing = focusRunning();
  const limits = pauseOn || focusing
    ? habits.limits
        .filter((l) => l.enabled)
        .map((l) => ({ pkg: l.packageName, label: l.label, minutes: pauseOn ? l.minutesPerDay : 0, pauseOnOpen: pauseOn && l.pauseOnOpen }))
    : [];
  const bedStart = hhmmToMinutes(settings.bedtime);
  const bedEnd = hhmmToMinutes(settings.wakeTime);
  const focus = habits.activeFocus;
  return {
    limits,
    watched: pauseOn ? settings.watchedApps : [],
    frictionMinutes: settings.frictionMinutes,
    windows: pauseOn
      ? habits.windows
          .filter((w) => w.enabled && w.lockApps)
          .map((w) => ({ label: w.label, days: w.days, start: hhmmToMinutes(w.start), end: hhmmToMinutes(w.end) }))
      : [],
    bedtime: {
      enabled: pauseOn && habits.bedtime.enabled && habits.bedtime.lockApps,
      start: bedStart,
      end: bedEnd,
      grayscale: habits.bedtime.enabled && habits.bedtime.grayscale,
    },
    focusUntil: focusing ? focus!.endsAt : 0,
    focusMode: focus?.mode ?? 'gentle',
    focusAllow: habits.focusAllow.map((a) => a.packageName),
    focusStrict: !!focus?.locked,
    strict: {
      enabled: pauseOn && habits.strict.enabled,
      sessionCap: habits.strict.sessionCapMinutes,
      cooldown: habits.strict.cooldownMinutes,
    },
    eye: {
      enabled: body.reminders.eye.enabled,
      every: body.reminders.eye.every,
      from: hhmmToMinutes(body.reminders.from),
      to: hhmmToMinutes(body.reminders.to),
    },
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
      focusDeepBody: t('guard.focusDeepBody'),
      sessionTitle: t('guard.sessionTitle'),
      sessionBody: t('guard.sessionBody'),
      strictNote: t('guard.strictNote'),
      lockedFocusNote: t('guard.lockedFocusNote'),
      eyeTitle: t('guard.eyeTitle'),
      eyeBody: t('guard.eyeBody'),
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
  const focus = habits.activeFocus;
  const focusNeedsGuard = focusRunning() && (focus?.mode === 'deep' || habits.limits.some((l) => l.enabled));
  const shouldRun =
    guard.hasUsageAccess() &&
    ((habits.guardEnabled && guardHasWork()) || focusNeedsGuard || useBody.getState().reminders.eye.enabled);
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
