import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { playSound, type SoundName } from '@/services/sound';
import { useSettings } from '@/store/settings';
import { TOUCH, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'accent' | 'danger';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName | string;
  iconRight?: IconName | string;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  small?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
};

/** Gentle feedback on every tap: a soft click and a light haptic (both can be turned off). */
export function tapFeedback(sound: SoundName = 'tap') {
  playSound(sound);
  if (Platform.OS === 'web' || !useSettings.getState().haptics) return;
  Haptics.selectionAsync().catch(() => undefined);
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  disabled,
  loading,
  full,
  small,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors, radius, neu } = useTheme();
  const inactive = disabled || loading;
  const gradient = variant === 'primary' ? colors.gradPrimary : variant === 'accent' ? colors.gradAccent : null;
  const fg = {
    primary: colors.onPrimary,
    accent: colors.onAccent,
    secondary: colors.text,
    soft: colors.onPrimarySoft,
    ghost: colors.primary,
    danger: colors.onDangerSoft,
  }[variant];
  const bg = { primary: 'transparent', accent: 'transparent', secondary: colors.surface, soft: colors.primarySoft, ghost: 'transparent', danger: colors.dangerSoft }[variant];
  const height = small ? 40 : TOUCH + 6;

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (inactive) return;
        tapFeedback();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: height,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignSelf: full ? 'stretch' : 'auto',
          opacity: inactive ? 0.5 : 1,
          transform: [{ scale: pressed && !inactive ? 0.97 : 1 }],
          boxShadow:
            variant === 'ghost'
              ? undefined
              : pressed
                ? variant === 'secondary'
                  ? neu.insetSm
                  : undefined
                : gradient
                  ? neu.float
                  : neu.raisedSm,
        },
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
      ) : null}
      <View style={[styles.inner, { minHeight: height, paddingHorizontal: small ? 16 : 22 }]}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.row}>
            {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
            <Text variant={small ? 'smallStrong' : 'bodyStrong'} style={{ color: fg }} numberOfLines={2} align="center">
              {label}
            </Text>
            {iconRight ? <Icon name={iconRight} size={small ? 18 : 20} color={fg} /> : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
