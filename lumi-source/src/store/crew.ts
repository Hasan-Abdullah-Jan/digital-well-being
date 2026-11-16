/** Offline family and friend challenges. Everything stays on this phone unless you share a code. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { makeId } from '@/utils/misc';

import { persistOptions } from './storage';
import type { Crew } from './types';

export type CrewData = { crews: Crew[] };

type CrewActions = {
  addCrew: (crew: Omit<Crew, 'id' | 'createdAt' | 'log'> & { id?: string; log?: Crew['log'] }) => Crew;
  updateCrew: (id: string, patch: Partial<Omit<Crew, 'id'>>) => void;
  removeCrew: (id: string) => void;
  toggleHabit: (crewId: string, date: string, memberId: string, habitId: string) => boolean;
  /** Merges check-ins from another phone (union, so nothing is ever lost). */
  mergeLog: (crewId: string, log: Crew['log']) => number;
};

export type CrewState = CrewData & CrewActions;

export const initialCrew = (): CrewData => ({ crews: [] });

function mapCrew(crews: Crew[], id: string, fn: (c: Crew) => Crew): Crew[] {
  return crews.map((c) => (c.id === id ? fn(c) : c));
}

export const useCrew = create<CrewState>()(
  persist(
    (set, get) => ({
      ...initialCrew(),
      addCrew: (input) => {
        const crew: Crew = { ...input, id: input.id ?? makeId('crew'), createdAt: Date.now(), log: input.log ?? {} };
        set((s) => ({ crews: [crew, ...s.crews.filter((c) => c.id !== crew.id)] }));
        return crew;
      },
      updateCrew: (id, patch) => set((s) => ({ crews: mapCrew(s.crews, id, (c) => ({ ...c, ...patch })) })),
      removeCrew: (id) => set((s) => ({ crews: s.crews.filter((c) => c.id !== id) })),
      toggleHabit: (crewId, date, memberId, habitId) => {
        const crew = get().crews.find((c) => c.id === crewId);
        if (!crew) return false;
        const day = crew.log[date] ?? {};
        const done = day[memberId] ?? [];
        const nowDone = !done.includes(habitId);
        const nextDone = nowDone ? [...done, habitId] : done.filter((h) => h !== habitId);
        set((s) => ({
          crews: mapCrew(s.crews, crewId, (c) => ({ ...c, log: { ...c.log, [date]: { ...day, [memberId]: nextDone } } })),
        }));
        return nowDone;
      },
      mergeLog: (crewId, incoming) => {
        const crew = get().crews.find((c) => c.id === crewId);
        if (!crew) return 0;
        let added = 0;
        const log: Crew['log'] = { ...crew.log };
        const validMembers = new Set(crew.members.map((m) => m.id));
        const validHabits = new Set(crew.habits.map((h) => h.id));
        for (const [date, members] of Object.entries(incoming)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const day = { ...(log[date] ?? {}) };
          for (const [memberId, habits] of Object.entries(members ?? {})) {
            if (!validMembers.has(memberId) || !Array.isArray(habits)) continue;
            const current = new Set(day[memberId] ?? []);
            for (const h of habits) {
              if (validHabits.has(h) && !current.has(h)) {
                current.add(h);
                added += 1;
              }
            }
            day[memberId] = Array.from(current);
          }
          log[date] = day;
        }
        set((s) => ({ crews: mapCrew(s.crews, crewId, (c) => ({ ...c, log })) }));
        return added;
      },
    }),
    persistOptions<CrewState>('crew', initialCrew),
  ),
);
