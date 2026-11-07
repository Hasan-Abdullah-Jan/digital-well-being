import { greetingKey, nextWindow } from '@/features/selectors';
import type { PhoneFreeWindow } from '@/store/types';

const study: PhoneFreeWindow = { id: 'w1', kind: 'study', label: 'Study', days: [1, 2, 3, 4, 5], start: '16:00', end: '18:00', enabled: true, lockApps: true };
const sleep: PhoneFreeWindow = { id: 'w2', kind: 'sleep', label: 'Sleep', days: [0, 1, 2, 3, 4, 5, 6], start: '22:30', end: '07:00', enabled: true, lockApps: true };

describe('nextWindow', () => {
  it('finds an active window', () => {
    const wednesday5pm = new Date(2026, 10, 4, 17, 0);
    expect(nextWindow([study], wednesday5pm)).toMatchObject({ active: true, window: { id: 'w1' } });
  });

  it('treats an overnight window as active after midnight', () => {
    const thursday2am = new Date(2026, 10, 5, 2, 0);
    expect(nextWindow([sleep], thursday2am)).toMatchObject({ active: true, window: { id: 'w2' } });
  });

  it('finds the next window when none is active', () => {
    const saturdayNoon = new Date(2026, 10, 7, 12, 0);
    const next = nextWindow([study], saturdayNoon);
    expect(next?.active).toBe(false);
    expect(next?.startsAt.getDay()).toBe(1);
  });

  it('ignores disabled windows', () => {
    expect(nextWindow([{ ...study, enabled: false }], new Date(2026, 10, 4, 17))).toBeNull();
  });
});

describe('greetingKey', () => {
  it('follows the time of day', () => {
    expect(greetingKey(new Date(2026, 0, 1, 8))).toBe('morning');
    expect(greetingKey(new Date(2026, 0, 1, 14))).toBe('afternoon');
    expect(greetingKey(new Date(2026, 0, 1, 20))).toBe('evening');
    expect(greetingKey(new Date(2026, 0, 1, 2))).toBe('night');
  });
});
