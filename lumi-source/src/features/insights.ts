/**
 * Weekly reflection summary. Calculated on the phone, visible only to the user.
 * Patterns are described as "might be linked" — they are hints for reflection, not proof.
 */
import type {
  DailyUsage,
  ExerciseLog,
  FocusSession,
  GamingSession,
  GuardEvent,
  JournalEntry,
  MoodEntry,
  ScreenCheckin,
  SleepEntry,
} from '@/store/types';
import { average, round1 } from '@/utils/misc';
import { addDaysToKey, dateKey, lastNDays, parseDateKey, weekDays } from '@/utils/time';

import { averageMinutes, minutesForDays, type DayMinutes, type UsageSource } from './usage';

export type InsightInput = {
  moods: MoodEntry[];
  sleep: SleepEntry[];
  journal: JournalEntry[];
  exercises: ExerciseLog[];
  usage: DailyUsage[];
  checkins: ScreenCheckin[];
  gaming: GamingSession[];
  gamingBudgetMinutes: number;
  focus: FocusSession[];
  guardEvents: GuardEvent[];
};

export type Pattern = { id: string; params: Record<string, string | number> };

export type WeeklySummary = {
  weekStart: string;
  days: string[];
  screen: { source: UsageSource; days: DayMinutes[]; avg: number | null; prevAvg: number | null; changePct: number | null };
  mood: { avg: number | null; prevAvg: number | null; count: number; byDay: (number | null)[]; topEmotions: string[] };
  sleep: { avgHours: number | null; nights: number; byDay: (number | null)[] };
  gaming: { minutes: number; budget: number; sessions: number };
  focus: { sessions: number; minutes: number };
  journal: { gratitude: number; wins: number; reflections: number };
  afterScroll: { better: number; same: number; worse: number; total: number };
  exercises: number;
  pauses: { closed: number; continued: number };
  patterns: Pattern[];
  highlights: Pattern[];
  hasData: boolean;
};

const inWeek = (days: Set<string>) => (at: number) => days.has(dateKey(at));

function moodByDate(moods: MoodEntry[]): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const m of moods) {
    const key = dateKey(m.at);
    groups.set(key, [...(groups.get(key) ?? []), m.score]);
  }
  return new Map(Array.from(groups.entries()).map(([k, v]) => [k, average(v) ?? 0]));
}

/** Compares average mood on days that match `inGroupA` vs the rest. */
function compareMood(
  dates: string[],
  moodMap: Map<string, number>,
  inGroupA: (date: string) => boolean | null,
): { a: number; b: number; n: number } | null {
  const a: number[] = [];
  const b: number[] = [];
  for (const date of dates) {
    const mood = moodMap.get(date);
    const group = inGroupA(date);
    if (mood === undefined || group === null) continue;
    (group ? a : b).push(mood);
  }
  if (a.length < 2 || b.length < 2) return null;
  return { a: round1(average(a)!), b: round1(average(b)!), n: a.length + b.length };
}

