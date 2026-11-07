/**
 * Demo data: three weeks of realistic, fictional activity so the app can be shown
 * without anyone's real data. Values are generated relative to "today".
 */
import { getContent } from '@/i18n';
import { useCommunityLocal } from '@/store/community';
import { useEvidence } from '@/store/evidence';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import type {
  DailyUsage,
  ExerciseLog,
  GamingSession,
  GuardEvent,
  JournalEntry,
  MoodEntry,
  MoodScore,
  SleepEntry,
  Streak,
} from '@/store/types';
import { useWellbeing } from '@/store/wellbeing';
import type { AnonNote, CommunityEvent, NoteMessage, PeerPost, PeerReply } from '@/services/community/types';
import { longestRun } from '@/features/streaks';
import { clamp, makeId } from '@/utils/misc';
import { addDays, dateKey, HOUR, lastNDays, minutesToHHMM, parseDateKey, sleepHours, startOfDay } from '@/utils/time';

/** Small seeded random generator so the demo looks the same every time. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 21;

export function seedDemoData(): void {
  const c = getContent();
  const demo = c.demo;
  const rand = rng(42);
  const dates = lastNDays(DAYS);
  const today = dateKey();
  const now = Date.now();

  // ---------- Settings ----------
  useSettings.getState().update({
    onboarded: true,
    onboardedAt: now - DAYS * 24 * HOUR,
    nickname: demo.nickname,
    concerns: ['scrolling', 'sleep', 'comparison', 'stress'],
    goals: ['scroll-less', 'sleep-better', 'connect'],
    bedtime: '22:45',
    wakeTime: '07:00',
    checkinTime: '20:00',
    alias: demo.alias,
    watchedApps: [demo.apps[0].packageName, demo.apps[1].packageName],
  });

  // ---------- Sleep, usage and mood (linked, so insights find patterns) ----------
  const sleep: SleepEntry[] = [];
  const usage: DailyUsage[] = [];
  const moods: MoodEntry[] = [];
  const emotionsGood = ['calm', 'happy', 'grateful', 'hopeful', 'proud', 'excited'];
  const emotionsLow = ['tired', 'stressed', 'anxious', 'lonely', 'bored', 'left-out', 'overwhelmed'];

  dates.forEach((date, i) => {
    const progress = i / (DAYS - 1); // 0 -> 1 over three weeks: things slowly improve
    const isWeekend = [0, 6].includes(parseDateKey(date).getDay());

    // Sleep: later bedtimes early on, steadier later.
    const bedMinutes = 23 * 60 + 40 - Math.round(progress * 55) + Math.round((rand() - 0.5) * 70) + (isWeekend ? 35 : 0);
    const wakeMinutes = 7 * 60 + Math.round((rand() - 0.3) * 30) + (isWeekend ? 60 : 0);
    const bedtime = minutesToHHMM(bedMinutes);
    const wake = minutesToHHMM(wakeMinutes);
    const hours = sleepHours(bedtime, wake);
    sleep.push({ id: makeId('s'), date, bedtime, wake, hours, quality: clamp(Math.round(hours - 3.5 + rand()), 1, 5) as SleepEntry['quality'] });

    // Screen time trending down from ~5h to ~3.3h.
    const total = Math.round(300 - progress * 100 + (rand() - 0.5) * 70 + (isWeekend ? 40 : 0));
    const isToday = date === today;
    const dayTotal = isToday ? Math.round(total * 0.55) : total;
    const shares = [0.34, 0.24, 0.16, 0.12, 0.08, 0.06];
    usage.push({
      date,
      totalMinutes: dayTotal,
      pickups: Math.round(70 - progress * 25 + rand() * 12),
      source: 'demo',
      apps: demo.apps.map((app, idx) => ({
        packageName: app.packageName,
        label: app.label,
        category: app.category,
        minutes: Math.round(dayTotal * shares[idx] * (0.85 + rand() * 0.3)),
        opens: Math.round((idx === 0 ? 28 : 12 - idx) * (1 - progress * 0.35) + rand() * 4),
      })),
    });

    // Mood: better with more sleep and less screen time, plus some randomness.
    const raw = 2.6 + (hours - 6.8) * 0.55 - (total - 240) / 160 + (rand() - 0.5) * 1.2 + progress * 0.4;
    const score = clamp(Math.round(raw), 1, 5) as MoodScore;
    const eveningAt = parseDateKey(date).getTime() + (19 + rand() * 2) * HOUR;
    if (!isToday || new Date().getHours() >= 20) {
      const pool = score >= 4 ? emotionsGood : score <= 2 ? emotionsLow : [...emotionsGood.slice(0, 2), ...emotionsLow.slice(0, 3)];
      moods.push({
        id: makeId('m'),
        at: eveningAt,
        score,
        emotions: [pool[Math.floor(rand() * pool.length)], pool[Math.floor(rand() * pool.length)]].filter((v, k, arr) => arr.indexOf(v) === k),
        context: 'general',
      });
    }
    // After-scroll check-ins every few days.
    if (i % 3 === 1) {
      const feelings = ['drained', 'same', 'worse-about-me', 'better', 'anxious', 'left-out', 'inspired'];
      const feeling = feelings[i % feelings.length];
      const f = c.afterScrollFeelings.find((x) => x.id === feeling)!;
      moods.push({
        id: makeId('m'),
        at: parseDateKey(date).getTime() + 22.5 * HOUR,
        score: f.score as MoodScore,
        emotions: [],
        context: 'after-scroll',
        feeling,
        app: demo.apps[i % 2].label,
      });
    }
  });

  const exercises: ExerciseLog[] = [2, 5, 6, 9, 12, 15, 17, 19].map((d, k) => ({
    id: makeId('e'),
    at: parseDateKey(dates[d]).getTime() + 21 * HOUR,
    kind: k % 3 === 0 ? 'grounding' : 'breathing',
    detail: k % 3 === 0 ? '54321' : 'calm',
    seconds: 120,
  }));

  const journal: JournalEntry[] = [
    ...demo.gratitude.map((text, k) => ({
      id: makeId('j'),
      at: parseDateKey(dates[3 + k * 3]).getTime() + 21.5 * HOUR,
      type: 'gratitude' as const,
      text,
    })),
    ...demo.wins.map((text, k) => ({
      id: makeId('j'),
      at: parseDateKey(dates[2 + k * 4]).getTime() + 20 * HOUR,
      type: 'win' as const,
      text,
    })),
    ...demo.reflections.map((text) => ({
      id: makeId('j'),
      at: parseDateKey(dates[DAYS - 8]).getTime() + 19 * HOUR,
      type: 'reflection' as const,
      text,
    })),
    {
      id: makeId('j'),
      at: parseDateKey(dates[DAYS - 3]).getTime() + 22 * HOUR,
      type: 'worry' as const,
      text: 'Presentation on Thursday. The part I can control: practise twice and sleep well.',
      closed: true,
    },
  ].sort((a, b) => a.at - b.at);

  useWellbeing.setState({ moods: moods.sort((a, b) => a.at - b.at), sleep, journal, exercises });

  // ---------- Habits ----------
  const gaming: GamingSession[] = [];
  dates.slice(0, DAYS - 1).forEach((date, i) => {
    if (i % 2 !== 0) return;
    const minutes = [45, 120, 60, 95, 30, 150, 50, 40, 70, 35][i % 10];
    const start = parseDateKey(date).getTime() + 17 * HOUR;
    const long = minutes >= 90;
    const moodId = long ? (i % 4 === 0 ? 'tired' : 'want-more') : i % 3 === 0 ? 'energised' : 'happy';
    gaming.push({
      id: makeId('g'),
      startedAt: start,
      endedAt: start + minutes * 60_000,
      plannedMinutes: long ? 60 : minutes,
      game: 'PixelQuest',
      moodAfter: moodId,
      moodScore: c.gameMoods.find((g) => g.id === moodId)?.score,
    });
  });

  const focusSessions = [1, 3, 6, 8, 11, 13, 16, 18].map((d, k) => {
    const start = parseDateKey(dates[d]).getTime() + 16.5 * HOUR;
    const completed = k !== 2;
    return { id: makeId('f'), startedAt: start, plannedMinutes: 25, endedAt: start + (completed ? 25 : 12) * 60_000, completed, label: 'Revision' };
  });

  const guardEvents: GuardEvent[] = [];
  dates.slice(DAYS - 10).forEach((date, i) => {
    const base = parseDateKey(date).getTime();
    guardEvents.push({ at: base + 21 * HOUR, packageName: demo.apps[0].packageName, label: demo.apps[0].label, reason: 'pause', choice: i % 3 === 0 ? 'continued' : 'closed' });
    if (i % 2 === 0) {
      guardEvents.push({ at: base + 23 * HOUR, packageName: demo.apps[1].packageName, label: demo.apps[1].label, reason: 'bedtime', choice: 'closed' });
    }
  });

  useHabits.setState({
    limits: [
      { id: makeId('l'), packageName: demo.apps[0].packageName, label: demo.apps[0].label, minutesPerDay: 45, pauseOnOpen: true, enabled: true },
      { id: makeId('l'), packageName: demo.apps[1].packageName, label: demo.apps[1].label, minutesPerDay: 60, pauseOnOpen: false, enabled: true },
      { id: makeId('l'), packageName: demo.apps[2].packageName, label: demo.apps[2].label, minutesPerDay: 0, pauseOnOpen: true, enabled: true },
    ],
    windows: [
      { id: makeId('w'), kind: 'study', label: c.windowKinds[0].label, days: [1, 2, 3, 4], start: '16:30', end: '18:00', enabled: true, lockApps: true },
      { id: makeId('w'), kind: 'meals', label: c.windowKinds[2].label, days: [0, 1, 2, 3, 4, 5, 6], start: '19:30', end: '20:15', enabled: true, lockApps: false },
    ],
    bedtime: { enabled: true, windDownMinutes: 30, lockApps: true, grayscale: true },
    focusSessions,
    gamingBudgetMinutes: 6 * 60,
    gamingSessions: gaming,
    usage,
    guardEvents,
    guardEnabled: true,
    screenCheckins: [],
    activeFocus: null,
    activeGaming: null,
  });

  // ---------- Progress ----------
  const streakLog = (slipAt: number): Record<string, boolean> => {
    const log: Record<string, boolean> = {};
    lastNDays(14).forEach((d, k) => {
      if (d === today) return;
      log[d] = k !== slipAt;
    });
    return log;
  };
  const baseStreaks: Streak[] = [
    {
      id: makeId('sk'),
      target: { kind: 'custom', label: `No ${demo.apps[0].label} after 10pm` },
      createdOn: dates[DAYS - 14],
      log: streakLog(4),
      best: 0,
      restarts: 1,
      active: true,
    },
    {
      id: makeId('sk'),
      target: { kind: 'app', packageName: demo.apps[1].packageName, label: demo.apps[1].label, maxMinutes: 60 },
      createdOn: dates[DAYS - 10],
      log: Object.fromEntries(lastNDays(9).filter((d) => d !== today).map((d) => [d, true])),
      best: 0,
      restarts: 0,
      active: true,
    },
  ];
  const streaks: Streak[] = baseStreaks.map((s) => ({ ...s, best: longestRun(s) }));

  const goals = demo.goals.map((g, k) => ({
    id: makeId('goal'),
    title: g.title,
    why: g.why,
    category: g.category,
    steps: g.steps.map((text, idx) => ({ id: makeId('st'), text, done: idx < g.done, doneAt: idx < g.done ? now - (5 - idx) * 24 * HOUR : undefined })),
    checkins: [{ at: now - (3 + k) * 24 * HOUR, note: k === 0 ? 'Learned G and C. Fingers hurt but it is fun.' : 'Ran 3 km with the group today!' }],
    createdAt: now - (18 - k * 4) * 24 * HOUR,
  }));

  useProgress.setState({
    goals,
    streaks,
    challenges: {
      'phone-free-meals': { challengeId: 'phone-free-meals', startedOn: dates[DAYS - 4], doneDates: [dates[DAYS - 4], dates[DAYS - 3], dates[DAYS - 2]], restarts: 0 },
      'unplugged-game-night': { challengeId: 'unplugged-game-night', startedOn: dates[DAYS - 9], doneDates: [dates[DAYS - 8]], completedAt: now - 8 * 24 * HOUR, restarts: 0 },
    },
    badges: {
      'first-step': now - 21 * 24 * HOUR,
      'first-checkin': now - 21 * 24 * HOUR,
      'checkin-week': now - 14 * 24 * HOUR,
      'first-breath': now - 19 * 24 * HOUR,
      'calm-five': now - 6 * 24 * HOUR,
      grateful: now - 18 * 24 * HOUR,
      'offline-hero': now - 8 * 24 * HOUR,
      comeback: now - 9 * 24 * HOUR,
      'seven-strong': now - 2 * 24 * HOUR,
      'focus-five': now - 5 * 24 * HOUR,
    },
    reflections: [
      {
        weekStart: dateKey(addDays(startOfDay(), -7 - ((new Date().getDay() + 6) % 7))),
        helped: 'Walking with my cousin and keeping my phone out of my room.',
        tryNext: 'Turn on the study window on weekdays.',
        at: now - 4 * 24 * HOUR,
      },
    ],
    connections: [
      { at: now - 6 * 24 * HOUR, nudgeId: 'walk-invite' },
      { at: now - 2 * 24 * HOUR, nudgeId: 'voice-note' },
    ],
    guidesRead: { 'report-block': now - 10 * 24 * HOUR, 'scrolling-trap': now - 12 * 24 * HOUR },
    quizAnswers: {},
    checklists: { 'privacy-checkup': ['private-account', 'two-factor', 'location-posts'] },
  });

  // ---------- Community (demo only, never uploaded) ----------
  const posts: PeerPost[] = demo.posts.map((p) => ({
    id: makeId('dp'),
    authorId: `demo-${p.alias}`,
    alias: p.alias,
    topic: p.topic,
    text: p.text,
    status: 'published',
    createdAt: now - p.hoursAgo * HOUR,
    reactions: { hear: p.hear, strength: p.strength, metoo: p.metoo },
    reportCount: 0,
    replyCount: 0,
  }));
  const replies: PeerReply[] = demo.replies.map((r, k) => ({
    id: makeId('dr'),
    postId: posts[r.post].id,
    authorId: r.staff ? 'demo-staff' : `demo-${r.alias}`,
    alias: r.alias,
    text: r.text,
    status: 'published',
    createdAt: posts[r.post].createdAt + (k + 1) * 0.7 * HOUR,
    fromStaff: r.staff,
  }));
  posts.forEach((p) => {
    p.replyCount = replies.filter((r) => r.postId === p.id).length;
  });
  const noteId = makeId('dn');
  const noteStart = now - 26 * HOUR;
  const note: AnonNote = { id: noteId, authorId: 'demo-you', topic: demo.note.topic, status: 'answered', createdAt: noteStart, lastMessageAt: noteStart + 3 * HOUR };
  const noteMessages: NoteMessage[] = [
    { id: makeId('nm'), noteId, from: 'author', text: demo.note.author, createdAt: noteStart },
    { id: makeId('nm'), noteId, from: 'helper', text: demo.note.helper, createdAt: noteStart + 3 * HOUR },
  ];
  const events: CommunityEvent[] = demo.events.map((e) => {
    const start = addDays(startOfDay(), e.inDays);
    start.setHours(e.hour, e.minute, 0, 0);
    return {
      id: makeId('de'),
      title: e.title,
      description: e.description,
      category: e.category,
      startsAt: start.getTime(),
      location: e.location,
      createdAt: now - 3 * 24 * HOUR,
    };
  });
  useCommunityLocal.setState({
    demoPosts: posts,
    demoReplies: replies,
    demoNotes: [note],
    demoNoteMessages: noteMessages,
    demoEvents: events,
    reactions: {},
    reported: {},
    interestedEvents: [events[1].id],
  });

  useEvidence.setState({
    entries: [{ id: makeId('ev'), at: now - 5 * 24 * HOUR, where: demo.evidence.where, what: demo.evidence.what, who: demo.evidence.who, images: [] }],
  });
}
