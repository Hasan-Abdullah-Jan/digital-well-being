import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { currentStreakLength } from '@/features/streaks';
import { capList, makeId } from '@/utils/misc';
import { dateKey } from '@/utils/time';

import { persistOptions } from './storage';
import type { ChallengeProgress, LifeGoal, Streak, StreakTarget, WeeklyReflection } from './types';

export type ProgressData = {
  goals: LifeGoal[];
  streaks: Streak[];
  challenges: Record<string, ChallengeProgress>;
  badges: Record<string, number>;
  reflections: WeeklyReflection[];
  connections: { at: number; nudgeId: string }[];
  guidesRead: Record<string, number>;
  quizAnswers: Record<string, string>;
  /** Ticked checklist items per guide (e.g. privacy check-up). */
  checklists: Record<string, string[]>;
  /** Week key of the last "your usage dropped" celebration, so we celebrate once per week. */
  lastUsageCelebrationWeek?: string;
};

type ProgressActions = {
  addGoal: (input: Pick<LifeGoal, 'title' | 'why' | 'category'> & { steps: string[] }) => LifeGoal;
  updateGoal: (id: string, patch: Partial<Pick<LifeGoal, 'title' | 'why' | 'category'>>) => void;
  removeGoal: (id: string) => void;
  addStep: (goalId: string, text: string) => void;
  removeStep: (goalId: string, stepId: string) => void;
  toggleStep: (goalId: string, stepId: string) => void;
  addGoalCheckin: (goalId: string, note: string) => void;
  setGoalCompleted: (goalId: string, completed: boolean) => void;
  addStreak: (target: StreakTarget) => Streak;
  removeStreak: (id: string) => void;
  logStreak: (id: string, kept: boolean, date?: string) => { restarted: boolean };
  startChallenge: (challengeId: string) => void;
  markChallengeDay: (challengeId: string, totalDays: number, date?: string) => { completed: boolean };
  restartChallenge: (challengeId: string) => void;
  leaveChallenge: (challengeId: string) => void;
  earnBadge: (id: string) => boolean;
  saveReflection: (reflection: Omit<WeeklyReflection, 'at'>) => void;
  logConnection: (nudgeId: string) => void;
  markGuideRead: (guideId: string) => void;
  answerQuiz: (questionId: string, answer: string) => void;
  toggleChecklist: (guideId: string, itemId: string) => void;
  setUsageCelebrationWeek: (week: string) => void;
};

export type ProgressState = ProgressData & ProgressActions;

export const initialProgress = (): ProgressData => ({
  goals: [],
  streaks: [],
  challenges: {},
  badges: {},
  reflections: [],
  connections: [],
  guidesRead: {},
  quizAnswers: {},
  checklists: {},
});

