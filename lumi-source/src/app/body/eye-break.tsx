import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GuidedRoutine } from '@/components/GuidedRoutine';
import { IconCircle } from '@/components/Icon';
import { Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useBody } from '@/store/body';

/** 20-20-20 eye break: a quick 20-second version, or a fuller 1.5-minute routine. */
export default function EyeBreak() {
  const { t } = useT();
  const content = useContent();
  const add = useBody((s) => s.add);
  const showToast = useApp((s) => s.showToast);
  const [mode, setMode] = useState<'quick' | 'full' | null>(null);
  const steps = mode === 'full' ? content.eyeExercises : content.eyeExercises.slice(0, 1);

  const finish = () => {
    add('eye', 1);
    checkBadges();
    showToast(t('body.eyeLogged'));
    if (router.canGoBack()) router.back();
    else router.replace('/body');
  };

  return (
    <Screen title={t('body.eyeBreakTitle')} subtitle={t('body.eyeBreakSubtitle')} testID="screen-eye-break">
      {mode ? (
        <GuidedRoutine key={mode} steps={steps} onFinish={finish} onCancel={() => setMode(null)} finishLabel={t('body.eyeFinish')} />
      ) : (
        <View style={{ gap: 14 }}>
          <Card tone="glass">
            <Row style={{ alignItems: 'flex-start' }}>
              <IconCircle name="eye-outline" />
              <View style={{ flex: 1 }}>
                <Text variant="heading">{t('body.ruleTitle')}</Text>
                <Text variant="small" color="textMuted" style={{ marginTop: 4 }}>
                  {t('body.ruleBody')}
                </Text>
              </View>
            </Row>
          </Card>
          <Button label={t('body.quickBreak')} icon="timer-outline" full onPress={() => setMode('quick')} testID="eye-quick" />
          <Button label={t('body.fullBreak', { count: content.eyeExercises.length })} icon="sparkles-outline" variant="secondary" full onPress={() => setMode('full')} />
          <Text variant="caption" color="textMuted" align="center">
            {t('body.eyeDisclaimer')}
          </Text>
        </View>
      )}
    </Screen>
  );
}
