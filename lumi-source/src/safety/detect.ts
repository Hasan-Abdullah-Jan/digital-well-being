/**
 * On-device text checks. Nothing you type is sent anywhere to be scanned.
 *
 * 1. containsDistress(): spots phrases that may signal someone is struggling, so the app can
 *    gently offer real-person help. It never blocks writing and never alerts anyone.
 * 2. checkCommunityText(): protects anonymity and kindness in the peer space before posting.
 *
 * Keyword checks are imperfect (they miss things and sometimes over-trigger). That is why
 * the response is always a kind offer of help, and the peer space is also human-moderated.
 */
import type { MoodEntry } from '@/store/types';
import { DAY } from '@/utils/time';

export function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    // Strip punctuation but keep letters of every script (works on all JS engines).
    .replace(/[.,!?;:"()[\]{}<>/\\|*_~`^+=#$%&@-]/g, ' ')
    .replace(/[ -⁯⸀-⹿　-〿«»¿¡]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

export function containsDistress(text: string, phrases: string[]): boolean {
  if (!text || text.trim().length < 3) return false;
  const haystack = normalise(text);
  return phrases.some((phrase) => {
    const needle = normalise(phrase);
    return needle.trim().length > 0 && haystack.includes(needle);
  });
}

export type TextIssue = 'empty' | 'too-long' | 'contact' | 'link' | 'handle' | 'hurtful';

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const LINK = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|gg|me|ly|app|co|tv|link|xyz|info)\b/i;
const HANDLE = /(^|\s)@[\w.]{3,}/;
const PHONE_CANDIDATE = /\+?\d[\d\s().-]{5,}\d/g;

function hasPhoneNumber(text: string): boolean {
  const matches = text.match(PHONE_CANDIDATE) ?? [];
  return matches.some((m) => m.replace(/\D/g, '').length >= 7);
}

export function checkCommunityText(
  text: string,
  options: { maxLength: number; blockedWords: string[] },
): TextIssue[] {
  const issues: TextIssue[] = [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return ['empty'];
  if (trimmed.length > options.maxLength) issues.push('too-long');
  if (EMAIL.test(trimmed) || hasPhoneNumber(trimmed)) issues.push('contact');
  if (LINK.test(trimmed)) issues.push('link');
  if (HANDLE.test(trimmed)) issues.push('handle');
  const haystack = normalise(trimmed);
  if (options.blockedWords.some((w) => haystack.includes(normalise(w)))) issues.push('hurtful');
  return issues;
}

/**
 * Offer support (gently, at most every 3 days) when 3 of the last 5 check-ins
 * from the past week were "rough" or "low".
 */
export function shouldOfferLowMoodSupport(moods: MoodEntry[], lastShownAt: number | undefined, now = Date.now()): boolean {
  if (lastShownAt && now - lastShownAt < 3 * DAY) return false;
  const recent = moods.filter((m) => now - m.at < 7 * DAY).slice(-5);
  if (recent.length < 3) return false;
  return recent.filter((m) => m.score <= 2).length >= 3;
}
