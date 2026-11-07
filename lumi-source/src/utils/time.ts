/** Date helpers. All "date keys" are local calendar days in the form YYYY-MM-DD. */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dateKey(date: Date | number = new Date()): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(date: Date | number = new Date()): Date {
  const d = new Date(typeof date === 'number' ? date : date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function addDaysToKey(key: string, days: number): string {
  return dateKey(addDays(parseDateKey(key), days));
}

/** Weeks start on Monday. */
export function startOfWeek(date: Date | number = new Date()): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function weekKey(date: Date | number = new Date()): string {
  return dateKey(startOfWeek(date));
}

/** The 7 date keys (Mon..Sun) of the week that starts on weekStartKey. */
export function weekDays(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStartKey, i));
}

export function lastNDays(n: number, end: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => dateKey(addDays(end, i - (n - 1))));
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey).getTime();
  const b = parseDateKey(toKey).getTime();
  return Math.round((b - a) / DAY);
}

/** "HH:MM" -> minutes after midnight. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return ((h || 0) % 24) * 60 + ((m || 0) % 60);
}

export function minutesToHHMM(total: number): string {
  const normalised = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalised / 60))}:${pad(normalised % 60)}`;
}

export function minutesOfDay(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** True if `now` (minutes) is inside [start, end). Handles windows that cross midnight. */
export function isWithinWindow(now: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

/** Hours slept between bedtime and wake time ("23:30" -> "07:15" = 7.75). */
export function sleepHours(bedtime: string, wake: string): number {
  const start = hhmmToMinutes(bedtime);
  let end = hhmmToMinutes(wake);
  if (end <= start) end += 1440;
  return Math.round(((end - start) / 60) * 100) / 100;
}

/** Formats a clock time using the device locale (12 h or 24 h automatically). */
export function formatClock(hhmm: string, locale?: string): string {
  const minutes = hhmmToMinutes(hhmm);
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return hhmm;
  }
}

export function formatDate(
  date: Date | number | string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
  locale?: string,
): string {
  const d = typeof date === 'string' ? parseDateKey(date) : new Date(date);
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return dateKey(d);
  }
}

/** Formats a timestamp as a clock time in the device locale. */
export function formatTime(ms: number, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  } catch {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

export function formatWeekdayShort(key: string, locale?: string): string {
  return formatDate(key, { weekday: 'narrow' }, locale);
}

/** Splits minutes into hours and minutes for display. */
export function splitMinutes(totalMinutes: number): { h: number; m: number } {
  const rounded = Math.max(0, Math.round(totalMinutes));
  return { h: Math.floor(rounded / 60), m: rounded % 60 };
}

/** Rough "time ago" parts for display with i18n keys (time.ago.*). */
export function timeAgoParts(ms: number, now = Date.now()): { key: 'now' | 'minutes' | 'hours' | 'days'; count: number } {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return { key: 'now', count: 0 };
  if (diff < HOUR) return { key: 'minutes', count: Math.floor(diff / MINUTE) };
  if (diff < DAY) return { key: 'hours', count: Math.floor(diff / HOUR) };
  return { key: 'days', count: Math.floor(diff / DAY) };
}
