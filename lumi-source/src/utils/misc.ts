/** Small helpers shared across the app. */

export function makeId(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Deterministic pick so the same item shows all day (e.g. quote of the day). */
export function pickDaily<T>(items: T[], seed: string): T | undefined {
  if (items.length === 0) return undefined;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return items[hash % items.length];
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** Keeps the newest `max` items of a list sorted oldest -> newest by `at`. */
export function capList<T>(items: T[], max: number): T[] {
  return items.length > max ? items.slice(items.length - max) : items;
}
