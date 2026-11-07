import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Segmented } from '@/components/Inputs';
import { Pill, ProgressBar, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useProgress } from '@/store/progress';
import { confirm } from '@/utils/confirm';
import { dateKey } from '@/utils/time';

type Kind = 'detox' | 'offline';

export default function Challenges() {
  const { t } = useT();
  const content = useContent();
  const params = useLocalSearchParams<{ kind?: string }>();
  const progress = useProgress((s) => s.challenges);
  const p = useProgress();
  const celebrate = useApp((s) => s.celebrate);
  const [kind, setKind] = useState<Kind>(params.kind === 'offline' ? 'offline' : 'detox');
  const today = dateKey();
  const list = content.challenges.filter((c) => c.kind === kind);
  const active = list.filter((c) => progress[c.id] && !progress[c.id].completedAt);
  const available = list.filter((c) => !progress[c.id]);
  const completed = list.filter((c) => progress[c.id]?.completedAt);

  const mark = (id: string, days: number, title: string) => {
    const { completed: justCompleted } = p.markChallengeDay(id, days, today);
    if (justCompleted) {
      celebrate({ kind: 'message', title: t('challenges.doneTitle'), body: t('challenges.doneBody', { title }) });
    }
    checkBadges();
  };

  return (
    <Screen title={t('tools.challenges')} subtitle={t('challenges.subtitle')} testID="screen-challenges">
      <Segmented
        label={t('challenges.kind')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'detox', label: t('challenges.detox') },
          { value: 'offline', label: t('challenges.offline') },
        ]}
      />
      <View style={{ height: 16 }} />
      {active.length ? (
        <Section title={t('challenges.active')}>
          {active.map((c) => {
            const pr = progress[c.id];
            const doneToday = pr.doneDates.includes(today);
            return (
              <Card key={c.id}>
                <Row>
                  <IconCircle name={c.icon} tone="accent" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{c.title}</Text>
                    <Text variant="small" color="textMuted">
                      {c.description}
                    </Text>
                  </View>
                </Row>
                <View style={{ marginVertical: 12, gap: 6 }}>
                  <ProgressBar value={pr.doneDates.length} max={c.days} label={t('challenges.progress', { done: pr.doneDates.length, total: c.days })} />
                  <Text variant="caption" color="textMuted">
                    {t('challenges.progress', { done: pr.doneDates.length, total: c.days })}
                  </Text>
                </View>
                {c.tips.map((tip) => (
                  <Text key={tip} variant="caption" color="textMuted">
                    • {tip}
                  </Text>
                ))}
                <Row style={{ marginTop: 12 }} wrap>
                  <Button
                    label={doneToday ? t('challenges.doneToday') : t('challenges.markToday')}
                    icon={doneToday ? 'checkmark-circle' : 'checkmark'}
                    small
                    variant={doneToday ? 'soft' : 'primary'}
                    onPress={() => mark(c.id, c.days, c.title)}
                  />
                  <Button label={t('challenges.restart')} small variant="ghost" onPress={() => {
                    p.restartChallenge(c.id);
                    checkBadges();
                  }} />
                  <Button
                    label={t('challenges.leave')}
                    small
                    variant="ghost"
                    onPress={async () => {
                      const ok = await confirm({ title: t('challenges.leaveTitle'), message: t('challenges.leaveBody'), confirmLabel: t('challenges.leave'), cancelLabel: t('common.cancel') });
                      if (ok) p.leaveChallenge(c.id);
                    }}
                  />
                </Row>
              </Card>
            );
          })}
        </Section>
      ) : null}

      {available.length ? (
        <Section title={t('challenges.available')}>
          {available.map((c) => (
            <Card key={c.id}>
              <Row>
                <IconCircle name={c.icon} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{c.title}</Text>
                  <Text variant="small" color="textMuted">
                    {c.description}
                  </Text>
                </View>
              </Row>
              <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
                <Pill label={t('challenges.days', { count: c.days })} icon="calendar-outline" />
                <Button label={t('challenges.start')} small icon="play" onPress={() => p.startChallenge(c.id)} testID={`challenge-start-${c.id}`} />
              </Row>
            </Card>
          ))}
        </Section>
      ) : null}

      {completed.length ? (
        <Section title={t('challenges.completed')}>
          {completed.map((c) => (
            <Card key={c.id} tone="success">
              <Row>
                <IconCircle name="trophy" tone="success" />
                <Text variant="bodyStrong" color="onSuccessSoft" style={{ flex: 1 }}>
                  {c.title}
                </Text>
                <Button label={t('challenges.again')} small variant="secondary" onPress={() => p.restartChallenge(c.id)} />
              </Row>
            </Card>
          ))}
        </Section>
      ) : null}
      <Text variant="caption" color="textMuted">
        {t('challenges.kindNote')}
      </Text>
    </Screen>
  );
}
