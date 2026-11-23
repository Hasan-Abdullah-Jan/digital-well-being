/**
 * Crew challenges: real-world habits done together with family or friends, offline.
 * Points, levels and streaks are worked out from the check-in log, so phones can
 * swap codes and merge their logs without any server.
 */
import type { Crew, CrewHabit, CrewMember } from '@/store/types';
import { addDaysToKey, dateKey, daysBetween } from '@/utils/time';

export const PERFECT_DAY_BONUS = 5;
export const MAX_MEMBERS = 8;
export const MAX_HABITS = 6;
/** Check-ins can be added for today and yesterday only, so the game stays fair. */
export const EDITABLE_DAYS = 2;

/** Points needed to reach each level (level 1 starts at 0). */
const LEVELS = [0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500, 2000];

export type CrewStatus = 'upcoming' | 'active' | 'finished';

export function endDate(crew: Crew): string {
  return addDaysToKey(crew.startDate, crew.days - 1);
}

export function crewStatus(crew: Crew, today = dateKey()): CrewStatus {
  if (today < crew.startDate) return 'upcoming';
  if (today > endDate(crew)) return 'finished';
  return 'active';
}

/** 1-based day number of the challenge (clamped to its length). */
export function dayNumber(crew: Crew, today = dateKey()): number {
  return Math.max(1, Math.min(crew.days, daysBetween(crew.startDate, today) + 1));
}

export function inRange(crew: Crew, date: string): boolean {
  return date >= crew.startDate && date <= endDate(crew);
}

/** Dates you can still tick: today and yesterday, inside the challenge. */
export function editableDates(crew: Crew, today = dateKey()): string[] {
  const out: string[] = [];
  for (let i = 0; i < EDITABLE_DAYS; i++) {
    const d = addDaysToKey(today, -i);
    if (inRange(crew, d)) out.push(d);
  }
  return out;
}

export function doneOn(crew: Crew, date: string, memberId: string): string[] {
  const valid = new Set(crew.habits.map((h) => h.id));
  return (crew.log[date]?.[memberId] ?? []).filter((h) => valid.has(h));
}

export function isPerfectDay(crew: Crew, date: string, memberId: string): boolean {
  return crew.habits.length > 0 && doneOn(crew, date, memberId).length >= crew.habits.length;
}

export function dayPoints(crew: Crew, date: string, memberId: string): number {
  if (!inRange(crew, date)) return 0;
  const done = new Set(doneOn(crew, date, memberId));
  const base = crew.habits.filter((h) => done.has(h.id)).reduce((sum, h) => sum + h.points, 0);
  return base + (isPerfectDay(crew, date, memberId) ? PERFECT_DAY_BONUS : 0);
}

function datesSoFar(crew: Crew, today = dateKey()): string[] {
  const last = today < endDate(crew) ? today : endDate(crew);
  const out: string[] = [];
  for (let d = crew.startDate; d <= last; d = addDaysToKey(d, 1)) out.push(d);
  return out;
}

/** Consecutive days (ending today, or yesterday if today isn't logged yet) with at least one habit. */
export function memberStreak(crew: Crew, memberId: string, today = dateKey()): number {
  let d = today > endDate(crew) ? endDate(crew) : today;
  if (doneOn(crew, d, memberId).length === 0) d = addDaysToKey(d, -1);
  let n = 0;
  while (inRange(crew, d) && doneOn(crew, d, memberId).length > 0) {
    n += 1;
    d = addDaysToKey(d, -1);
  }
  return n;
}

export type MemberScore = {
  member: CrewMember;
  points: number;
  perfectDays: number;
  habitsDone: number;
  streak: number;
  rank: number;
};

export function leaderboard(crew: Crew, today = dateKey()): MemberScore[] {
  const dates = datesSoFar(crew, today);
  const scores = crew.members.map((member) => {
    let points = 0;
    let perfectDays = 0;
    let habitsDone = 0;
    for (const d of dates) {
      points += dayPoints(crew, d, member.id);
      habitsDone += doneOn(crew, d, member.id).length;
      if (isPerfectDay(crew, d, member.id)) perfectDays += 1;
    }
    return { member, points, perfectDays, habitsDone, streak: memberStreak(crew, member.id, today), rank: 0 };
  });
  scores.sort((a, b) => b.points - a.points || b.perfectDays - a.perfectDays || a.member.name.localeCompare(b.member.name));
  // Shared ranks for ties.
  scores.forEach((s, i) => {
    s.rank = i > 0 && scores[i - 1].points === s.points ? scores[i - 1].rank : i + 1;
  });
  return scores;
}

export function teamPoints(crew: Crew, today = dateKey()): number {
  return leaderboard(crew, today).reduce((sum, s) => sum + s.points, 0);
}

/** A shared target that needs most habits done most days, by everyone. */
export function teamGoal(crew: Crew): number {
  const perDay = crew.habits.reduce((sum, h) => sum + h.points, 0);
  return Math.max(10, Math.round(perDay * crew.members.length * crew.days * 0.6));
}

/** Days where every member did at least one habit. */
export function teamStreak(crew: Crew, today = dateKey()): number {
  const everyone = (d: string) => crew.members.length > 0 && crew.members.every((m) => doneOn(crew, d, m.id).length > 0);
  let d = today > endDate(crew) ? endDate(crew) : today;
  if (!everyone(d)) d = addDaysToKey(d, -1);
  let n = 0;
  while (inRange(crew, d) && everyone(d)) {
    n += 1;
    d = addDaysToKey(d, -1);
  }
  return n;
}

