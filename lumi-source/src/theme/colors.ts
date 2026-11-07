/**
 * Colour tokens. Soft-neumorphic surfaces share the background colour and get their
 * depth from two shadows (a light one top-left, a dark one bottom-right). Glass layers
 * are translucent with a hairline highlight. Every text/background pair used in the app
 * was checked for WCAG AA contrast (4.5:1 or better) in both light and dark mode.
 */
export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  placeholder: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  onAccentSoft: string;
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  danger: string;
  dangerSoft: string;
  onDangerSoft: string;
  tabInactive: string;
  overlay: string;
  shadow: string;
  /** Neumorphic light and dark shadow colours. */
  highlight: string;
  shade: string;
  /** Glass: translucent fill, hairline edge and blur tint. */
  glass: string;
  glassBorder: string;
  blurTint: 'light' | 'dark';
  /** Gradients (start, end). */
  gradPrimary: [string, string];
  gradAccent: [string, string];
  /** Soft background glow blobs. */
  blobA: string;
  blobB: string;
  /** Mood scale 1 (rough) to 5 (great). Used as fills next to text labels, never alone. */
  mood: [string, string, string, string, string];
  chart: { bar: string; barMuted: string; goal: string };
};

export const lightColors: ThemeColors = {
  bg: '#F1EDE7',
  surface: '#F1EDE7',
  surfaceAlt: '#E7E1D8',
  border: 'rgba(120, 104, 84, 0.14)',
  text: '#1D2330',
  textMuted: '#4F5867',
  placeholder: '#59616F',
  primary: '#286660',
  onPrimary: '#FFFFFF',
  primarySoft: '#DCEBE7',
  onPrimarySoft: '#1E4F4B',
  accent: '#B4492F',
  onAccent: '#FFFFFF',
  accentSoft: '#F7E2D8',
  onAccentSoft: '#7A2E1E',
  success: '#2B6E44',
  successSoft: '#DCEEDF',
  onSuccessSoft: '#1F5233',
  warning: '#7D5200',
  warningSoft: '#F6EAD0',
  onWarningSoft: '#6B4600',
  danger: '#A8322A',
  dangerSoft: '#F5DEDA',
  onDangerSoft: '#7E231D',
  tabInactive: '#566070',
  overlay: 'rgba(29, 35, 48, 0.38)',
  shadow: '#1D2330',
  highlight: '#FFFFFF',
  shade: '#D2C9BC',
  glass: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.85)',
  blurTint: 'light',
  gradPrimary: ['#2F7A73', '#225B56'],
  gradAccent: ['#C2553A', '#A43F27'],
  blobA: 'rgba(127, 200, 191, 0.38)',
  blobB: 'rgba(243, 182, 140, 0.34)',
  mood: ['#7D8FD6', '#9DB4DF', '#D9C38C', '#93C9A2', '#F3B65B'],
  chart: { bar: '#286660', barMuted: '#C5DAD6', goal: '#B4492F' },
};

export const darkColors: ThemeColors = {
  bg: '#171C23',
  surface: '#1C232C',
  surfaceAlt: '#12161C',
  border: 'rgba(255, 255, 255, 0.06)',
  text: '#ECEFF3',
  textMuted: '#A6B0BD',
  placeholder: '#8E99A8',
  primary: '#7FC8BF',
  onPrimary: '#0B2522',
  primarySoft: '#1E3836',
  onPrimarySoft: '#BFE6E0',
  accent: '#F08C72',
  onAccent: '#2A0E07',
  accentSoft: '#3A241E',
  onAccentSoft: '#F7C6B8',
  success: '#7CCB97',
  successSoft: '#1D3326',
  onSuccessSoft: '#B9E6C8',
  warning: '#E7B556',
  warningSoft: '#3A2E17',
  onWarningSoft: '#F3D9A4',
  danger: '#F09189',
  dangerSoft: '#3B1F1D',
  onDangerSoft: '#F7C3BE',
  tabInactive: '#98A3B3',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  highlight: 'rgba(255, 255, 255, 0.055)',
  shade: 'rgba(0, 0, 0, 0.55)',
  glass: 'rgba(30, 38, 48, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.09)',
  blurTint: 'dark',
  gradPrimary: ['#8AD3C9', '#6AB4AB'],
  gradAccent: ['#F59A80', '#E07B60'],
  blobA: 'rgba(127, 200, 191, 0.16)',
  blobB: 'rgba(240, 140, 114, 0.12)',
  mood: ['#7D8FD6', '#9DB4DF', '#D9C38C', '#93C9A2', '#F3B65B'],
  chart: { bar: '#7FC8BF', barMuted: '#2C4644', goal: '#F08C72' },
};
