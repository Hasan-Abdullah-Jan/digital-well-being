import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TimeField } from '@/components/Inputs';
import { ListRow, Row, Section, Stat } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';
import { average, round1 } from '@/utils/misc';
import { dateKey, formatDate, formatWeekdayShort, lastNDays, sleepHours } from '@/utils/time';

export default function Sleep() {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const settings = useSettings();
  const sleep = useWellbeing((s) => s.sleep);
  const logSleep = useWellbeing((s) => s.logSleep);
  const toast = useApp((s) => s.showToast);
  const today = dateKey();
  const loggedToday = sleep.find((s) => s.date === today);
  const [bedtime, setBedtime] = useState(loggedToday?.bedtime ?? settings.bedtime);
  const [wake, setWake] = useState(loggedToday?.wake ?? settings.wakeTime);
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(loggedToday?.quality ?? 3);
  const days = lastNDays(7);
  const map = new Map(sleep.map((s) => [s.date, s.hours]));
  const week = days.map((d) => map.get(d) ?? null);
  const avg = average(week.filter((h): h is number => h !== null));

  return (
    <Screen title={t('tools.sleep')} testID="screen-sleep">
      <Section title={loggedToday ? t('sleep.updateTitle') : t('sleep.logTitle')}>
        <Row>
          <TimeField label={t('sleep.wentToBed')} value={bedtime} onChange={setBedtime} />
          <TimeField label={t('sleep.wokeUp')} value={wake} onChange={setWake} />
        </Row>
        <Text variant="small" color="textMuted">
          {t('sleep.hours', { hours: sleepHours(bedtime, wake) })}
        </Text>
        <Text variant="smallStrong">{t('sleep.quality')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
          {([1, 2, 3, 4, 5] as const).map((q) => (
            <Pressable
              key={q}
              onPress={() => setQuality(q)}
              accessibilityRole="radio"
              accessibilityState={{ checked: quality === q }}
              accessibilityLabel={t(`sleep.qualityLevels.${q}`)}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: quality === q ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: quality === q ? colors.primary : colors.border,
              }}
            >
              <Text variant="caption" style={{ color: quality === q ? colors.onPrimary : colors.text }} align="center">
                {t(`sleep.qualityLevels.${q}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          label={t('common.save')}
          full
          testID="sleep-save"
          onPress={() => {
            logSleep({ date: today, bedtime, wake, quality });
            toast(t('sleep.saved'));
            checkBadges();
          }}
        />
      </Section>

      <Row style={{ marginBottom: 16 }}>
        <Stat label={t('sleep.average')} value={avg === null ? '—' : t('sleep.hoursShort', { hours: round1(avg) })} tone="primary" />
        <Stat label={t('sleep.nights')} value={String(week.filter((h) => h !== null).length)} />
      </Row>
      <Card style={{ marginBottom: 20 }}>
        <Text variant="bodyStrong" style={{ marginBottom: 12 }}>
          {t('sleep.week')}
        </Text>
        <BarChart
          bars={days.map((d, i) => ({ key: d, label: formatWeekdayShort(d), value: week[i], highlight: (week[i] ?? 0) >= 7 }))}
          goal={8}
          summary={t('sleep.chartSummary', { avg: avg === null ? '—' : round1(avg) })}
          showValues
          formatValue={(v) => String(round1(v))}
        />
        <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
          {t('sleep.goalLine')}
        </Text>
      </Card>

      <Section title={t('sleep.tools')}>
        <ListRow icon="moon-outline" title={t('tools.bedtime')} subtitle={t('sleep.bedtimeSub')} onPress={() => router.push('/habits/bedtime')} />
        <ListRow icon="leaf-outline" title={t('bedtime.breathe')} onPress={() => router.push({ pathname: '/mind/breathe', params: { pattern: '478' } })} />
        <ListRow icon="book-outline" title={t('bedtime.guide')} onPress={() => router.push('/connect/guide/sleep-basics')} />
      </Section>
      {sleep.length ? (
        <Text variant="caption" color="textMuted">
          {t('sleep.lastLogged', { date: formatDate(sleep[sleep.length - 1].date) })}
        </Text>
      ) : null}
    </Screen>
  );
}
