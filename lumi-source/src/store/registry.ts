/** All persisted stores, so we can load, switch (demo/real) and reset them together. */
import { useCommunityLocal } from './community';
import { useEvidence } from './evidence';
import { useHabits } from './habits';
import { useProgress } from './progress';
import { useSettings } from './settings';
import { useWellbeing } from './wellbeing';

export const persistedStores = [useSettings, useWellbeing, useHabits, useProgress, useCommunityLocal, useEvidence];

export async function hydrateAll(): Promise<void> {
  await Promise.all(persistedStores.map((store) => store.persist.rehydrate()));
}
