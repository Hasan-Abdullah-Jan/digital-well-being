import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill, Row } from '@/components/Layout';
import { Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import type { JournalType } from '@/store/types';
import { useWellbeing } from '@/store/wellbeing';
import { formatDate } from '@/utils/time';

type Filter = 'all' | JournalType;

const TONES: Record<JournalType, 'success' | 'accent' | 'primary' | 'neutral'> = {
  gratitude: 'accent',
  win: 'success',
  reflection: 'primary',
  worry: 'neutral',
};

export default function Journal() {
  const { t } = useT();
  const journal = useWellbeing((s) => s.journal);
  const [filter, setFilter] = useState<Filter>('all');
  const list = [...journal].filter((j) => filter === 'all' || j.type === filter).sort((a, b) => b.at - a.at);

  return (
    <Screen
      title={t('journal.title')}
      testID="screen-journal"
      footer={
        <Button
          label={t('journal.new')}
          icon="add"
          full
          onPress={() => router.push({ pathname: '/mind/journal-entry', params: { type: filter === 'all' ? 'gratitude' : filter } })}
          testID="journal-new"
        />
      }
    >
      <Segmented
        label={t('journal.filter')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('journal.all') },
          { value: 'gratitude', label: t('journal.short.gratitude') },
          { value: 'win', label: t('journal.short.win') },
          { value: 'reflection', label: t('journal.short.reflection') },
        ]}
      />
      <View style={{ gap: 12, marginTop: 16 }}>
        {list.length === 0 ? (
          <EmptyState icon="book-outline" title={t('journal.emptyTitle')} body={t('journal.emptyBody')} />
        ) : (
          list.map((j) => (
            <Card key={j.id} onPress={() => router.push({ pathname: '/mind/journal-entry', params: { id: j.id } })} accessibilityHint={t('common.edit')}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Pill label={t(`journal.types.${j.type}`)} tone={TONES[j.type]} />
                <Text variant="caption" color="textMuted">
                  {formatDate(j.at)}
                </Text>
              </Row>
              {j.prompt ? (
                <Text variant="caption" color="textMuted">
                  {j.prompt}
                </Text>
              ) : null}
              <Text variant="body" numberOfLines={4}>
                {j.type === 'worry' && j.closed ? t('journal.closedWorry') : j.text}
              </Text>
            </Card>
          ))
        )}
      </View>
      <Text variant="caption" color="textMuted" style={{ marginTop: 16 }}>
        {t('journal.privacy')}
      </Text>
    </Screen>
  );
}
