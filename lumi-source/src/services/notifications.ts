/**
 * Local notifications only (scheduled on the phone, no server, no push tokens).
 * Wording is deliberately neutral so nothing private shows on a lock screen.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getContent, t } from '@/i18n';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { pickDaily } from '@/utils/misc';
import { dateKey, hhmmToMinutes } from '@/utils/time';

const REMINDERS = 'lumi-reminders';
const TIMERS = 'lumi-timers';
const MANAGED_PREFIXES = ['reminder-', 'window-'];

const supported = Platform.OS === 'android' || Platform.OS === 'ios';

export async function configureNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDERS, {
      name: t('notifications.channelReminders'),
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync(TIMERS, {
      name: t('notifications.channelTimers'),
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      vibrationPattern: [0, 200, 120, 200],
      showBadge: false,
    });
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

function daily(hhmm: string, offsetMinutes = 0): Notifications.NotificationTriggerInput {
  const total = (((hhmmToMinutes(hhmm) + offsetMinutes) % 1440) + 1440) % 1440;
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: Math.floor(total / 60),
    minute: total % 60,
    channelId: REMINDERS,
  };
}

function weekly(jsWeekday: number, hhmm: string): Notifications.NotificationTriggerInput {
  const total = hhmmToMinutes(hhmm);
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: jsWeekday + 1, // expo-notifications: 1 = Sunday
    hour: Math.floor(total / 60),
    minute: total % 60,
    channelId: REMINDERS,
  };
}

async function schedule(identifier: string, title: string, body: string, trigger: Notifications.NotificationTriggerInput, url?: string) {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data: url ? { url } : {} },
    trigger,
  });
}

/** Cancels and re-creates all repeating reminders from current settings. Safe to call often. */
export async function syncReminders(): Promise<void> {
  if (!supported) return;
  if ((await getNotificationPermission()) !== 'granted') return;
  const settings = useSettings.getState();
  const habits = useHabits.getState();
  const n = settings.notifications;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((s) => MANAGED_PREFIXES.some((p) => s.identifier.startsWith(p)))
      .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
  );

  if (!settings.onboarded) return;

  if (n.checkin) {
    await schedule('reminder-checkin', t('notifications.checkinTitle'), t('notifications.checkinBody'), daily(settings.checkinTime), '/mind/mood');
  }
  if (n.bedtime) {
    const windDown = habits.bedtime.enabled ? habits.bedtime.windDownMinutes : 30;
    await schedule('reminder-winddown', t('notifications.windDownTitle'), t('notifications.windDownBody'), daily(settings.bedtime, -windDown), '/habits/bedtime');
  }
  if (n.morning) {
    await schedule('reminder-morning', t('notifications.morningTitle'), t('notifications.morningBody'), daily(settings.wakeTime, 30), '/mind/sleep');
  }
  if (n.quotes) {
    const quote = pickDaily(getContent().quotes, dateKey())?.text ?? t('notifications.quoteFallback');
    await schedule('reminder-quote', t('notifications.quoteTitle'), quote, daily(settings.wakeTime, 60), '/');
  }
  if (n.weekly) {
    await schedule('reminder-weekly', t('notifications.weeklyTitle'), t('notifications.weeklyBody'), weekly(0, '18:00'), '/me/insights');
  }
  if (n.nudges) {
    await schedule('reminder-nudge-a', t('notifications.nudgeTitle'), t('notifications.nudgeBody'), weekly(2, '17:30'), '/connect/nudges');
    await schedule('reminder-nudge-b', t('notifications.nudgeTitle'), t('notifications.nudgeBody2'), weekly(5, '16:30'), '/connect/nudges');
  }
  if (n.windows) {
    for (const w of habits.windows.filter((x) => x.enabled)) {
      for (const day of w.days) {
        await schedule(
          `window-${w.id}-${day}`,
          t('notifications.windowTitle', { label: w.label }),
          t('notifications.windowBody'),
          weekly(day, w.start),
          '/habits/schedules',
        );
      }
    }
  }
}

/** One-off timer notification (focus end, gaming last round...). */
export async function scheduleTimer(identifier: string, at: number, title: string, body: string, url?: string): Promise<void> {
  if (!supported || at <= Date.now()) return;
  if ((await getNotificationPermission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data: url ? { url } : {} },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: TIMERS },
  });
}

export async function cancelTimer(identifier: string): Promise<void> {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}

export async function cancelAllNotifications(): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
