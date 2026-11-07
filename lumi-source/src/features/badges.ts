/**
 * Badges celebrate effort and comebacks — never "best user" rankings.
 * Call checkBadges() after meaningful actions; new badges trigger a celebration.
 */
import { getContent, t } from '@/i18n';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useWellbeing } from '@/store/wellbeing';
import { addDaysToKey, dateKey, lastNDays, weekDays, weekKey } from '@/utils/time';

import { currentStreakLength } from './streaks';
import { averageMinutes, minutesForDays } from './usage';

type Rule = { id: string; earned: () => boolean };

const rules: Rule[] = [
  { id: 'first-step', earned: () => useSettings.getState().onboarded },
  { id: 'first-checkin', earned: () => useWellbeing.getState().moods.length >= 1 },
  {
    id: 'checkin-week',
    earned: () => new Set(useWellbeing.getState().moods.map((m) => dateKey(m.at))).size >= 7,
  },
  {
    id: 'first-breath',
    earned: () => useWellbeing.getState().exercises.some((e) => e.kind === 'breathing' || e.kind === 'grounding'),
  },
  { id: 'calm-five', earned: () => useWellbeing.getState().exercises.length >= 5 },
  { id: 'grateful', earned: () => useWellbeing.getState().journal.some((j) => j.type === 'gratitude') },
  { id: 'ten-wins', earned: () => useWellbeing.getState().journal.filter((j) => j.type === 'win').length >= 10 },
  {
    id: 'time-back',
    earned: () => {
      const { usage, screenCheckins } = useHabits.getState();
      const thisWeek = weekKey();
      const lastWeek = addDaysToKey(thisWeek, -7);
      const prev = averageMinutes(minutesForDays(weekDays(lastWeek), usage, screenCheckins).days);
      const now = averageMinutes(minutesForDays(weekDays(thisWeek), usage, screenCheckins).days);
      return prev !== null && now !== null && now < prev * 0.9;
    },
  },
  {
    id: 'rested',
    earned: () => {
      const recent = new Set(lastNDays(7));
      return useWellbeing.getState().sleep.filter((s) => recent.has(s.date) && s.hours >= 7).length >= 5;
    },
  },
  { id: 'focus-five', earned: () => useHabits.getState().focusSessions.filter((f) => f.completed).length >= 5 },
  {
    id: 'game-balance',
    earned: () => {
      const { gamingSessions, gamingBudgetMinutes } = useHabits.getState();
      const lastWeek = new Set(weekDays(addDaysToKey(weekKey(), -7)));
      const sessions = gamingSessions.filter((g) => g.endedAt && lastWeek.has(dateKey(g.startedAt)));
      const minutes = sessions.reduce((s, g) => s + ((g.endedAt ?? g.startedAt) - g.startedAt) / 60000, 0);
      return sessions.length > 0 && gamingBudgetMinutes > 0 && minutes <= gamingBudgetMinutes;
    },
  },
  {
    id: 'offline-hero',
    earned: () => completedChallengeOfKind('offline'),
  },
  { id: 'detox-done', earned: () => completedChallengeOfKind('detox') },
  {
    id: 'comeback',
    earned: () => {
      const p = useProgress.getState();
      return p.streaks.some((s) => s.restarts > 0) || Object.values(p.challenges).some((c) => c.restarts > 0);
    },
  },
  {
    id: 'seven-strong',
    earned: () => useProgress.getState().streaks.some((s) => s.best >= 7 || currentStreakLength(s) >= 7),
  },
  { id: 'connector', earned: () => useProgress.getState().connections.length >= 3 },
  { id: 'safety-savvy', earned: () => Object.keys(useProgress.getState().guidesRead).length >= 3 },
  { id: 'goal-getter', earned: () => useProgress.getState().goals.some((g) => !!g.completedAt) },
  { id: 'reflector', earned: () => useProgress.getState().reflections.length >= 1 },
  { id: 'step-away', earned: () => useHabits.getState().guardEvents.filter((e) => e.choice === 'closed').length >= 5 },
];

function completedChallengeOfKind(kind: 'detox' | 'offline'): boolean {
  const ids = new Set(getContent().challenges.filter((c) => c.kind === kind).map((c) => c.id));
  return Object.values(useProgress.getState().challenges).some((c) => ids.has(c.challengeId) && !!c.completedAt);
}

/** Earns any newly-met badges and queues a celebration for each. Returns the new ids. */
export function checkBadges(): string[] {
  if (!useApp.getState().ready) return [];
  const progress = useProgress.getState();
  const badges = getContent().badges;
  const fresh: string[] = [];
  for (const rule of rules) {
    if (progress.badges[rule.id]) continue;
    let met = false;
    try {
      met = rule.earned();
    } catch {
      met = false;
    }
    if (met && useProgress.getState().earnBadge(rule.id)) {
      fresh.push(rule.id);
      const info = badges.find((b) => b.id === rule.id);
      useApp.getState().celebrate({
        kind: 'badge',
        badgeId: rule.id,
        title: t('celebrate.badgeTitle', { name: info?.title ?? rule.id }),
        body: info?.description ?? '',
      });
    }
  }
  return fresh;
}

export const BADGE_IDS = rules.map((r) => r.id);
