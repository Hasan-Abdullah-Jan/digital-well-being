import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { makeId } from '@/utils/misc';

import { persistOptions } from './storage';
import type { EvidenceEntry } from './types';

/** Private, on-device log of online harassment (for showing a trusted adult or a platform). */
export type EvidenceData = { entries: EvidenceEntry[] };

type EvidenceActions = {
  add: (entry: Omit<EvidenceEntry, 'id'>) => EvidenceEntry;
  update: (id: string, patch: Partial<EvidenceEntry>) => void;
  remove: (id: string) => void;
};

export type EvidenceState = EvidenceData & EvidenceActions;

export const initialEvidence = (): EvidenceData => ({ entries: [] });

export const useEvidence = create<EvidenceState>()(
  persist(
    (set) => ({
      ...initialEvidence(),
      add: (input) => {
        const entry: EvidenceEntry = { ...input, id: makeId('ev') };
        set((s) => ({ entries: [...s.entries, entry].sort((a, b) => a.at - b.at) }));
        return entry;
      },
      update: (id, patch) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    persistOptions<EvidenceState>('evidence', initialEvidence),
  ),
);
