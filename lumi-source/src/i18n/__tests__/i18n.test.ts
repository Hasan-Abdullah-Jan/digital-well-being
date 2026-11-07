import { getContent, supportedLanguage, t } from '@/i18n';

describe('i18n', () => {
  it('interpolates values', () => {
    expect(t('today.greeting.morningName', { name: 'Sam' })).toBe('Good morning, Sam');
  });

  it('picks plural forms', () => {
    expect(t('streaks.days', { count: 1 })).toBe('1 day in a row');
    expect(t('streaks.days', { count: 3 })).toBe('3 days in a row');
  });

  it('returns the key itself when a string is missing', () => {
    expect(t('this.key.does.not.exist')).toBe('this.key.does.not.exist');
  });

  it('falls back to English for unsupported languages', () => {
    expect(supportedLanguage('xx-YY')).toBe('en');
    expect(supportedLanguage('en-GB')).toBe('en');
  });

  it('ships complete, id-based content', () => {
    const c = getContent();
    const ids = c.guides.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(c.badges.length).toBeGreaterThanOrEqual(20);
    expect(c.safety.distressPhrases.length).toBeGreaterThan(10);
  });
});
