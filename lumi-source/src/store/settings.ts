import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from './storage';
import type {
  ConcernId,
  Consent,
  GoalId,
  NotificationPrefs,
  ThemePref,
  TrustedContact,
} from './types';

export type SettingsData = {
  onboarded: boolean;
  onboardedAt?: number;
  nickname: string;
  concerns: ConcernId[];
  goals: GoalId[];
  bedtime: string;
  wakeTime: string;
  checkinTime: string;
  theme: ThemePref;
  /** 'system' follows the phone language. */
  language: string;
  reduceMotion: boolean;
  haptics: boolean;
  /** Soft interaction sounds. */
  sounds: boolean;
  notifications: NotificationPrefs;
  trustedContact: TrustedContact | null;
  appLock: boolean;
  /** Cloud features (peer space, anonymous notes) need explicit, revocable consent. */
  communityConsent: Consent | null;
  /** Random friendly name used in the peer space. Never your real name. */
  alias: string;
  /** Long-session nudge after this many minutes in a watched app (Android). */
  frictionMinutes: number;
  /** Packages that get the gentle long-session nudge and mood-after-scrolling prompt. */
  watchedApps: string[];
  /** Last time we gently offered support after several low moods. */
  lowMoodSupportShownAt?: number;
};

type SettingsActions = {
  update: (patch: Partial<SettingsData>) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
  completeOnboarding: () => void;
};

export type SettingsState = SettingsData & SettingsActions;

export const defaultNotifications: NotificationPrefs = {
  checkin: true,
  bedtime: true,
  morning: true,
  nudges: true,
  quotes: false,
  weekly: true,
  windows: true,
};

export const initialSettings = (): SettingsData => ({
  onboarded: false,
  nickname: '',
  concerns: [],
  goals: [],
  bedtime: '22:30',
  wakeTime: '07:00',
  checkinTime: '20:00',
  theme: 'system',
  language: 'system',
  reduceMotion: false,
  haptics: true,
  sounds: true,
  notifications: { ...defaultNotifications },
  trustedContact: null,
  appLock: false,
  communityConsent: null,
  alias: '',
  frictionMinutes: 20,
  watchedApps: [],
});

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings(),
      update: (patch) => set(patch),
      setNotification: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      completeOnboarding: () => set({ onboarded: true, onboardedAt: Date.now() }),
    }),
    persistOptions<SettingsState>('settings', initialSettings),
  ),
);
