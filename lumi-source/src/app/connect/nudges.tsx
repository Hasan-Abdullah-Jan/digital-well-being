import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Row, Section, Stat } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useProgress } from '@/store/progress';
import { pickDaily } from '@/utils/misc';
import { dateKey, weekKey } from '@/utils/time';

export default function Nudges() {
  const { t } = useT();
  const content = useContent();
  const connections = useProgress((s) => s.connections);
  const log = useProgress((s) => s.logConnection);
  const toast = useApp((s) => s.showToast);
  const today = pickDaily(content.nudges, `${dateKey()}-nudge`);
  const doneToday = new Set(connections.filter((c) => dateKey(c.at) === dateKey()).map((c) => c.nudgeId));
  const thisWeek = connections.filter((c) => weekKey(c.at) === weekKey()).length;

  const done = (id: string) => {
    log(id);
    toast(t('nudges.nice'));
    checkBadges();
  };

  return (
    <Screen title={t('tools.nudges')} subtitle={t('nudges.subtitle')} testID="screen-nudges">
      {today ? (
        <Card tone="accent" style={{ marginBottom: 16 }}>
          <Row>
            <IconCircle name="people" tone="accent" />
            <Text variant="caption" color="onAccentSoft">
              {t('nudges.today')}
            </Text>
          </Row>
          <Text variant="title" color="onAccentSoft" style={{ marginVertical: 10 }}>
            {today.text}
          </Text>
          <Button
            label={doneToday.has(today.id) ? t('nudges.doneLabel') : t('nudges.didIt')}
            icon={doneToday.has(today.id) ? 'checkmark-circle' : 'checkmark'}
            variant="accent"
            disabled={doneToday.has(today.id)}
            onPress={() => done(today.id)}
          />
        </Card>
      ) : null}
      <Row style={{ marginBottom: 20 }}>
        <Stat label={t('nudges.thisWeek')} value={String(thisWeek)} tone="accent" />
        <Stat label={t('nudges.total')} value={String(connections.length)} />
      </Row>
      <Section title={t('nudges.more')}>
        {content.nudges
          .filter((n) => n.id !== today?.id)
          .map((n) => (
            <Card key={n.id}>
              <Row>
                <Text variant="body" style={{ flex: 1 }}>
                  {n.text}
                </Text>
                <Button
                  label={doneToday.has(n.id) ? t('nudges.doneShort') : t('nudges.didItShort')}
                  small
                  variant={doneToday.has(n.id) ? 'soft' : 'secondary'}
                  disabled={doneToday.has(n.id)}
                  onPress={() => done(n.id)}
                />
              </Row>
            </Card>
          ))}
      </Section>
      <View style={{ height: 8 }} />
      <Text variant="caption" color="textMuted">
        {t('nudges.note')}
      </Text>
    </Screen>
  );
}
