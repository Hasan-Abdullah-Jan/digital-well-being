/**
 * A calm, step-by-step timed routine (eye breaks, stretches). One step at a time,
 * a big countdown, a gently pulsing circle, and clear pause / skip controls.
 */
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/features/useReduceMotion';
import { useT } from '@/i18n';
import { playSound } from '@/services/sound';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Row } from './Layout';
import { Text } from './Text';

export type RoutineStep = { id: string; title: string; body: string; seconds: number; icon: string };

function KeepAwake() {
  useKeepAwake();
  return null;
}

export function GuidedRoutine({
  steps,
  onFinish,
  onCancel,
  finishLabel,
}: {
  steps: RoutineStep[];
  onFinish: () => void;
  onCancel: () => void;
  finishLabel: string;
}) {
  const { t } = useT();
  const { colors, neu } = useTheme();
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(steps[0]?.seconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const pulse = useRef(new Animated.Value(0.88)).current;
  const step = steps[index];

  // Gentle breathing pulse while a step runs.
  useEffect(() => {
    if (reduceMotion || paused || done) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.88, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, paused, done, pulse]);

  useEffect(() => {
    if (paused || done) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [paused, done, index]);

  useEffect(() => {
    if (left > 0 || done) return;
    if (index + 1 < steps.length) {
      playSound('toggle');
      setIndex(index + 1);
      setLeft(steps[index + 1].seconds);
    } else {
      setDone(true);
      playSound('success');
    }
  }, [left, index, steps, done]);

  const skip = () => {
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      setLeft(steps[index + 1].seconds);
    } else {
      setDone(true);
      playSound('success');
    }
  };

  if (done) {
    return (
      <View style={{ gap: 16, alignItems: 'center', paddingTop: 12 }}>
        <View style={[styles.circle, { backgroundColor: colors.successSoft, boxShadow: neu.raised }]}>
          <Icon name="checkmark" size={64} color={colors.success} />
        </View>
        <Text variant="title" align="center">
          {t('routine.doneTitle')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {t('routine.doneBody')}
        </Text>
        <Button label={finishLabel} full icon="checkmark" onPress={onFinish} testID="routine-finish" />
      </View>
    );
  }

  if (!step) return null;

  return (
    <View style={{ gap: 18 }}>
      <KeepAwake />
      <Row gap={6} style={{ justifyContent: 'center' }} accessibilityLabel={t('routine.stepOf', { step: index + 1, total: steps.length })}>
        {steps.map((s, i) => (
          <View key={s.id} style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= index ? colors.primary : colors.surfaceAlt }} />
        ))}
      </Row>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={[styles.circle, { backgroundColor: colors.primarySoft, boxShadow: neu.raised, transform: [{ scale: pulse }] }]}>
          <Icon name={step.icon} size={40} color={colors.primary} />
          <Text variant="display" style={{ fontVariant: ['tabular-nums'], color: colors.primary }} accessibilityLiveRegion="polite">
            {Math.max(0, left)}
          </Text>
        </Animated.View>
      </View>
      <Card tone="glass">
        <Text variant="caption" color="textMuted">
          {t('routine.stepOf', { step: index + 1, total: steps.length })}
        </Text>
        <Text variant="title" style={{ marginTop: 2 }}>
          {step.title}
        </Text>
        <Text variant="body" color="textMuted" style={{ marginTop: 6 }}>
          {step.body}
        </Text>
      </Card>
      <Row>
        <Button label={paused ? t('routine.resume') : t('routine.pause')} icon={paused ? 'play' : 'pause'} variant="secondary" style={{ flex: 1 }} full onPress={() => setPaused((p) => !p)} />
        <Button label={t('routine.skip')} icon="play-skip-forward" variant="soft" style={{ flex: 1 }} full onPress={skip} />
      </Row>
      <Button label={t('common.cancel')} variant="ghost" small onPress={onCancel} style={{ alignSelf: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
