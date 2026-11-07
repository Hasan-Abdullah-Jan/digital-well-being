/** Congratulation messages when screen time drops. Kind, specific and once per week. */
import { t } from '@/i18n';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { addDaysToKey, splitMinutes, weekDays, weekKey } from '@/utils/time';

import { averageMinutes, minutesForDays } from './usage';

export function formatMinutes(total: number): string {
  const { h, m } = splitMinutes(total);
  if (h === 0) return t('time.minutes', { count: m });
  if (m === 0) return t('time.hours', { count: h });
  return t('time.hoursMinutes', { h, m });
}

export function checkUsageCelebration(): void {
  const thisWeek = weekKey();
  const progress = useProgress.getState();
  if (progress.lastUsageCelebrationWeek === thisWeek) return;
  const { usage, screenCheckins } = useHabits.getState();
  const now = minutesForDays(weekDays(thisWeek), usage, screenCheckins).days.filter((d) => d.minutes !== null);
  const prev = minutesForDays(weekDays(addDaysToKey(thisWeek, -7)), usage, screenCheckins).days;
  // Wait for at least 3 days of data this week so the comparison is fair.
  if (now.length < 3) return;
  const avgNow = averageMinutes(now);
  const avgPrev = averageMinutes(prev);
  if (avgNow === null || avgPrev === null || avgNow >= avgPrev * 0.9) return;
  const saved = avgPrev - avgNow;
  progress.setUsageCelebrationWeek(thisWeek);
  useApp.getState().celebrate({
    kind: 'message',
    title: t('celebrate.usageTitle'),
    body: t('celebrate.usageBody', { perDay: formatMinutes(saved), perWeek: formatMinutes(saved * 7) }),
  });
}