export function levelFor(points: number): { level: number; floor: number; next: number | null; progress: number } {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) if (points >= LEVELS[i]) level = i + 1;
  const floor = LEVELS[level - 1];
  const next = level < LEVELS.length ? LEVELS[level] : null;
  return { level, floor, next, progress: next === null ? 1 : (points - floor) / (next - floor) };
}

// ----- Share codes (work fully offline: copy, message, or read aloud) -----

const PREFIX = 'LUMI-CREW1:';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Encode(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let c: number;
    if (b < 0x80) {
      c = b;
      i += 1;
    } else if (b < 0xe0) {
      c = ((b & 31) << 6) | (bytes[i + 1] & 63);
      i += 2;
    } else if (b < 0xf0) {
      c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
      i += 3;
    } else {
      c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      i += 4;
    }
    out += String.fromCodePoint(c);
  }
  return out;
}

function toBase64Url(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

function fromBase64Url(text: string): number[] {
  const clean = text.replace(/\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4);
    const vals = Array.from(chunk).map((ch) => {
      const v = B64.indexOf(ch);
      if (v < 0) throw new Error('bad code');
      return v;
    });
    const n = (vals[0] << 18) | ((vals[1] ?? 0) << 12) | ((vals[2] ?? 0) << 6) | (vals[3] ?? 0);
    bytes.push((n >> 16) & 255);
    if (vals.length > 2) bytes.push((n >> 8) & 255);
    if (vals.length > 3) bytes.push(n & 255);
  }
  return bytes;
}

type Packed = {
  v: 1;
  i: string;
  n: string;
  s: string;
  d: number;
  r: string;
  o: Crew['mode'];
  m: [string, string, number][];
  h: [string, string, string, number][];
  /** date -> member index -> habit indexes */
  l: Record<string, Record<string, number[]>>;
};

export function encodeCrew(crew: Crew): string {
  const habitIndex = new Map(crew.habits.map((h, i) => [h.id, i]));
  const memberIndex = new Map(crew.members.map((m, i) => [m.id, i]));
  const l: Packed['l'] = {};
  for (const [date, members] of Object.entries(crew.log)) {
    const day: Record<string, number[]> = {};
    for (const [memberId, habits] of Object.entries(members)) {
      const mi = memberIndex.get(memberId);
      const hs = habits.map((h) => habitIndex.get(h)).filter((x): x is number => x !== undefined);
      if (mi !== undefined && hs.length) day[String(mi)] = hs;
    }
    if (Object.keys(day).length) l[date] = day;
  }
  const packed: Packed = {
    v: 1,
    i: crew.id,
    n: crew.name,
    s: crew.startDate,
    d: crew.days,
    r: crew.reward,
    o: crew.mode,
    m: crew.members.map((m) => [m.id, m.name, m.color]),
    h: crew.habits.map((h) => [h.id, h.title, h.icon, h.points]),
    l,
  };
  return PREFIX + toBase64Url(utf8Encode(JSON.stringify(packed)));
}

const clip = (value: unknown, max: number) => String(value ?? '').slice(0, max);

/** Reads a share code. Returns null for anything that isn't a valid Lumi crew code. */
export function decodeCrew(code: string): Omit<Crew, 'createdAt'> | null {
  try {
    const start = code.indexOf(PREFIX);
    if (start < 0) return null;
    const body = code.slice(start + PREFIX.length).trim().split(/\s/)[0];
    const p = JSON.parse(utf8Decode(fromBase64Url(body))) as Packed;
    if (p.v !== 1 || !p.i || !/^\d{4}-\d{2}-\d{2}$/.test(p.s) || !Array.isArray(p.m) || !Array.isArray(p.h)) return null;
    const members: CrewMember[] = p.m.slice(0, MAX_MEMBERS).map(([id, name, color]) => ({ id: clip(id, 40), name: clip(name, 24), color: Number(color) || 0 }));
    const habits: CrewHabit[] = p.h.slice(0, MAX_HABITS).map(([id, title, icon, points]) => ({
      id: clip(id, 40),
      title: clip(title, 60),
      icon: clip(icon, 40) || 'checkmark-circle-outline',
      points: Math.max(1, Math.min(50, Number(points) || 10)),
    }));
    const log: Crew['log'] = {};
    for (const [date, day] of Object.entries(p.l ?? {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const out: Record<string, string[]> = {};
      for (const [mi, hs] of Object.entries(day)) {
        const member = members[Number(mi)];
        if (!member || !Array.isArray(hs)) continue;
        out[member.id] = hs.map((h) => habits[h]?.id).filter((x): x is string => !!x);
      }
      log[date] = out;
    }
    return {
      id: clip(p.i, 40),
      name: clip(p.n, 40),
      startDate: p.s,
      days: Math.max(1, Math.min(60, Number(p.d) || 7)),
      reward: clip(p.r, 80),
      mode: p.o === 'team' ? 'team' : 'versus',
      members,
      habits,
      log,
    };
  } catch {
    return null;
  }
}

/** Member colours: mid-tone so they read on light and dark backgrounds. */
export const CREW_COLORS = ['#2A8C83', '#E07A5F', '#5B7FDB', '#C9A227', '#9C6ADE', '#3FA37A', '#D35D8C', '#4AA3C3'];

export function memberColor(member: CrewMember): string {
  return CREW_COLORS[Math.abs(member.color) % CREW_COLORS.length];
}
