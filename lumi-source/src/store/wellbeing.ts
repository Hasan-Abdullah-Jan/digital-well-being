import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { capList, makeId } from '@/utils/misc';
import { sleepHours } from '@/utils/time';

import { persistOptions } from './storage';
import type { ExerciseLog, JournalEntry, MoodEntry, SleepEntry } from './types';

export type WellbeingData = {
  moods: MoodEntry[];
  journal: JournalEntry[];
  sleep: SleepEntry[];
  exercises: ExerciseLog[];
};

type WellbeingActions = {
  addMood: (entry: Omit<MoodEntry, 'id' | 'at'> & { at?: number }) => MoodEntry;
  deleteMood: (id: string) => void;
  addJournal: (entry: Omit<JournalEntry, 'id' | 'at'> & { at?: number }) => JournalEntry;
  updateJournal: (id: string, patch: Partial<JournalEntry>) => void;
  deleteJournal: (id: string) => void;
  logSleep: (input: Omit<SleepEntry, 'id' | 'hours'>) => SleepEntry;
  deleteSleep: (id: string) => void;
  logExercise: (entry: Omit<ExerciseLog, 'id' | 'at'>) => void;
};

export type WellbeingState = WellbeingData & WellbeingActions;

export const initialWellbeing = (): WellbeingData => ({
  moods: [],
  journal: [],
  sleep: [],
  exercises: [],
});

const MAX_ITEMS = 2000;

export const useWellbeing = create<WellbeingState>()(
  persist(
    (set) => ({
      ...initialWellbeing(),
      addMood: (input) => {
        const entry: MoodEntry = { ...input, id: makeId('m'), at: input.at ?? Date.now() };
        set((s) => ({ moods: capList([...s.moods, entry].sort((a, b) => a.at - b.at), MAX_ITEMS) }));
        return entry;
      },
      deleteMood: (id) => set((s) => ({ moods: s.moods.filter((m) => m.id !== id) })),
      addJournal: (input) => {
        const entry: JournalEntry = { ...input, id: makeId('j'), at: input.at ?? Date.now() };
        set((s) => ({ journal: capList([...s.journal, entry], MAX_ITEMS) }));
        return entry;
      },
      updateJournal: (id, patch) =>
        set((s) => ({ journal: s.journal.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      deleteJournal: (id) => set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),
      logSleep: (input) => {
        const entry: SleepEntry = {
          ...input,
          id: makeId('s'),
          hours: sleepHours(input.bedtime, input.wake),
        };
        // One entry per morning: replace an existing one for the same date.
        set((s) => ({
          sleep: capList(
            [...s.sleep.filter((x) => x.date !== entry.date), entry].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
            MAX_ITEMS,
          ),
        }));
        return entry;
      },
      deleteSleep: (id) => set((s) => ({ sleep: s.sleep.filter((x) => x.id !== id) })),
      logExercise: (input) =>
        set((s) => ({
          exercises: capList([...s.exercises, { ...input, id: makeId('e'), at: Date.now() }], MAX_ITEMS),
        })),
    }),
    persistOptions<WellbeingState>('wellbeing', initialWellbeing),
  ),
);
