import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';
import { average, round1 } from '@/utils/misc';
import { dateKey, formatDate, formatTime, formatWeekdayShort, lastNDays } from '@/utils/time';

export default function MoodHistory() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const moods = useWellbeing((s) => s.moods);
  const remove = useWellbeing((s) => s.deleteMood);
  const days = lastNDays(14);

  const byDay = useMemo(
    () =>
      days.map((d) => {
        const scores = moods.filter((m) => dateKey(m.at) === d && m.context === 'general').map((m) => m.score);
        const avg = average(scores);
        return { date: d, avg: avg === null ? null : round1(avg) };
      }),
    [moods, days],
  );
  const recent = [...moods].reverse().slice(0, 40);
  const emotionLabel = (id: string) => content.emotions.find((e) => e.id === id)?.label ?? id;
  const feelingLabel = (id?: string) => content.afterScrollFeelings.find((f) => f.id === id)?.label ?? '';

  return (
    <Screen title={t('mood.historyTitle')} testID="screen-mood-history">
      {moods.length === 0 ? (
        <EmptyState icon="happy-outline" title={t('mood.emptyTitle')} body={t('mood.emptyBody')} actionLabel={t('mind.checkIn')} onAction={() => router.push('/mind/mood')} />
      ) : (
        <>
          <Card style={{ marginBottom: 20 }}>
            <Text variant="bodyStrong" style={{ marginBottom: 12 }}>
              {t('mood.twoWeeks')}
            </Text>
            <BarChart
              bars={byDay.map((d) => ({
                key: d.date,
                label: formatWeekdayShort(d.date),
                value: d.avg,
                color: d.avg ? colors.mood[Math.round(d.avg) - 1] : undefined,
              }))}
              summary={t('mood.chartSummary')}
              height={100}
            />
          </Card>
          <Section title={t('mood.entries')}>
            {recent.map((m) => (
              <Card key={m.id}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 5, backgroundColor: colors.mood[m.score - 1] }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">
                      {m.context === 'after-scroll'
                        ? t('mood.afterScrollEntry', { feeling: feelingLabel(m.feeling), app: m.app ?? t('mood.anApp') })
                        : content.moodLevels[m.score - 1].label}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {formatDate(m.at)} · {formatTime(m.at)}
                    </Text>
                    {m.emotions.length ? (
                      <Text variant="small" color="textMuted">
                        {m.emotions.map(emotionLabel).join(', ')}
                      </Text>
                    ) : null}
                    {m.note ? (
                      <Text variant="small" style={{ marginTop: 4 }}>
                        {m.note}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    label={t('common.delete')}
                    variant="ghost"
                    small
                    onPress={async () => {
                      const ok = await confirm({ title: t('mood.deleteTitle'), message: t('mood.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
                      if (ok) remove(m.id);
                    }}
                  />
                </Row>
              </Card>
            ))}
          </Section>
        </>
      )}
    </Screen>
  );
}
