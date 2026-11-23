import type { Crew } from '@/store/types';

import { crewStatus, dayPoints, decodeCrew, editableDates, encodeCrew, leaderboard, levelFor, memberStreak, PERFECT_DAY_BONUS, teamStreak } from '../crew';

function makeCrew(): Crew {
  return {
    id: 'crew-1',
    name: 'Familie Ünal 🌞',
    createdAt: 0,
    startDate: '2026-03-01',
    days: 7,
    reward: 'Winner picks the movie',
    mode: 'versus',
    members: [
      { id: 'a', name: 'Ana', color: 0, me: true },
      { id: 'b', name: 'Bo', color: 1 },
    ],
    habits: [
      { id: 'walk', title: 'Walk', icon: 'walk-outline', points: 10 },
      { id: 'read', title: 'Read', icon: 'book-outline', points: 8 },
    ],
    log: {
      '2026-03-01': { a: ['walk', 'read'], b: ['walk'] },
      '2026-03-02': { a: ['walk'], b: ['walk', 'read'] },
      '2026-03-03': { a: ['read'] },
      '2026-02-28': { a: ['walk'] },
    },
  };
}

describe('crew scoring', () => {
  it('adds points and a perfect-day bonus, ignoring days outside the challenge', () => {
    const crew = makeCrew();
    expect(dayPoints(crew, '2026-03-01', 'a')).toBe(18 + PERFECT_DAY_BONUS);
    expect(dayPoints(crew, '2026-02-28', 'a')).toBe(0);
    const board = leaderboard(crew, '2026-03-03');
    expect(board[0].member.id).toBe('a');
    expect(board[0].points).toBe(23 + 10 + 8);
    expect(board[1].points).toBe(10 + 23);
  });

  it('counts streaks and team streaks', () => {
    const crew = makeCrew();
    expect(memberStreak(crew, 'a', '2026-03-03')).toBe(3);
    // Bo has nothing on day 3 yet, so the streak counts up to yesterday.
    expect(memberStreak(crew, 'b', '2026-03-03')).toBe(2);
    expect(teamStreak(crew, '2026-03-03')).toBe(2);
  });

  it('knows its status and which days can be edited', () => {
    const crew = makeCrew();
    expect(crewStatus(crew, '2026-02-27')).toBe('upcoming');
    expect(crewStatus(crew, '2026-03-04')).toBe('active');
    expect(crewStatus(crew, '2026-03-08')).toBe('finished');
    expect(editableDates(crew, '2026-03-01')).toEqual(['2026-03-01']);
    expect(editableDates(crew, '2026-03-05')).toEqual(['2026-03-05', '2026-03-04']);
  });

  it('works out levels', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(30).level).toBe(2);
    expect(levelFor(100).progress).toBeCloseTo((100 - 80) / 70);
  });
});

describe('crew share codes', () => {
  it('round-trips a crew, including non-English names', () => {
    const crew = makeCrew();
    const code = encodeCrew(crew);
    expect(code.startsWith('LUMI-CREW1:')).toBe(true);
    const back = decodeCrew(`Join us! ${code} see you`);
    expect(back?.name).toBe(crew.name);
    expect(back?.members.map((m) => m.name)).toEqual(['Ana', 'Bo']);
    expect(back?.log['2026-03-02']).toEqual({ a: ['walk'], b: ['walk', 'read'] });
  });

  it('rejects junk', () => {
    expect(decodeCrew('hello')).toBeNull();
    expect(decodeCrew('LUMI-CREW1:!!!!')).toBeNull();
    expect(decodeCrew('LUMI-CREW1:e30')).toBeNull();
  });
});
