import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow, Pill, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { useLastDays } from '@/features/selectors';
import { averageMinutes } from '@/features/usage';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { dateKey, formatWeekdayShort } from '@/utils/time';

export default function Habits() {
  const { t } = useT();
  const { days, source } = useLastDays(7);
  const limits = useHabits((s) => s.limits);
  const windows = useHabits((s) => s.windows);
  const bedtime = useHabits((s) => s.bedtime);
  const budget = useHabits((s) => s.gamingBudgetMinutes);
  const demo = useApp((s) => s.demoMode);
  const avg = averageMinutes(days);
  const today = dateKey();
  const nativeReady = guard.isAvailable() && guard.hasUsageAccess();

  return (
    <Screen large title={t('habits.title')} subtitle={t('habits.subtitle')} testID="screen-habits">
      <Section title={t('habits.screenTime')}>
        <Card onPress={() => router.push('/habits/usage')} accessibilityHint={t('habits.openUsage')}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text variant="caption" color="textMuted">
                {t('habits.dailyAverage')}
              </Text>
              <Text variant="title">{avg === null ? '—' : formatMinutes(avg)}</Text>
            </View>
            <Pill
              label={source === 'device' ? t('usage.sourceDevice') : source === 'demo' ? t('usage.sourceDemo') : source === 'self' ? t('usage.sourceSelf') : t('usage.sourceNone')}
              tone={source === 'none' ? 'neutral' : 'primary'}
            />
          </Row>
          <BarChart
            bars={days.map((d) => ({ key: d.date, label: formatWeekdayShort(d.date), value: d.minutes, highlight: d.date === today }))}
            summary={t('habits.chartSummary', { avg: avg === null ? t('usage.noData') : formatMinutes(avg) })}
            height={110}
          />
        </Card>
        {!nativeReady && !demo ? (
          <Card tone="alt">
            <Text variant="small">
              {guard.isAvailable()
                ? t('habits.allowUsage')
                : Platform.OS === 'android'
                  ? t('habits.expoGoNote')
                  : t('habits.otherPlatformNote')}
            </Text>
            <Row style={{ marginTop: 10 }} wrap>
              {guard.isAvailable() ? (
                <Button label={t('permissions.openUsageSettings')} small onPress={() => guard.openUsageAccessSettings()} />
              ) : null}
              <Button label={t('habits.logToday')} small variant="secondary" icon="create-outline" onPress={() => router.push('/habits/checkin')} />
            </Row>
          </Card>
        ) : null}
      </Section>

      <Section title={t('habits.tools')}>
        <ListRow
          icon="hand-left-outline"
          title={t('tools.limits')}
          subtitle={limits.length ? t('habits.limitsCount', { count: limits.length }) : t('habits.limitsEmpty')}
          onPress={() => router.push('/habits/limits')}
          testID="row-limits"
        />
        <ListRow
          icon="calendar-outline"
          title={t('tools.windows')}
          subtitle={windows.length ? t('habits.windowsCount', { count: windows.filter((w) => w.enabled).length }) : t('habits.windowsEmpty')}
          onPress={() => router.push('/habits/schedules')}
          testID="row-windows"
        />
        <ListRow icon="moon-outline" title={t('tools.bedtime')} subtitle={bedtime.enabled ? t('common.on') : t('common.off')} onPress={() => router.push('/habits/bedtime')} />
        <ListRow icon="flash-outline" title={t('tools.focus')} subtitle={t('habits.focusSub')} onPress={() => router.push('/habits/focus')} />
        <ListRow
          icon="game-controller-outline"
          title={t('tools.gaming')}
          subtitle={t('habits.gamingSub', { budget: formatMinutes(budget) })}
          onPress={() => router.push('/habits/gaming')}
          testID="row-gaming"
        />
        <ListRow icon="bulb-outline" title={t('tools.swaps')} subtitle={t('habits.swapsSub')} onPress={() => router.push('/habits/swaps')} />
        <ListRow icon="create-outline" title={t('tools.checkin')} subtitle={t('habits.checkinSub')} onPress={() => router.push('/habits/checkin')} />
        <ListRow icon="trophy-outline" title={t('tools.challenges')} subtitle={t('habits.challengesSub')} onPress={() => router.push('/me/challenges')} />
        <ListRow icon="infinite-outline" title={t('habits.learnTitle')} subtitle={t('habits.learnSub')} onPress={() => router.push('/connect/guide/scrolling-trap')} />
      </Section>
    </Screen>
  );
}
