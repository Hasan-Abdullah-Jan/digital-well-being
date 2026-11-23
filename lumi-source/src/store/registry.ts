/** All persisted stores, so we can load, switch (demo/real) and reset them together. */
import { useBody } from './body';
import { useCommunityLocal } from './community';
import { useCrew } from './crew';
import { useEvidence } from './evidence';
import { useHabits } from './habits';
import { useProgress } from './progress';
import { useSettings } from './settings';
import { useWellbeing } from './wellbeing';

export const persistedStores = [useSettings, useWellbeing, useHabits, useProgress, useCommunityLocal, useEvidence, useBody, useCrew];

export async function hydrateAll(): Promise<void> {
  await Promise.all(persistedStores.map((store) => store.persist.rehydrate()));
}
