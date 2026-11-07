import { addDaysToKey, dateKey, hhmmToMinutes, isWithinWindow, minutesToHHMM, sleepHours, startOfWeek, weekDays } from '@/utils/time';

describe('time helpers', () => {
  it('converts clock strings', () => {
    expect(hhmmToMinutes('07:30')).toBe(450);
    expect(minutesToHHMM(450)).toBe('07:30');
    expect(minutesToHHMM(-30)).toBe('23:30');
    expect(minutesToHHMM(1500)).toBe('01:00');
  });

  it('handles windows that cross midnight', () => {
    const start = hhmmToMinutes('22:00');
    const end = hhmmToMinutes('07:00');
    expect(isWithinWindow(hhmmToMinutes('23:15'), start, end)).toBe(true);
    expect(isWithinWindow(hhmmToMinutes('06:59'), start, end)).toBe(true);
    expect(isWithinWindow(hhmmToMinutes('12:00'), start, end)).toBe(false);
    expect(isWithinWindow(hhmmToMinutes('16:00'), hhmmToMinutes('16:00'), hhmmToMinutes('18:00'))).toBe(true);
    expect(isWithinWindow(hhmmToMinutes('18:00'), hhmmToMinutes('16:00'), hhmmToMinutes('18:00'))).toBe(false);
  });

  it('calculates sleep across midnight', () => {
    expect(sleepHours('23:30', '07:15')).toBe(7.75);
    expect(sleepHours('01:00', '09:00')).toBe(8);
  });

  it('starts weeks on Monday', () => {
    const sunday = new Date(2026, 10, 8); // Sunday 8 Nov 2026
    expect(dateKey(startOfWeek(sunday))).toBe('2026-11-02');
    expect(weekDays('2026-11-02')).toHaveLength(7);
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });
});
