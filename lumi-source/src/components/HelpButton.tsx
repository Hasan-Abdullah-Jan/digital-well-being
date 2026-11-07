import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { tapFeedback } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/** The always-visible, one-tap way to reach a real person. */
export function HelpButton() {
  const { colors, radius, neu } = useTheme();
  const { t } = useT();
  return (
    <Pressable
      testID="help-button"
      onPress={() => {
        tapFeedback();
        router.push('/help');
      }}
      accessibilityRole="button"
      accessibilityLabel={t('help.buttonLabel')}
      accessibilityHint={t('help.buttonHint')}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: radius.pill, boxShadow: neu.float, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <LinearGradient colors={colors.gradAccent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]} />
      <Icon name="heart" size={16} color={colors.onAccent} />
      <Text variant="smallStrong" style={{ color: colors.onAccent }}>
        {t('help.button')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40 },
});
