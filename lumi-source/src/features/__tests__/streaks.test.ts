import { currentStreakLength, isLoggedToday, longestRun, totalKeptDays } from '@/features/streaks';

describe('streaks', () => {
  const today = '2026-11-06';

  it('counts consecutive kept days ending today or yesterday', () => {
    const log = { '2026-11-03': true, '2026-11-04': true, '2026-11-05': true };
    expect(currentStreakLength({ log }, today)).toBe(3);
    expect(currentStreakLength({ log: { ...log, [today]: true } }, today)).toBe(4);
  });

  it('a slip means a fresh start, but kept days still count in total', () => {
    const log = { '2026-11-03': true, '2026-11-04': true, '2026-11-05': true, [today]: false };
    expect(currentStreakLength({ log }, today)).toBe(0);
    expect(totalKeptDays({ log })).toBe(3);
    expect(isLoggedToday({ log }, today)).toBe(true);
  });

  it('finds the longest run', () => {
    const log = { '2026-11-01': true, '2026-11-02': true, '2026-11-03': false, '2026-11-04': true, '2026-11-06': true };
    expect(longestRun({ log })).toBe(2);
  });
});
