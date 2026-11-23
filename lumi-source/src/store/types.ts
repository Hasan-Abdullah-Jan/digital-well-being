/** Shared data types. Everything here is stored ON THE DEVICE ONLY. */

export type ConcernId =
  | 'scrolling'
  | 'sleep'
  | 'focus'
  | 'gaming'
  | 'comparison'
  | 'escapism'
  | 'lonely'
  | 'stress'
  | 'low-mood'
  | 'harassment'
  | 'content';

export type GoalId =
  | 'scroll-less'
  | 'sleep-better'
  | 'focus'
  | 'game-balance'
  | 'self-worth'
  | 'connect'
  | 'calm'
  | 'safe-online';

export type ThemePref = 'system' | 'light' | 'dark';

export type TrustedContact = { name: string; phone: string; message: string };

export type NotificationPrefs = {
  checkin: boolean;
  bedtime: boolean;
  morning: boolean;
  nudges: boolean;
  quotes: boolean;
  weekly: boolean;
  windows: boolean;
};

export type Consent = { granted: boolean; at: number };

// ----- Wellbeing -----
export type MoodScore = 1 | 2 | 3 | 4 | 5;
export type MoodContext = 'general' | 'after-scroll' | 'after-gaming';

export type MoodEntry = {
  id: string;
  at: number;
  score: MoodScore;
  emotions: string[];
  note?: string;
  context: MoodContext;
  /** For after-scroll check-ins: the feeling id (better, same, worse, ...). */
  feeling?: string;
  /** Optional: which app or game the check-in is about. */
  app?: string;
};

export type JournalType = 'gratitude' | 'win' | 'reflection' | 'worry';

export type JournalEntry = {
  id: string;
  at: number;
  type: JournalType;
  text: string;
  prompt?: string;
  /** Worry jar: the user "closed the lid" on this worry. */
  closed?: boolean;
};

export type SleepEntry = {
  id: string;
  /** The morning you woke up (YYYY-MM-DD). */
  date: string;
  bedtime: string;
  wake: string;
  hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
};

export type ExerciseKind = 'breathing' | 'grounding' | 'body-scan' | 'worry-jar' | 'five-minute' | 'reality-card';

export type ExerciseLog = { id: string; at: number; kind: ExerciseKind; detail?: string; seconds?: number };

// ----- Habits -----
export type AppInfo = { packageName: string; label: string; category?: string };

export type AppLimit = {
  id: string;
  packageName: string;
  label: string;
  /** 0 = no daily limit, just the pause screen. */
  minutesPerDay: number;
  /** Show the "pause and think" screen every time the app opens. */
  pauseOnOpen: boolean;
  enabled: boolean;
};

export type WindowKind = 'study' | 'sleep' | 'meals' | 'prayer' | 'personal' | 'family' | 'custom';

export type PhoneFreeWindow = {
  id: string;
  kind: WindowKind;
  label: string;
  /** JavaScript weekday numbers: 0 = Sunday ... 6 = Saturday. */
  days: number[];
  start: string;
  end: string;
  enabled: boolean;
  /** Android: show the pause screen for limited apps during this window. */
  lockApps: boolean;
};

export type BedtimeSettings = {
  enabled: boolean;
  windDownMinutes: number;
  lockApps: boolean;
  grayscale: boolean;
};

/** gentle: only apps in App limits pause. deep: every app pauses except the ones you allow. */
export type FocusMode = 'gentle' | 'deep';

export type FocusSession = {
  id: string;
  startedAt: number;
  plannedMinutes: number;
  endedAt?: number;
  completed: boolean;
  label?: string;
  mode?: FocusMode;
  locked?: boolean;
};

export type StrictSettings = {
  /** No "Open anyway" once a limit, phone-free time, bedtime or focus session applies. */
  enabled: boolean;
  /** Longest single session in a limited app before it locks (0 = off). */
  sessionCapMinutes: number;
  /** How long a limited app stays locked after hitting the session cap. */
  cooldownMinutes: number;
  /** Commitment lock: rules can be tightened but not loosened until this time (0 = off). */
  lockedUntil: number;
  /** Emergency unlock: started at this time, completes after a waiting period. */
  unlockRequestedAt?: number;
};

export type AllowedApp = { packageName: string; label: string };

export type GamingSession = {
  id: string;
  startedAt: number;
  plannedMinutes: number;
  endedAt?: number;
  game?: string;
  /** Post-play feeling id from content.gameMoods. */
  moodAfter?: string;
  moodScore?: number;
};

export type ScreenCheckin = {
  id: string;
  date: string;
  minutes: number;
  topCategory?: string;
  at: number;
};

export type AppUsage = { packageName: string; label: string; minutes: number; opens?: number; category?: string };

export type DailyUsage = {
  date: string;
  totalMinutes: number;
  pickups?: number;
  apps: AppUsage[];
  source: 'device' | 'demo';
};

export type GuardEvent = {
  at: number;
  packageName: string;
  label: string;
  reason: 'pause' | 'limit' | 'window' | 'bedtime' | 'focus' | 'session';
  choice: 'closed' | 'continued';
};

// ----- Progress -----
export type GoalStep = { id: string; text: string; done: boolean; doneAt?: number };

export type LifeGoal = {
  id: string;
  title: string;
  why: string;
  category: string;
  steps: GoalStep[];
  checkins: { at: number; note: string }[];
  createdAt: number;
  completedAt?: number;
};

export type StreakTarget =
  | { kind: 'app'; packageName: string; label: string; maxMinutes: number }
  | { kind: 'custom'; label: string };

export type Streak = {
  id: string;
  target: StreakTarget;
  createdOn: string;
  /** date key -> true (kept) / false (slipped). */
  log: Record<string, boolean>;
  best: number;
  restarts: number;
  active: boolean;
};

export type ChallengeProgress = {
  challengeId: string;
  startedOn: string;
  doneDates: string[];
  completedAt?: number;
  restarts: number;
};

export type WeeklyReflection = { weekStart: string; helped: string; tryNext: string; at: number };

export type EvidenceEntry = {
  id: string;
  at: number;
  /** Where it happened (app, game, website, in person...). */
  where: string;
  what: string;
  who?: string;
  /** Local file URIs of screenshots copied into the app's private folder. */
  images: string[];
};

// ----- Body -----
export type BodyMetric = 'water' | 'move' | 'stretch' | 'eye' | 'outdoor';

export type BodyDay = { date: string } & Record<BodyMetric, number>;

export type BodyReminder = { enabled: boolean; every: number };

export type BodyReminders = {
  eye: BodyReminder;
  move: BodyReminder;
  water: BodyReminder;
  /** Reminders only between these times (HH:MM). */
  from: string;
  to: string;
};

// ----- Crew challenges (offline, family and friends) -----
export type CrewMember = { id: string; name: string; color: number; me?: boolean };

export type CrewHabit = { id: string; title: string; icon: string; points: number };

export type Crew = {
  id: string;
  name: string;
  createdAt: number;
  /** First day (YYYY-MM-DD). */
  startDate: string;
  days: number;
  /** What the winner gets, or what the team earns together. */
  reward: string;
  /** versus: friendly leaderboard. team: everyone works towards one shared goal. */
  mode: 'versus' | 'team';
  members: CrewMember[];
  habits: CrewHabit[];
  /** date -> memberId -> habit ids done that day. */
  log: Record<string, Record<string, string[]>>;
  archived?: boolean;
};
