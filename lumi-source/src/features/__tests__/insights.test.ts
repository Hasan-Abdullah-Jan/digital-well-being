import { buildWeeklySummary, type InsightInput } from '@/features/insights';
import type { MoodScore } from '@/store/types';
import { addDaysToKey, dateKey, parseDateKey, weekKey } from '@/utils/time';

function dayAt(key: string, hour: number) {
  return parseDateKey(key).getTime() + hour * 3600000;
}

function input(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    moods: [],
    sleep: [],
    journal: [],
    exercises: [],
    usage: [],
    checkins: [],
    gaming: [],
    gamingBudgetMinutes: 420,
    focus: [],
    guardEvents: [],
    ...overrides,
  };
}

describe('buildWeeklySummary', () => {
  const lastWeek = addDaysToKey(weekKey(), -7);

  it('reports no data for an empty week', () => {
    expect(buildWeeklySummary(input(), lastWeek).hasData).toBe(false);
  });

  it('connects sleep and mood without overclaiming', () => {
    const days = Array.from({ length: 14 }, (_, i) => addDaysToKey(lastWeek, i - 7));
    const sleep = days.map((d, i) => ({ id: d, date: d, bedtime: '23:00', wake: i % 2 ? '07:30' : '05:30', hours: i % 2 ? 8.5 : 6.5, quality: 3 as const }));
    const moods = days.map((d, i) => ({ id: d, at: dayAt(d, 20), score: (i % 2 ? 4 : 2) as MoodScore, emotions: [], context: 'general' as const }));
    const summary = buildWeeklySummary(input({ sleep, moods }), lastWeek);
    expect(summary.hasData).toBe(true);
    const pattern = summary.patterns.find((p) => p.id === 'sleepMood');
    expect(pattern).toBeDefined();
    expect(Number(pattern!.params.good)).toBeGreaterThan(Number(pattern!.params.short));
  });

  it('celebrates a drop in screen time compared with the week before', () => {
    const checkins = Array.from({ length: 14 }, (_, i) => {
      const date = addDaysToKey(lastWeek, i - 7);
      return { id: date, date, minutes: i < 7 ? 300 : 180, at: dayAt(date, 21) };
    });
    const summary = buildWeeklySummary(input({ checkins }), lastWeek);
    expect(summary.screen.source).toBe('self');
    expect(summary.screen.changePct).toBe(-40);
    expect(summary.highlights.map((h) => h.id)).toContain('screenDown');
  });

  it('counts journal wins and gaming against the budget', () => {
    const d = lastWeek;
    const summary = buildWeeklySummary(
      input({
        journal: [{ id: 'j', at: dayAt(d, 12), type: 'win', text: 'Finished my project' }],
        gaming: [{ id: 'g', startedAt: dayAt(d, 17), endedAt: dayAt(d, 18), plannedMinutes: 60 }],
      }),
      lastWeek,
    );
    expect(summary.journal.wins).toBe(1);
    expect(summary.gaming.minutes).toBe(60);
    expect(summary.highlights.map((h) => h.id)).toEqual(expect.arrayContaining(['winsLogged', 'gamingBudget']));
    expect(dateKey(summary.days.length)).toBeTruthy();
  });
});
