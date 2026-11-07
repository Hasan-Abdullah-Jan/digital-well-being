import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { tapFeedback } from './Button';
import { Glass } from './Surfaces';

type Tone = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'alt' | 'glass';

/**
 * default: soft-neumorphic raised card (same colour as the background, depth from shadows).
 * glass: frosted translucent panel. Other tones: tinted cards with a soft lift.
 * Pressable cards sink in (inset shadow) when touched.
 */
export function Card({
  children,
  onPress,
  tone = 'default',
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: Tone;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  const { colors, radius, neu } = useTheme();
  const bg = {
    default: colors.surface,
    primary: colors.primarySoft,
    accent: colors.accentSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    alt: colors.surfaceAlt,
    glass: 'transparent',
  }[tone];
  const base: ViewStyle = { backgroundColor: bg, borderRadius: radius.lg, padding: 18 };
  const rest = tone === 'default' ? neu.raised : tone === 'alt' ? neu.insetSm : tone === 'glass' ? neu.float : neu.raisedSm;

  if (tone === 'glass') {
    const glass = (
      <Glass style={[{ borderRadius: radius.lg, boxShadow: rest }, style as ViewStyle]}>
        <View style={{ padding: 18 }}>{children}</View>
      </Glass>
    );
    if (!onPress) return <View testID={testID} accessibilityLabel={accessibilityLabel}>{glass}</View>;
    return (
      <Pressable testID={testID} onPress={() => { tapFeedback(); onPress(); }} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
        {glass}
      </Pressable>
    );
  }

  if (!onPress) {
    return (
      <View style={[base, { boxShadow: rest }, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, { boxShadow: pressed ? neu.inset : rest, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}
