/** Small layout and list building blocks used across screens. */
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type ViewStyle } from 'react-native';

import { TOUCH, useTheme } from '@/theme';

import { tapFeedback } from './Button';
import { Icon, IconCircle, type IconName } from './Icon';
import { Text } from './Text';

export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ marginBottom: 24 }, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? <Text variant="heading">{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

export function Row({
  children,
  gap = 12,
  style,
  wrap,
  accessibilityLabel,
}: {
  children: ReactNode;
  gap?: number;
  style?: ViewStyle;
  wrap?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>
      {children}
    </View>
  );
}

export function Spacer({ size = 12 }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function ListRow({
  icon,
  tone,
  title,
  subtitle,
  right,
  onPress,
  chevron = !!onPress,
  testID,
  accessibilityHint,
}: {
  icon?: IconName | string;
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  testID?: string;
  accessibilityHint?: string;
}) {
  const { colors, radius, neu } = useTheme();
  const content = (
    <View style={styles.listRow}>
      {icon ? <IconCircle name={icon} tone={tone} size={40} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="small" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );
  const shell: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: TOUCH + 14,
    justifyContent: 'center',
  };
  if (!onPress) return <View style={[shell, { boxShadow: neu.raisedSm }]}>{content}</View>;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [shell, { boxShadow: pressed ? neu.insetSm : neu.raisedSm, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      {content}
    </Pressable>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  icon,
  disabled,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon?: IconName | string;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors, radius, neu } = useTheme();
  const flip = (next: boolean) => {
    if (disabled) return;
    tapFeedback('toggle');
    onChange(next);
  };
  return (
    <Pressable
      testID={testID}
      onPress={() => flip(!value)}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.listRow,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          boxShadow: neu.raisedSm,
          paddingHorizontal: 16,
          paddingVertical: 13,
          minHeight: TOUCH + 14,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      {icon ? <IconCircle name={icon} size={40} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="small" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={flip}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
        thumbColor={value ? colors.onPrimary : colors.highlight === '#FFFFFF' ? '#FFFFFF' : '#C9D1DB'}
        ios_backgroundColor={colors.surfaceAlt}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'warning'; icon?: IconName | string }) {
  const { colors } = useTheme();
  const map = {
    neutral: [colors.surfaceAlt, colors.text],
    primary: [colors.primarySoft, colors.onPrimarySoft],
    accent: [colors.accentSoft, colors.onAccentSoft],
    success: [colors.successSoft, colors.onSuccessSoft],
    warning: [colors.warningSoft, colors.onWarningSoft],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName | string;
  testID?: string;
}) {
  const { colors, radius, neu } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tapFeedback('toggle');
        onPress?.();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          boxShadow: selected ? neu.insetSm : pressed ? neu.insetSm : neu.raisedSm,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {icon ? <Icon name={selected ? 'checkmark' : icon} size={16} color={selected ? colors.onPrimary : colors.text} /> : null}
      <Text variant="smallStrong" style={{ color: selected ? colors.onPrimary : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, max = 1, color, height = 10, label }: { value: number; max?: number; color?: string; height?: number; label?: string }) {
  const { colors, neu } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height, backgroundColor: colors.surfaceAlt, overflow: 'hidden', boxShadow: neu.insetSm }}
    >
      {color ? (
        <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
      ) : (
        <LinearGradient colors={colors.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct * 100}%`, height, borderRadius: height }} />
      )}
    </View>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'primary' | 'accent' | 'success' }) {
  const { colors, radius, neu } = useTheme();
  const bg = { default: colors.surface, primary: colors.primarySoft, accent: colors.accentSoft, success: colors.successSoft }[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ''}`}
      style={{
        flex: 1,
        minWidth: 130,
        backgroundColor: bg,
        borderRadius: radius.md,
        padding: 16,
        boxShadow: tone === 'default' ? neu.raised : neu.raisedSm,
      }}
    >
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="title" style={{ marginTop: 2 }}>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, minHeight: 40 },
});
