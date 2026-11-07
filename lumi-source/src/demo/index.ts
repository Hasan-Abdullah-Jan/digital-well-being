/**
 * Demo mode: a separate data space filled with fictional data.
 * Turning it off deletes the demo data and brings back your own data untouched.
 */
import { appConfig } from '@/config';
import { useApp } from '@/store/app';
import { hydrateAll } from '@/store/registry';
import { useSettings } from '@/store/settings';
import { clearNamespace, loadMeta, saveMeta, setDemoNamespace } from '@/store/storage';

import { seedDemoData } from './seed';

/** Loads the right data space at startup. */
export async function bootstrapData(): Promise<void> {
  const meta = await loadMeta();
  const demo = appConfig.features.demoOnly || meta.demoMode;
  setDemoNamespace(demo);
  await hydrateAll();
  useApp.getState().setDemoMode(demo);
  if (demo && !useSettings.getState().onboarded) seedDemoData();
}

export async function enterDemoMode(): Promise<void> {
  setDemoNamespace(true);
  await saveMeta({ demoMode: true });
  await hydrateAll();
  useApp.getState().setDemoMode(true);
  if (!useSettings.getState().onboarded) seedDemoData();
}

export async function exitDemoMode(): Promise<void> {
  await clearNamespace(true);
  setDemoNamespace(false);
  await saveMeta({ demoMode: false });
  await hydrateAll();
  useApp.getState().setDemoMode(false);
}

export async function resetDemoData(): Promise<void> {
  await clearNamespace(true);
  await hydrateAll();
  seedDemoData();
}

export const demoLocked = appConfig.features.demoOnly;
