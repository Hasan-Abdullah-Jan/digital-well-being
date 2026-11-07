/** Premium surfaces: glass panels and the soft glowing app background. */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** Frosted glass: blur where the platform supports it, translucent fill everywhere. */
export function Glass({ children, style, intensity = 40 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; intensity?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[{ overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.glassBorder }, style]}>
      <BlurView
        intensity={intensity}
        tint={colors.blurTint}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} pointerEvents="none" />
      {children}
    </View>
  );
}

/** Calm background: base colour with two soft colour glows (static, so it's cheap). */
export function Backdrop() {
  const { colors, scheme } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <LinearGradient colors={[colors.blobA, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.45 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', colors.blobB]} start={{ x: 0.3, y: 0.55 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {scheme === 'light' ? (
        <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.3 }} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}