export function buildWeeklySummary(input: InsightInput, weekStart: string): WeeklySummary {
  const days = weekDays(weekStart);
  const daySet = new Set(days);
  const prevDays = weekDays(addDaysToKey(weekStart, -7));
  const prevSet = new Set(prevDays);
  const isThisWeek = inWeek(daySet);

  // Screen time
  const screenNow = minutesForDays(days, input.usage, input.checkins);
  const screenPrev = minutesForDays(prevDays, input.usage, input.checkins);
  const avg = averageMinutes(screenNow.days);
  const prevAvg = averageMinutes(screenPrev.days);
  const changePct = avg !== null && prevAvg !== null && prevAvg > 0 ? Math.round(((avg - prevAvg) / prevAvg) * 100) : null;

  // Mood
  const weekMoods = input.moods.filter((m) => isThisWeek(m.at));
  const prevMoods = input.moods.filter((m) => prevSet.has(dateKey(m.at)));
  const moodMap = moodByDate(input.moods);
  const emotionCounts = new Map<string, number>();
  weekMoods.forEach((m) => m.emotions.forEach((e) => emotionCounts.set(e, (emotionCounts.get(e) ?? 0) + 1)));
  const topEmotions = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  // Sleep (entry date = the morning you woke up)
  const sleepMap = new Map(input.sleep.map((s) => [s.date, s.hours]));
  const sleepByDay = days.map((d) => sleepMap.get(d) ?? null);
  const sleepValues = sleepByDay.filter((h): h is number => h !== null);

  // Gaming
  const weekGaming = input.gaming.filter((g) => isThisWeek(g.startedAt) && g.endedAt);
  const gamingMinutes = weekGaming.reduce((sum, g) => sum + Math.round(((g.endedAt ?? g.startedAt) - g.startedAt) / 60000), 0);

  // Focus
  const weekFocus = input.focus.filter((f) => isThisWeek(f.startedAt) && f.completed);

  // Journal
  const weekJournal = input.journal.filter((j) => isThisWeek(j.at));

  // After-scroll check-ins
  const afterScroll = { better: 0, same: 0, worse: 0, total: 0 };
  for (const m of weekMoods.filter((x) => x.context === 'after-scroll')) {
    afterScroll.total++;
    if (m.feeling === 'better' || m.feeling === 'inspired') afterScroll.better++;
    else if (m.feeling === 'same') afterScroll.same++;
    else afterScroll.worse++;
  }

  const weekEvents = input.guardEvents.filter((e) => isThisWeek(e.at));

  // ---- Patterns over the last 28 days (more data = fairer hints) ----
  const weekEnd = parseDateKey(days[6]);
  const window = lastNDays(28, weekEnd.getTime() < Date.now() ? weekEnd : new Date());
  const patterns: Pattern[] = [];

  const sleepCompare = compareMood(window, moodMap, (d) => (sleepMap.has(d) ? (sleepMap.get(d)! >= 7) : null));
  if (sleepCompare && Math.abs(sleepCompare.a - sleepCompare.b) >= 0.4) {
    patterns.push({
      id: sleepCompare.a > sleepCompare.b ? 'sleepMood' : 'sleepMoodReverse',
      params: { good: sleepCompare.a, short: sleepCompare.b },
    });
  }

  const screenWindow = minutesForDays(window, input.usage, input.checkins).days.filter((d) => d.minutes !== null);
  if (screenWindow.length >= 4) {
    const sorted = [...screenWindow].map((d) => d.minutes!).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const minutesMap = new Map(screenWindow.map((d) => [d.date, d.minutes!]));
    const screenCompare = compareMood(window, moodMap, (d) => (minutesMap.has(d) ? minutesMap.get(d)! < median : null));
    if (screenCompare && Math.abs(screenCompare.a - screenCompare.b) >= 0.4) {
      patterns.push({
        id: screenCompare.a > screenCompare.b ? 'screenMood' : 'screenMoodReverse',
        params: { low: screenCompare.a, high: screenCompare.b, hours: round1(median / 60) },
      });
    }
  }

  const scrollChecks = input.moods.filter((m) => m.context === 'after-scroll' && window.includes(dateKey(m.at)));
  if (scrollChecks.length >= 3) {
    const worse = scrollChecks.filter((m) => !['better', 'inspired', 'same'].includes(m.feeling ?? '')).length;
    const better = scrollChecks.filter((m) => ['better', 'inspired'].includes(m.feeling ?? '')).length;
    if (worse / scrollChecks.length >= 0.5) patterns.push({ id: 'afterScrollWorse', params: { worse, total: scrollChecks.length } });
    else if (better / scrollChecks.length >= 0.5) patterns.push({ id: 'afterScrollBetter', params: { better, total: scrollChecks.length } });
  }

  const rated = input.gaming.filter((g) => g.moodScore !== undefined && g.endedAt && window.includes(dateKey(g.startedAt)));
  if (rated.length >= 4) {
    const long = rated.filter((g) => (g.endedAt! - g.startedAt) / 60000 >= 90).map((g) => g.moodScore!);
    const short = rated.filter((g) => (g.endedAt! - g.startedAt) / 60000 < 90).map((g) => g.moodScore!);
    if (long.length >= 2 && short.length >= 2) {
      const l = round1(average(long)!);
      const s = round1(average(short)!);
      if (s - l >= 0.5) patterns.push({ id: 'gamingLong', params: { long: l, short: s } });
    }
  }

  const exerciseDays = new Set(input.exercises.map((e) => dateKey(e.at)));
  const calmCompare = compareMood(window, moodMap, (d) => (moodMap.has(d) ? exerciseDays.has(d) : null));
  if (calmCompare && calmCompare.a - calmCompare.b >= 0.4) {
    patterns.push({ id: 'calmMood', params: { with: calmCompare.a, without: calmCompare.b } });
  }

  // ---- Highlights (always positive, never shaming) ----
  const highlights: Pattern[] = [];
  if (changePct !== null && changePct <= -10 && avg !== null && prevAvg !== null) {
    highlights.push({ id: 'screenDown', params: { minutes: prevAvg - avg, pct: Math.abs(changePct) } });
  }
  const moodAvg = average(weekMoods.map((m) => m.score));
  const prevMoodAvg = average(prevMoods.map((m) => m.score));
  if (moodAvg !== null && prevMoodAvg !== null && moodAvg - prevMoodAvg >= 0.3) highlights.push({ id: 'moodUp', params: {} });
  if (sleepValues.filter((h) => h >= 7).length >= 4) highlights.push({ id: 'sleepGood', params: { nights: sleepValues.filter((h) => h >= 7).length } });
  if (weekFocus.length >= 2) highlights.push({ id: 'focusDone', params: { count: weekFocus.length } });
  const wins = weekJournal.filter((j) => j.type === 'win').length;
  if (wins >= 1) highlights.push({ id: 'winsLogged', params: { count: wins } });
  const closed = weekEvents.filter((e) => e.choice === 'closed').length;
  if (closed >= 1) highlights.push({ id: 'steppedAway', params: { count: closed } });
  if (input.gamingBudgetMinutes > 0 && weekGaming.length > 0 && gamingMinutes <= input.gamingBudgetMinutes) {
    highlights.push({ id: 'gamingBudget', params: {} });
  }

  const hasData =
    weekMoods.length > 0 || sleepValues.length > 0 || avg !== null || weekJournal.length > 0 || weekGaming.length > 0 || weekFocus.length > 0;

  return {
    weekStart,
    days,
    screen: { source: screenNow.source, days: screenNow.days, avg, prevAvg, changePct },
    mood: {
      avg: moodAvg === null ? null : round1(moodAvg),
      prevAvg: prevMoodAvg === null ? null : round1(prevMoodAvg),
      count: weekMoods.length,
      byDay: days.map((d) => {
        const v = moodMap.get(d);
        return v === undefined ? null : round1(v);
      }),
      topEmotions,
    },
    sleep: {
      avgHours: sleepValues.length ? round1(average(sleepValues)!) : null,
      nights: sleepValues.length,
      byDay: sleepByDay,
    },
    gaming: { minutes: gamingMinutes, budget: input.gamingBudgetMinutes, sessions: weekGaming.length },
    focus: {
      sessions: weekFocus.length,
      minutes: weekFocus.reduce((sum, f) => sum + Math.round(((f.endedAt ?? f.startedAt) - f.startedAt) / 60000), 0),
    },
    journal: {
      gratitude: weekJournal.filter((j) => j.type === 'gratitude').length,
      wins,
      reflections: weekJournal.filter((j) => j.type === 'reflection').length,
    },
    afterScroll,
    exercises: input.exercises.filter((e) => isThisWeek(e.at)).length,
    pauses: { closed, continued: weekEvents.filter((e) => e.choice === 'continued').length },
    patterns,
    highlights,
    hasData,
  };
}
