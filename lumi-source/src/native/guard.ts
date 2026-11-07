/**
 * JavaScript side of the local Android module in modules/lumi-guard.
 *
 * Real screen-time data and the "pause and think" screen need Android's
 * UsageStatsManager plus permission to draw over other apps. iOS, the web and
 * Expo Go do not offer this to normal apps, so every function has a safe fallback
 * and the UI switches to self-reported check-ins and in-app focus tools.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type NativeAppUsage = {
  packageName: string;
  label: string;
  ms: number;
  opens: number;
  category: string;
};

export type NativeUsage = { totalMs: number; pickups: number; apps: NativeAppUsage[] };
export type NativeDailyTotal = { date: string; totalMs: number; pickups: number };
export type NativeApp = { packageName: string; label: string; category: string };

export type GuardConfig = {
  limits: { pkg: string; label: string; minutes: number; pauseOnOpen: boolean }[];
  watched: string[];
  frictionMinutes: number;
  windows: { label: string; days: number[]; start: number; end: number }[];
  bedtime: { enabled: boolean; start: number; end: number; grayscale: boolean };
  focusUntil: number;
  strings: Record<string, string>;
  suggestions: string[];
};

export type NativeGuardEvent = {
  at: number;
  packageName: string;
  label: string;
  reason: 'pause' | 'limit' | 'window' | 'bedtime' | 'focus';
  choice: 'closed' | 'continued';
};

type LumiGuardModule = {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  canWriteSecureSettings(): boolean;
  isGrayscaleOn(): boolean;
  setGrayscale(enabled: boolean): boolean;
  openAccessibilitySettings(): void;
  openDigitalWellbeingSettings(): boolean;
  getUsageForRange(startMs: number, endMs: number): Promise<NativeUsage>;
  getDailyTotals(days: number): Promise<NativeDailyTotal[]>;
  getLaunchableApps(): Promise<NativeApp[]>;
  getAppIcon(packageName: string, size: number): Promise<string | null>;
  setGuardConfig(json: string): void;
  startGuard(): boolean;
  stopGuard(): void;
  isGuardRunning(): boolean;
  consumeGuardEvents(): string;
  setWidgetQuotes(json: string): void;
};

const native: LumiGuardModule | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<LumiGuardModule>('LumiGuard') : null;

function safe<T>(fn: () => T, fallback: T): T {
  if (!native) return fallback;
  try {
    return fn();
  } catch (error) {
    if (__DEV__) console.warn('[LumiGuard]', error);
    return fallback;
  }
}

async function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!native) return fallback;
  try {
    return await fn();
  } catch (error) {
    if (__DEV__) console.warn('[LumiGuard]', error);
    return fallback;
  }
}

export const guard = {
  /** True only in an Android build that includes the Lumi native module (not Expo Go). */
  isAvailable: (): boolean => native !== null,
  hasUsageAccess: () => safe(() => native!.hasUsageAccess(), false),
  openUsageAccessSettings: () => safe(() => native!.openUsageAccessSettings(), undefined),
  canDrawOverlays: () => safe(() => native!.canDrawOverlays(), false),
  openOverlaySettings: () => safe(() => native!.openOverlaySettings(), undefined),
  canWriteSecureSettings: () => safe(() => native!.canWriteSecureSettings(), false),
  isGrayscaleOn: () => safe(() => native!.isGrayscaleOn(), false),
  setGrayscale: (enabled: boolean) => safe(() => native!.setGrayscale(enabled), false),
  openAccessibilitySettings: () => safe(() => native!.openAccessibilitySettings(), undefined),
  openDigitalWellbeingSettings: () => safe(() => native!.openDigitalWellbeingSettings(), false),
  getUsageForRange: (startMs: number, endMs: number) =>
    safeAsync(() => native!.getUsageForRange(startMs, endMs), null as NativeUsage | null),
  getDailyTotals: (days: number) => safeAsync(() => native!.getDailyTotals(days), [] as NativeDailyTotal[]),
  getLaunchableApps: () => safeAsync(() => native!.getLaunchableApps(), [] as NativeApp[]),
  getAppIcon: (packageName: string, size = 96) =>
    safeAsync(() => native!.getAppIcon(packageName, size), null as string | null),
  setGuardConfig: (config: GuardConfig) => safe(() => native!.setGuardConfig(JSON.stringify(config)), undefined),
  startGuard: () => safe(() => native!.startGuard(), false),
  stopGuard: () => safe(() => native!.stopGuard(), undefined),
  isGuardRunning: () => safe(() => native!.isGuardRunning(), false),
  consumeGuardEvents: (): NativeGuardEvent[] =>
    safe(() => {
      const parsed = JSON.parse(native!.consumeGuardEvents() || '[]') as NativeGuardEvent[];
      return Array.isArray(parsed) ? parsed : [];
    }, []),
  setWidgetQuotes: (quotes: string[]) => safe(() => native!.setWidgetQuotes(JSON.stringify(quotes)), undefined),
};