function mapGoal(goals: LifeGoal[], id: string, fn: (g: LifeGoal) => LifeGoal): LifeGoal[] {
  return goals.map((g) => (g.id === id ? fn(g) : g));
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialProgress(),
      addGoal: ({ title, why, category, steps }) => {
        const goal: LifeGoal = {
          id: makeId('goal'),
          title: title.trim(),
          why: why.trim(),
          category,
          steps: steps
            .map((text) => text.trim())
            .filter(Boolean)
            .map((text) => ({ id: makeId('st'), text, done: false })),
          checkins: [],
          createdAt: Date.now(),
        };
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal;
      },
      updateGoal: (id, patch) => set((s) => ({ goals: mapGoal(s.goals, id, (g) => ({ ...g, ...patch })) })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addStep: (goalId, text) =>
        set((s) => ({
          goals: mapGoal(s.goals, goalId, (g) => ({
            ...g,
            steps: [...g.steps, { id: makeId('st'), text: text.trim(), done: false }],
          })),
        })),
      removeStep: (goalId, stepId) =>
        set((s) => ({
          goals: mapGoal(s.goals, goalId, (g) => ({ ...g, steps: g.steps.filter((st) => st.id !== stepId) })),
        })),
      toggleStep: (goalId, stepId) =>
        set((s) => ({
          goals: mapGoal(s.goals, goalId, (g) => ({
            ...g,
            steps: g.steps.map((st) =>
              st.id === stepId ? { ...st, done: !st.done, doneAt: !st.done ? Date.now() : undefined } : st,
            ),
          })),
        })),
      addGoalCheckin: (goalId, note) =>
        set((s) => ({
          goals: mapGoal(s.goals, goalId, (g) => ({
            ...g,
            checkins: capList([...g.checkins, { at: Date.now(), note: note.trim() }], 200),
          })),
        })),
      setGoalCompleted: (goalId, completed) =>
        set((s) => ({
          goals: mapGoal(s.goals, goalId, (g) => ({ ...g, completedAt: completed ? Date.now() : undefined })),
        })),
      addStreak: (target) => {
        const streak: Streak = {
          id: makeId('sk'),
          target,
          createdOn: dateKey(),
          log: {},
          best: 0,
          restarts: 0,
          active: true,
        };
        set((s) => ({ streaks: [...s.streaks, streak] }));
        return streak;
      },
      removeStreak: (id) => set((s) => ({ streaks: s.streaks.filter((x) => x.id !== id) })),
      logStreak: (id, kept, date = dateKey()) => {
        const streak = get().streaks.find((x) => x.id === id);
        if (!streak) return { restarted: false };
        const before = currentStreakLength(streak, date);
        const alreadyLogged = streak.log[date];
        const log = { ...streak.log, [date]: kept };
        const updated: Streak = { ...streak, log };
        const after = currentStreakLength(updated, date);
        const restarted = !kept && alreadyLogged !== false && before > 0;
        set((s) => ({
          streaks: s.streaks.map((x) =>
            x.id === id
              ? { ...updated, best: Math.max(x.best, after), restarts: x.restarts + (restarted ? 1 : 0) }
              : x,
          ),
        }));
        return { restarted };
      },
      startChallenge: (challengeId) =>
        set((s) => ({
          challenges: {
            ...s.challenges,
            [challengeId]: { challengeId, startedOn: dateKey(), doneDates: [], restarts: 0 },
          },
        })),
      markChallengeDay: (challengeId, totalDays, date = dateKey()) => {
        const current = get().challenges[challengeId];
        if (!current) return { completed: false };
        const doneDates = current.doneDates.includes(date)
          ? current.doneDates.filter((d) => d !== date)
          : [...current.doneDates, date].sort();
        const completed = doneDates.length >= totalDays;
        set((s) => ({
          challenges: {
            ...s.challenges,
            [challengeId]: {
              ...current,
              doneDates,
              completedAt: completed ? (current.completedAt ?? Date.now()) : undefined,
            },
          },
        }));
        return { completed: completed && !current.completedAt };
      },
      restartChallenge: (challengeId) =>
        set((s) => {
          const current = s.challenges[challengeId];
          if (!current) return {};
          return {
            challenges: {
              ...s.challenges,
              [challengeId]: {
                challengeId,
                startedOn: dateKey(),
                doneDates: [],
                restarts: current.restarts + 1,
              },
            },
          };
        }),
      leaveChallenge: (challengeId) =>
        set((s) => {
          const next = { ...s.challenges };
          delete next[challengeId];
          return { challenges: next };
        }),
      earnBadge: (id) => {
        if (get().badges[id]) return false;
        set((s) => ({ badges: { ...s.badges, [id]: Date.now() } }));
        return true;
      },
      saveReflection: (reflection) =>
        set((s) => ({
          reflections: [
            ...s.reflections.filter((r) => r.weekStart !== reflection.weekStart),
            { ...reflection, at: Date.now() },
          ].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
        })),
      logConnection: (nudgeId) =>
        set((s) => ({ connections: capList([...s.connections, { at: Date.now(), nudgeId }], 500) })),
      markGuideRead: (guideId) =>
        set((s) => (s.guidesRead[guideId] ? {} : { guidesRead: { ...s.guidesRead, [guideId]: Date.now() } })),
      answerQuiz: (questionId, answer) => set((s) => ({ quizAnswers: { ...s.quizAnswers, [questionId]: answer } })),
      toggleChecklist: (guideId, itemId) =>
        set((s) => {
          const current = s.checklists[guideId] ?? [];
          const next = current.includes(itemId) ? current.filter((i) => i !== itemId) : [...current, itemId];
          return { checklists: { ...s.checklists, [guideId]: next } };
        }),
      setUsageCelebrationWeek: (week) => set({ lastUsageCelebrationWeek: week }),
    }),
    persistOptions<ProgressState>('progress', initialProgress),
  ),
);
