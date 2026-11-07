/**
 * Persistence for all on-device stores.
 *
 * Demo mode uses a separate key namespace ("demo:...") so trying the demo never
 * overwrites or mixes with your real data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type PersistOptions } from 'zustand/middleware';

const META_KEY = 'lumi.meta';
const DEMO_PREFIX = 'demo:';
export const STORE_PREFIX = 'lumi.';

let demoNamespace = false;

export function isDemoNamespace(): boolean {
  return demoNamespace;
}

export function setDemoNamespace(value: boolean): void {
  demoNamespace = value;
}

const prefix = () => (demoNamespace ? DEMO_PREFIX : '');

const namespacedAsyncStorage = {
  getItem: (name: string) => AsyncStorage.getItem(prefix() + name),
  setItem: (name: string, value: string) => AsyncStorage.setItem(prefix() + name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(prefix() + name),
};

export type Meta = { demoMode: boolean };

export async function loadMeta(): Promise<Meta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return { demoMode: false };
    const parsed = JSON.parse(raw) as Partial<Meta>;
    return { demoMode: parsed.demoMode === true };
  } catch {
    return { demoMode: false };
  }
}

export async function saveMeta(meta: Meta): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

/** Removes every key of the given namespace (demo or real). */
export async function clearNamespace(demo: boolean): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((key) =>
    demo ? key.startsWith(DEMO_PREFIX) : key.startsWith(STORE_PREFIX) && key !== META_KEY,
  );
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}

/**
 * Standard persist options. `merge` starts from the initial data so that switching
 * namespaces (demo <-> real) fully replaces the data instead of mixing it.
 */
export function persistOptions<T extends object>(
  name: string,
  initialData: () => Partial<T>,
  version = 1,
): PersistOptions<T, T> {
  return {
    name: STORE_PREFIX + name,
    storage: createJSONStorage<T>(() => namespacedAsyncStorage),
    version,
    skipHydration: true,
    // Keep old data when the schema version changes; add field-level upgrades here if needed.
    migrate: (persisted) => persisted as T,
    merge: (persisted, current) => ({
      ...current,
      ...initialData(),
      ...((persisted as Partial<T> | undefined) ?? {}),
    }),
  };
}
