/** Eye-rest and everyday physical health: water, movement, stretches, eye breaks, time outside. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { capList } from '@/utils/misc';
import { dateKey } from '@/utils/time';

import { persistOptions } from './storage';
import type { BodyDay, BodyMetric, BodyReminders } from './types';

export const BODY_METRICS: BodyMetric[] = ['water', 'move', 'stretch', 'eye', 'outdoor'];

export type BodyData = {
  days: BodyDay[];
  targets: Record<BodyMetric, number>;
  reminders: BodyReminders;
};

type BodyActions = {
  /** Adds (or with a negative amount, removes) to today's total. Never goes below zero. */
  add: (metric: BodyMetric, amount: number, date?: string) => void;
  setTarget: (metric: BodyMetric, value: number) => void;
  setReminders: (patch: Partial<BodyReminders>) => void;
};

export type BodyState = BodyData & BodyActions;

export const emptyDay = (date: string): BodyDay => ({ date, water: 0, move: 0, stretch: 0, eye: 0, outdoor: 0 });

export const initialBody = (): BodyData => ({
  days: [],
  targets: { water: 8, move: 30, stretch: 3, eye: 6, outdoor: 30 },
  reminders: {
    eye: { enabled: false, every: 20 },
    move: { enabled: false, every: 60 },
    water: { enabled: false, every: 90 },
    from: '08:00',
    to: '21:00',
  },
});

export const useBody = create<BodyState>()(
  persist(
    (set) => ({
      ...initialBody(),
      add: (metric, amount, date = dateKey()) =>
        set((s) => {
          const current = s.days.find((d) => d.date === date) ?? emptyDay(date);
          const next: BodyDay = { ...current, [metric]: Math.max(0, Math.round((current[metric] + amount) * 10) / 10) };
          const days = [...s.days.filter((d) => d.date !== date), next].sort((a, b) => a.date.localeCompare(b.date));
          return { days: capList(days, 90) };
        }),
      setTarget: (metric, value) => set((s) => ({ targets: { ...s.targets, [metric]: Math.max(1, Math.round(value)) } })),
      setReminders: (patch) => set((s) => ({ reminders: { ...s.reminders, ...patch } })),
    }),
    persistOptions<BodyState>('body', initialBody),
  ),
);

export function dayOf(days: BodyDay[], date = dateKey()): BodyDay {
  return days.find((d) => d.date === date) ?? emptyDay(date);
}

/** Share of today's targets met, 0..1, averaged across all metrics. */
export function bodyScore(day: BodyDay, targets: Record<BodyMetric, number>): number {
  const parts = BODY_METRICS.map((m) => Math.min(1, day[m] / Math.max(1, targets[m])));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}
