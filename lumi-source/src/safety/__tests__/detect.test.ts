import content from '@/i18n/locales/en/content.json';
import { checkCommunityText, containsDistress, normalise, shouldOfferLowMoodSupport } from '@/safety/detect';
import type { MoodEntry } from '@/store/types';

const phrases = content.safety.distressPhrases;
const blockedWords = content.safety.blockedWords;

describe('containsDistress', () => {
  it.each([
    'I want to die',
    'sometimes i think about suicide',
    "I don’t want to be here anymore",
    'Everyone would be better off without me.',
    'I keep cutting myself',
    'thinking about self-harm again',
    'I just want to END IT ALL!!!',
  ])('notices "%s"', (text) => {
    expect(containsDistress(text, phrases)).toBe(true);
  });

  it.each(['I died laughing at that video', 'This homework is killing me', 'I had a great day', 'kill the lights please', ''])(
    'does not trigger on "%s"',
    (text) => {
      expect(containsDistress(text, phrases)).toBe(false);
    },
  );

  it('keeps letters from other scripts when normalising', () => {
    expect(normalise('Привет, мир!')).toContain('привет');
    expect(normalise('مرحبا!')).toContain('مرحبا');
  });
});

describe('checkCommunityText', () => {
  const check = (text: string) => checkCommunityText(text, { maxLength: 500, blockedWords });

  it('accepts a kind, anonymous post', () => {
    expect(check('Feeling a bit lonely at school this week. Any tips?')).toEqual([]);
  });

  it('blocks contact details, links and handles to protect anonymity', () => {
    expect(check('text me on 0123 456 789')).toContain('contact');
    expect(check('email me: someone@example.com')).toContain('contact');
    expect(check('see www.example.com')).toContain('link');
    expect(check('follow @my.real.name')).toContain('handle');
  });

  it('blocks harassment aimed at others but not self-talk', () => {
    expect(check('kys')).toContain('hurtful');
    expect(check("you're ugly")).toContain('hurtful');
    expect(check('I feel ugly today')).toEqual([]);
  });

  it('flags empty and too long text', () => {
    expect(check('   ')).toEqual(['empty']);
    expect(checkCommunityText('a'.repeat(20), { maxLength: 10, blockedWords })).toContain('too-long');
  });

  it('does not treat years or small numbers as phone numbers', () => {
    expect(check('Since 2024 I have tried 3 times')).toEqual([]);
  });
});

describe('shouldOfferLowMoodSupport', () => {
  const now = Date.UTC(2026, 10, 6, 12);
  const mood = (daysAgo: number, score: 1 | 2 | 3 | 4 | 5): MoodEntry => ({
    id: String(daysAgo),
    at: now - daysAgo * 86400000,
    score,
    emotions: [],
    context: 'general',
  });

  it('offers support after several low check-ins', () => {
    expect(shouldOfferLowMoodSupport([mood(4, 2), mood(3, 1), mood(2, 4), mood(1, 2)], undefined, now)).toBe(true);
  });

  it('stays quiet when moods are mixed or recently offered', () => {
    expect(shouldOfferLowMoodSupport([mood(3, 2), mood(2, 4), mood(1, 5)], undefined, now)).toBe(false);
    expect(shouldOfferLowMoodSupport([mood(3, 1), mood(2, 1), mood(1, 1)], now - 86400000, now)).toBe(false);
  });
});
