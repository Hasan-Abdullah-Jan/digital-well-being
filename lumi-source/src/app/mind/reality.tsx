import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { ProgressBar, Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useWellbeing } from '@/store/wellbeing';

export default function Reality() {
  const { t } = useT();
  const content = useContent();
  const cards = content.realityCards;
  const [index, setIndex] = useState(0);
  const logExercise = useWellbeing((s) => s.logExercise);
  const toast = useApp((s) => s.showToast);
  const card = cards[index];

  return (
    <Screen title={t('tools.reality')} subtitle={t('reality.subtitle')} testID="screen-reality">
      <ProgressBar value={index + 1} max={cards.length} label={t('reality.progress', { n: index + 1, total: cards.length })} />
      <Text variant="caption" color="textMuted" style={{ marginTop: 6 }}>
        {t('reality.progress', { n: index + 1, total: cards.length })}
      </Text>
      <Card tone="primary" style={{ marginTop: 16, minHeight: 260, justifyContent: 'center' }}>
        <IconCircle name="albums-outline" size={52} />
        <Text variant="title" color="onPrimarySoft" style={{ marginTop: 14 }} accessibilityLiveRegion="polite">
          {card.title}
        </Text>
        <Text variant="body" color="onPrimarySoft" style={{ marginTop: 10 }}>
          {card.body}
        </Text>
        <Card style={{ marginTop: 16 }}>
          <Text variant="smallStrong">{t('reality.tryThis')}</Text>
          <Text variant="small" color="textMuted">
            {card.tip}
          </Text>
        </Card>
      </Card>
      <Row style={{ marginTop: 16 }}>
        <Button label={t('common.previous')} variant="secondary" icon="chevron-back" style={{ flex: 1 }} disabled={index === 0} onPress={() => setIndex(index - 1)} />
        <Button label={t('common.next')} iconRight="chevron-forward" style={{ flex: 1 }} disabled={index === cards.length - 1} onPress={() => setIndex(index + 1)} testID="reality-next" />
      </Row>
      <Button
        label={t('reality.helped')}
        variant="ghost"
        icon="heart-outline"
        full
        style={{ marginTop: 8 }}
        onPress={() => {
          logExercise({ kind: 'reality-card', detail: card.id });
          toast(t('reality.thanks'));
          checkBadges();
        }}
      />
      <Button label={t('reality.cleanFeed')} variant="ghost" icon="filter-outline" full onPress={() => router.push('/connect/guide/feed-cleanup')} />
    </Screen>
  );
}
