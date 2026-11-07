import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Chip, Pill, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { shuffle } from '@/utils/misc';

type TimeFilter = 'all' | 'quick' | 'short' | 'long';

export default function Swaps() {
  const { t } = useT();
  const content = useContent();
  const [time, setTime] = useState<TimeFilter>('all');
  const [energy, setEnergy] = useState<'any' | 'low' | 'high'>('any');
  const [together, setTogether] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  const list = useMemo(
    () =>
      content.swaps.filter((s) => {
        if (time === 'quick' && s.minutes > 5) return false;
        if (time === 'short' && (s.minutes <= 5 || s.minutes > 20)) return false;
        if (time === 'long' && s.minutes <= 20) return false;
        if (energy !== 'any' && s.energy !== energy) return false;
        if (together && !s.together) return false;
        return true;
      }),
    [content.swaps, time, energy, together],
  );
  const picked = list.find((s) => s.id === pick);

  return (
    <Screen title={t('tools.swaps')} subtitle={t('swaps.subtitle')} testID="screen-swaps">
      <Section title={t('swaps.filters')}>
        <Row wrap>
          {(['all', 'quick', 'short', 'long'] as TimeFilter[]).map((f) => (
            <Chip key={f} label={t(`swaps.time.${f}`)} selected={time === f} onPress={() => setTime(f)} />
          ))}
        </Row>
        <Row wrap>
          <Chip label={t('swaps.lowEnergy')} selected={energy === 'low'} onPress={() => setEnergy(energy === 'low' ? 'any' : 'low')} />
          <Chip label={t('swaps.highEnergy')} selected={energy === 'high'} onPress={() => setEnergy(energy === 'high' ? 'any' : 'high')} />
          <Chip label={t('swaps.together')} selected={together} onPress={() => setTogether(!together)} />
        </Row>
      </Section>
      <Button label={t('swaps.surprise')} icon="shuffle" full onPress={() => setPick(shuffle(list)[0]?.id ?? null)} disabled={list.length === 0} />
      {picked ? (
        <Card tone="success" style={{ marginTop: 16 }}>
          <Row>
            <IconCircle name="sparkles" tone="success" />
            <Text variant="heading" color="onSuccessSoft" style={{ flex: 1 }}>
              {picked.text}
            </Text>
          </Row>
        </Card>
      ) : null}
      <View style={{ gap: 10, marginTop: 20 }}>
        {list.length === 0 ? (
          <EmptyState icon="search-outline" title={t('swaps.noneTitle')} body={t('swaps.noneBody')} />
        ) : (
          list.map((s) => (
            <Card key={s.id}>
              <Text variant="body">{s.text}</Text>
              <Row style={{ marginTop: 8 }} wrap>
                <Pill label={t('swaps.minutes', { count: s.minutes })} icon="time-outline" />
                {s.together ? <Pill label={t('swaps.together')} tone="accent" icon="people-outline" /> : null}
              </Row>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
