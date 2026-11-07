/**
 * Tiny localisation layer (no extra library).
 *
 * - UI strings live in locales/<code>/ui.json, longer content in locales/<code>/content.json.
 * - t('today.checkedIn', { mood }) looks up a dot path and fills {{mood}}.
 * - Plurals: pass { count } and add keys ending in _one / _other (or any CLDR category
 *   such as _few / _many for languages that need them).
 * - Missing keys fall back to English, so a partial translation never breaks the app.
 * See src/i18n/README.md to add a language.
 */
import { useSyncExternalStore } from 'react';
import { I18nManager } from 'react-native';

import enContent from './locales/en/content.json';
import enUi from './locales/en/ui.json';

export type Content = typeof enContent;
type Dict = Record<string, unknown>;

export type LanguageInfo = { code: string; label: string; rtl: boolean };

/** Add new languages here after creating their JSON files. */
export const LANGUAGES: LanguageInfo[] = [{ code: 'en', label: 'English', rtl: false }];

const ui: Record<string, Dict> = { en: enUi as Dict };
const contents: Record<string, Partial<Content>> = { en: enContent };

let current = 'en';
const listeners = new Set<() => void>();
let mergedContentCache: { lang: string; value: Content } | null = null;

export function supportedLanguage(code: string | null | undefined): string {
  if (!code) return 'en';
  const short = code.toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.some((l) => l.code === short) ? short : 'en';
}

export function getLanguage(): string {
  return current;
}

export function setLanguage(code: string): void {
  const next = supportedLanguage(code);
  if (next === current) return;
  current = next;
  mergedContentCache = null;
  const info = LANGUAGES.find((l) => l.code === next);
  // RTL languages need a reload to flip layout; we only allow it so the change applies next start.
  if (info) I18nManager.allowRTL(info.rtl);
  listeners.forEach((listener) => listener());
}

function lookup(dict: Dict | undefined, path: string): unknown {
  if (!dict) return undefined;
  let node: unknown = dict;
  for (const part of path.split('.')) {
    if (node && typeof node === 'object' && part in (node as Dict)) {
      node = (node as Dict)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

function pluralCategory(lang: string, count: number): string {
  try {
    return new Intl.PluralRules(lang).select(count);
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type TParams = Record<string, string | number>;

export function t(key: string, params?: TParams): string {
  const langs = current === 'en' ? ['en'] : [current, 'en'];
  if (params && typeof params.count === 'number') {
    for (const lang of langs) {
      const category = pluralCategory(lang, params.count);
      const plural = lookup(ui[lang], `${key}_${category}`) ?? lookup(ui[lang], `${key}_other`);
      if (typeof plural === 'string') return interpolate(plural, params);
    }
  }
  for (const lang of langs) {
    const value = lookup(ui[lang], key);
    if (typeof value === 'string') return interpolate(value, params);
  }
  if (__DEV__) console.warn(`[i18n] Missing key: ${key}`);
  return key;
}

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(override) && override.length > 0 ? override : base) as T;
  }
  if (base && typeof base === 'object') {
    const result: Dict = { ...(base as Dict) };
    if (override && typeof override === 'object') {
      for (const [k, v] of Object.entries(override as Dict)) {
        result[k] = k in result ? deepMerge(result[k], v) : v;
      }
    }
    return result as T;
  }
  return (override ?? base) as T;
}

/** Long-form content for the current language, with English filling any gaps. */
export function getContent(): Content {
  if (mergedContentCache && mergedContentCache.lang === current) return mergedContentCache.value;
  const value = current === 'en' ? enContent : deepMerge(enContent, contents[current]);
  mergedContentCache = { lang: current, value };
  return value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the component when the language changes. */
export function useT(): { t: typeof t; lang: string } {
  const lang = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return { t, lang };
}

export function useContent(): Content {
  useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return getContent();
}
