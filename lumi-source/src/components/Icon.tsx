import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type MoodIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color, style }: { name: IconName | string; size?: number; color?: string; style?: ViewStyle }) {
  const theme = useTheme();
  const safe = (name in Ionicons.glyphMap ? name : 'ellipse-outline') as IconName;
  return <Ionicons name={safe} size={size} color={color ?? theme.colors.text} style={style} importantForAccessibility="no" />;
}

export function MoodIcon({ name, size = 30, color }: { name: string; size?: number; color?: string }) {
  const theme = useTheme();
  const safe = (name in MaterialCommunityIcons.glyphMap ? name : 'emoticon-neutral-outline') as MoodIconName;
  return <MaterialCommunityIcons name={safe} size={size} color={color ?? theme.colors.text} importantForAccessibility="no" />;
}

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export function IconCircle({ name, tone = 'primary', size = 44 }: { name: IconName | string; tone?: Tone; size?: number }) {
  const { colors, neu } = useTheme();
  const bg = {
    primary: colors.primarySoft,
    accent: colors.accentSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
    neutral: colors.surfaceAlt,
  }[tone];
  const fg = {
    primary: colors.onPrimarySoft,
    accent: colors.onAccentSoft,
    success: colors.onSuccessSoft,
    warning: colors.onWarningSoft,
    danger: colors.onDangerSoft,
    neutral: colors.text,
  }[tone];
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', boxShadow: neu.raisedSm }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}
