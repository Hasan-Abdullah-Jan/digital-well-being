import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Screen } from './Screen';
import { Text } from './Text';

export const ONBOARDING_STEPS = 5;

export function OnboardingFrame({
  step,
  title,
  subtitle,
  children,
  nextLabel,
  onNext,
  nextDisabled,
  skipLabel,
  onSkip,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  nextLabel?: string;
  onNext: () => void;
  nextDisabled?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Screen
      back
      testID={`onboarding-step-${step}`}
      footer={
        <>
          <Button label={nextLabel ?? t('common.continue')} full onPress={onNext} disabled={nextDisabled} testID="onboarding-next" />
          {onSkip ? <Button label={skipLabel ?? t('common.skip')} variant="ghost" full onPress={onSkip} /> : null}
        </>
      }
    >
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('onboarding.stepOf', { step, total: ONBOARDING_STEPS })}
      >
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < step ? colors.primary : colors.border, width: i === step - 1 ? 22 : 8 }]} />
        ))}
      </View>
      <Text variant="title">{title}</Text>
      {subtitle ? (
        <Text variant="body" color="textMuted" style={{ marginTop: 6 }}>
          {subtitle}
        </Text>
      ) : null}
      <View style={{ marginTop: 20, gap: 14 }}>{children}</View>
    </Screen>
  );
}

export function goNext(path: string) {
  router.push(path);
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6, marginBottom: 18, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
