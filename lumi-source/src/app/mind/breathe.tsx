import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useReduceMotion } from '@/features/useReduceMotion';
import { useContent, useT } from '@/i18n';
import { playSound } from '@/services/sound';
import { useSettings } from '@/store/settings';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';

const IDLE_SCALE = 0.9;

type RunState = { round: number; step: number; left: number };
type Pattern = { rounds: number; steps: { seconds: number }[] };

/** Moves the exercise forward by one second. */
function advance(r: RunState, pattern: Pattern): RunState {
  if (r.left > 1) return { ...r, left: r.left - 1 };
  const nextStep = r.step + 1;
  if (nextStep < pattern.steps.length) return { round: r.round, step: nextStep, left: pattern.steps[nextStep].seconds };
  return { round: r.round + 1, step: 0, left: pattern.steps[0].seconds };
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

export default function Breathe() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ pattern?: string }>();
  const reduceMotion = useReduceMotion();
  const haptics = useSettings((s) => s.haptics);
  const logExercise = useWellbeing((s) => s.logExercise);
  const [patternId, setPatternId] = useState(content.breathing.some((b) => b.id === params.pattern) ? params.pattern! : content.breathing[0].id);
  const pattern = content.breathing.find((b) => b.id === patternId)!;
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState<RunState>({ round: 0, step: 0, left: pattern.steps[0].seconds });
  const scale = useRef(new Animated.Value(IDLE_SCALE)).current;
  const startedAt = useRef(0);
  const { round, step, left: secondsLeft } = run;

  // Animate the circle for each phase.
  useEffect(() => {
    if (!running || round >= pattern.rounds) return;
    const phase = pattern.steps[step] ?? pattern.steps[0];
    if (phase.phase === 'in') playSound('breathe');
    if (Platform.OS !== 'web' && haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (reduceMotion) return;
    if (phase.phase === 'hold') return;
    Animated.timing(scale, {
      toValue: phase.phase === 'in' ? 1 : 0.6,
      duration: phase.seconds * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [running, step, round, pattern, reduceMotion, scale, haptics]);

  // One-second ticker that moves through steps and rounds (pure state updates).
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRun((r) => advance(r, pattern)), 1000);
    return () => clearInterval(id);
  }, [running, pattern]);

  useEffect(() => {
    if (running && round >= pattern.rounds) {
      setRunning(false);
      setDone(true);
    }
  }, [running, round, pattern.rounds]);

  useEffect(() => {
    if (!done) return;
    logExercise({ kind: 'breathing', detail: pattern.id, seconds: Math.round((Date.now() - startedAt.current) / 1000) });
    checkBadges();
  }, [done, pattern.id, logExercise]);

  const start = () => {
    startedAt.current = Date.now();
    scale.setValue(0.6);
    setRun({ round: 0, step: 0, left: pattern.steps[0].seconds });
    setDone(false);
    setRunning(true);
  };

  const phase = pattern.steps[step] ?? pattern.steps[0];

  return (
    <Screen title={t('tools.breathe')} testID="screen-breathe">
      {running ? <KeepAwake /> : null}
      {!running ? (
        <Row wrap style={{ marginBottom: 12 }}>
          {content.breathing.map((b) => (
            <Chip key={b.id} label={b.name} selected={b.id === patternId} onPress={() => setPatternId(b.id)} />
          ))}
        </Row>
      ) : null}
      <Text variant="small" color="textMuted">
        {pattern.description}
      </Text>

      <View style={styles.stage} accessible accessibilityLiveRegion="polite" accessibilityLabel={running ? `${phase.label}. ${secondsLeft}` : t('breathe.ready')}>
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
              transform: [{ scale: reduceMotion || !running ? IDLE_SCALE : scale }],
            },
          ]}
        />
        <View style={styles.center} pointerEvents="none">
          <Text variant="heading" align="center">
            {running ? phase.label : done ? t('breathe.wellDone') : t('breathe.ready')}
          </Text>
          {running ? (
            <Text variant="display" align="center" style={{ fontVariant: ['tabular-nums'] }}>
              {secondsLeft}
            </Text>
          ) : null}
        </View>
      </View>

      {running ? (
        <>
          <Text variant="small" color="textMuted" align="center">
            {t('breathe.round', { round: Math.min(round + 1, pattern.rounds), total: pattern.rounds })}
          </Text>
          <Button label={t('breathe.stop')} variant="secondary" full style={{ marginTop: 16 }} onPress={() => setRunning(false)} />
        </>
      ) : done ? (
        <Card tone="success">
          <Text variant="bodyStrong" color="onSuccessSoft">
            {t('breathe.doneTitle')}
          </Text>
          <Text variant="small" color="onSuccessSoft" style={{ marginVertical: 8 }}>
            {t('breathe.doneBody')}
          </Text>
          <Row wrap>
            <Button label={t('breathe.again')} small onPress={start} />
            <Button label={t('breathe.checkIn')} small variant="secondary" onPress={() => router.replace('/mind/mood')} />
          </Row>
        </Card>
      ) : (
        <Button label={t('breathe.start')} icon="play" full onPress={start} testID="breathe-start" />
      )}
      <Text variant="caption" color="textMuted" style={{ marginTop: 16 }}>
        {t('breathe.note')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { height: 300, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  circle: { width: 260, height: 260, borderRadius: 130, borderWidth: 3 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 4, maxWidth: 170 },
});
