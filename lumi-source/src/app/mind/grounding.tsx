import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { ProgressBar, Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';

const SENSE_ICONS: Record<string, string> = {
  see: 'eye-outline',
  touch: 'hand-left-outline',
  hear: 'ear-outline',
  smell: 'flower-outline',
  kind: 'heart-outline',
};

export default function Grounding() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const logExercise = useWellbeing((s) => s.logExercise);
  const steps = content.grounding;
  const [index, setIndex] = useState(0);
  const [ticks, setTicks] = useState(0);
  const finished = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];

  const next = () => {
    if (ticks + 1 < step.count) {
      setTicks(ticks + 1);
      return;
    }
    setTicks(0);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= steps.length) {
      logExercise({ kind: 'grounding', detail: '54321' });
      checkBadges();
    }
  };

  return (
    <Screen title={t('tools.grounding')} subtitle={t('grounding.subtitle')} testID="screen-grounding">
      <ProgressBar value={finished ? steps.length : index} max={steps.length} label={t('grounding.progress')} />
      {finished ? (
        <Card tone="success" style={{ marginTop: 24 }}>
          <Text variant="title" color="onSuccessSoft">
            {t('grounding.doneTitle')}
          </Text>
          <Text variant="body" color="onSuccessSoft" style={{ marginVertical: 10 }}>
            {t('grounding.doneBody')}
          </Text>
          <Row wrap>
            <Button
              label={t('grounding.again')}
              small
              onPress={() => {
                setIndex(0);
                setTicks(0);
              }}
            />
            <Button label={t('breathe.checkIn')} small variant="secondary" onPress={() => router.replace('/mind/mood')} />
            <Button label={t('help.button')} small variant="accent" icon="heart" onPress={() => router.push('/help')} />
          </Row>
        </Card>
      ) : (
        <View style={{ alignItems: 'center', gap: 16, marginTop: 28 }}>
          <IconCircle name={SENSE_ICONS[step.sense] ?? 'ellipse-outline'} size={84} tone="success" />
          <Text variant="title" align="center" accessibilityLiveRegion="polite">
            {step.prompt}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }} accessible accessibilityLabel={t('grounding.counted', { done: ticks, total: step.count })}>
            {Array.from({ length: step.count }, (_, i) => (
              <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i < ticks ? colors.success : colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }} />
            ))}
          </View>
          <Text variant="small" color="textMuted" align="center">
            {t('grounding.tapEach')}
          </Text>
          <Button label={ticks + 1 < step.count ? t('grounding.gotOne') : t('grounding.nextSense')} full onPress={next} testID="grounding-next" />
        </View>
      )}
    </Screen>
  );
}
