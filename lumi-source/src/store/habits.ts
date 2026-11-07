import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { capList, makeId } from '@/utils/misc';
import { dateKey } from '@/utils/time';

import { persistOptions } from './storage';
import type {
  AppLimit,
  BedtimeSettings,
  DailyUsage,
  FocusSession,
  GamingSession,
  GuardEvent,
  PhoneFreeWindow,
  ScreenCheckin,
} from './types';

export type ActiveTimer = { id: string; startedAt: number; endsAt: number; label?: string };

export type HabitsData = {
  limits: AppLimit[];
  windows: PhoneFreeWindow[];
  bedtime: BedtimeSettings;
  focusSessions: FocusSession[];
  activeFocus: ActiveTimer | null;
  gamingBudgetMinutes: number;
  gamingSessions: GamingSession[];
  activeGaming: (ActiveTimer & { game?: string }) | null;
  screenCheckins: ScreenCheckin[];
  /** Cached daily usage from the Android usage API (or demo data). Last ~35 days. */
  usage: DailyUsage[];
  guardEvents: GuardEvent[];
  /** Android guard service switched on by the user. */
  guardEnabled: boolean;
};

type HabitsActions = {
  upsertLimit: (limit: Omit<AppLimit, 'id'> & { id?: string }) => void;
  removeLimit: (id: string) => void;
  upsertWindow: (w: Omit<PhoneFreeWindow, 'id'> & { id?: string }) => void;
  removeWindow: (id: string) => void;
  setBedtime: (patch: Partial<BedtimeSettings>) => void;
  startFocus: (minutes: number, label?: string) => ActiveTimer;
  endFocus: (completed: boolean) => FocusSession | null;
  setGamingBudget: (minutes: number) => void;
  startGaming: (minutes: number, game?: string) => ActiveTimer;
  endGaming: () => GamingSession | null;
  rateGaming: (id: string, moodAfter: string, moodScore: number) => void;
  addGamingManual: (minutes: number, game?: string) => void;
  addScreenCheckin: (minutes: number, topCategory?: string, date?: string) => void;
  mergeUsage: (days: DailyUsage[]) => void;
  addGuardEvents: (events: GuardEvent[]) => void;
  setGuardEnabled: (value: boolean) => void;
};

export type HabitsState = HabitsData & HabitsActions;

export const initialHabits = (): HabitsData => ({
  limits: [],
  windows: [],
  bedtime: { enabled: false, windDownMinutes: 30, lockApps: true, grayscale: false },
  focusSessions: [],
  activeFocus: null,
  gamingBudgetMinutes: 7 * 60,
  gamingSessions: [],
  activeGaming: null,
  screenCheckins: [],
  usage: [],
  guardEvents: [],
  guardEnabled: false,
});

export const useHabits = create<HabitsState>()(
  persist(
    (set, get) => ({
      ...initialHabits(),
      upsertLimit: (input) =>
        set((s) => {
          const id = input.id ?? makeId('l');
          const limit: AppLimit = { ...input, id };
          const exists = s.limits.some((l) => l.id === id || l.packageName === limit.packageName);
          return {
            limits: exists
              ? s.limits.map((l) => (l.id === id || l.packageName === limit.packageName ? { ...limit, id: l.id } : l))
              : [...s.limits, limit],
          };
        }),
      removeLimit: (id) => set((s) => ({ limits: s.limits.filter((l) => l.id !== id) })),
      upsertWindow: (input) =>
        set((s) => {
          const id = input.id ?? makeId('w');
          const window: PhoneFreeWindow = { ...input, id };
          return s.windows.some((w) => w.id === id)
            ? { windows: s.windows.map((w) => (w.id === id ? window : w)) }
            : { windows: [...s.windows, window] };
        }),
      removeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
      setBedtime: (patch) => set((s) => ({ bedtime: { ...s.bedtime, ...patch } })),
      startFocus: (minutes, label) => {
        const now = Date.now();
        const timer: ActiveTimer = { id: makeId('f'), startedAt: now, endsAt: now + minutes * 60_000, label };
        set({ activeFocus: timer });
        return timer;
      },
      endFocus: (completed) => {
        const active = get().activeFocus;
        if (!active) return null;
        const session: FocusSession = {
          id: active.id,
          startedAt: active.startedAt,
          plannedMinutes: Math.round((active.endsAt - active.startedAt) / 60_000),
          endedAt: Date.now(),
          completed,
          label: active.label,
        };
        set((s) => ({ activeFocus: null, focusSessions: capList([...s.focusSessions, session], 1000) }));
        return session;
      },
      setGamingBudget: (minutes) => set({ gamingBudgetMinutes: Math.max(0, Math.round(minutes)) }),
      startGaming: (minutes, game) => {
        const now = Date.now();
        const timer = { id: makeId('g'), startedAt: now, endsAt: now + minutes * 60_000, game };
        set({ activeGaming: timer });
        return timer;
      },
      endGaming: () => {
        const active = get().activeGaming;
        if (!active) return null;
        const session: GamingSession = {
          id: active.id,
          startedAt: active.startedAt,
          plannedMinutes: Math.round((active.endsAt - active.startedAt) / 60_000),
          endedAt: Date.now(),
          game: active.game,
        };
        set((s) => ({ activeGaming: null, gamingSessions: capList([...s.gamingSessions, session], 1000) }));
        return session;
      },
      rateGaming: (id, moodAfter, moodScore) =>
        set((s) => ({
          gamingSessions: s.gamingSessions.map((g) => (g.id === id ? { ...g, moodAfter, moodScore } : g)),
        })),
      addGamingManual: (minutes, game) => {
        const end = Date.now();
        const session: GamingSession = {
          id: makeId('g'),
          startedAt: end - minutes * 60_000,
          endedAt: end,
          plannedMinutes: minutes,
          game,
        };
        set((s) => ({ gamingSessions: capList([...s.gamingSessions, session], 1000) }));
      },
      addScreenCheckin: (minutes, topCategory, date) => {
        const key = date ?? dateKey();
        const entry: ScreenCheckin = { id: makeId('c'), date: key, minutes, topCategory, at: Date.now() };
        set((s) => ({
          screenCheckins: capList([...s.screenCheckins.filter((c) => c.date !== key), entry], 400),
        }));
      },
      mergeUsage: (days) =>
        set((s) => {
          const byDate = new Map(s.usage.map((d) => [d.date, d]));
          for (const day of days) byDate.set(day.date, day);
          const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
          return { usage: capList(merged, 35) };
        }),
      addGuardEvents: (events) =>
        set((s) => {
          if (events.length === 0) return {};
          const seen = new Set(s.guardEvents.map((e) => `${e.at}-${e.packageName}`));
          const fresh = events.filter((e) => !seen.has(`${e.at}-${e.packageName}`));
          return { guardEvents: capList([...s.guardEvents, ...fresh].sort((a, b) => a.at - b.at), 500) };
        }),
      setGuardEnabled: (value) => set({ guardEnabled: value }),
    }),
    persistOptions<HabitsState>('habits', initialHabits),
  ),
);
