import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GuidedRoutine } from '@/components/GuidedRoutine';
import { Icon } from '@/components/Icon';
import { Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useBody } from '@/store/body';
import { useTheme } from '@/theme';

/** A three-minute "phone posture" stretch break. */
export default function Stretch() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const add = useBody((s) => s.add);
  const showToast = useApp((s) => s.showToast);
  const [running, setRunning] = useState(false);
  const minutes = Math.round(content.stretches.reduce((s, x) => s + x.seconds, 0) / 60);

  const finish = () => {
    add('stretch', 1);
    add('move', minutes);
    checkBadges();
    showToast(t('body.stretchLogged'));
    if (router.canGoBack()) router.back();
    else router.replace('/body');
  };

  return (
    <Screen title={t('body.stretchTitle')} subtitle={t('body.stretchSubtitle', { count: minutes })} testID="screen-stretch">
      {running ? (
        <GuidedRoutine steps={content.stretches} onFinish={finish} onCancel={() => setRunning(false)} finishLabel={t('body.stretchFinish')} />
      ) : (
        <View style={{ gap: 12 }}>
          {content.stretches.map((s, i) => (
            <Card key={s.id}>
              <Row style={{ alignItems: 'flex-start' }}>
                <Text variant="heading" color="primary" style={{ width: 24 }}>
                  {i + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{s.title}</Text>
                  <Text variant="small" color="textMuted">
                    {s.body}
                  </Text>
                </View>
                <Icon name={s.icon} color={colors.textMuted} />
              </Row>
            </Card>
          ))}
          <Button label={t('body.stretchStart')} icon="play" full onPress={() => setRunning(true)} testID="stretch-start" />
          <Text variant="caption" color="textMuted" align="center">
            {t('body.stretchSafety')}
          </Text>
        </View>
      )}
    </Screen>
  );
}
