import { t } from '@/i18n';
import { timeAgoParts } from '@/utils/time';

export function timeAgo(ms: number): string {
  const { key, count } = timeAgoParts(ms);
  return key === 'now' ? t('time.ago.now') : t(`time.ago.${key}`, { count });
}

/** A friendly random alias like "Calm Otter" from the localised word lists. */
export function randomAlias(adjectives: string[], nouns: string[]): string {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)] ?? 'Kind';
  const n = nouns[Math.floor(Math.random() * nouns.length)] ?? 'Otter';
  return `${a} ${n}`;
}
