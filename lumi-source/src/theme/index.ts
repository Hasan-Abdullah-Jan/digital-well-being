import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

import { darkColors, lightColors, type ThemeColors } from './colors';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;

/** Minimum touch target (Android/iOS accessibility guidance). */
export const TOUCH = 48;

/** System fonts on purpose: they cover every script, so translations render correctly. */
export const typography = {
  display: { fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '600', letterSpacing: 0.1 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Soft-neumorphic depth as CSS-style box shadows (supported on Android, iOS and web). */
export type Neu = { raised: string; raisedSm: string; inset: string; insetSm: string; float: string };

function neuFor(c: ThemeColors): Neu {
  const pair = (d: number, blur: number, inset = false) =>
    `${inset ? 'inset ' : ''}${d}px ${d}px ${blur}px ${c.shade}, ${inset ? 'inset ' : ''}-${d}px -${d}px ${blur}px ${c.highlight}`;
  return {
    raised: pair(6, 14),
    raisedSm: pair(3, 8),
    inset: pair(4, 9, true),
    insetSm: pair(2, 5, true),
    float: `0px 10px 28px ${c.shade}`,
  };
}

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  neu: Neu;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export function buildTheme(scheme: 'light' | 'dark'): Theme {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return {
    scheme,
    colors,
    neu: neuFor(colors),
    spacing,
    radius,
    typography,
  };
}

export function useColorSchemePreference(): 'light' | 'dark' {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  const scheme = useColorSchemePreference();
  return useMemo(() => buildTheme(scheme), [scheme]);
}

export type { ThemeColors };
