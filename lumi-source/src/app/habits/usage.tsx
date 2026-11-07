import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, RefreshControl, View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ListRow, ProgressBar, Row, Section, Stat } from '@/components/Layout';
import { Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { averageMinutes, minutesForDays } from '@/features/usage';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { refreshDeviceData } from '@/services/guardSync';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useTheme } from '@/theme';
import { addDaysToKey, dateKey, formatDate, formatWeekdayShort, lastNDays, weekDays, weekKey } from '@/utils/time';

export default function Usage() {
  const { t } = useT();
  const { colors } = useTheme();
  const usage = useHabits((s) => s.usage);
  const checkins = useHabits((s) => s.screenCheckins);
  const guardEvents = useHabits((s) => s.guardEvents);
  const demo = useApp((s) => s.demoMode);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [refreshing, setRefreshing] = useState(false);

  const today = dateKey();
  const todayUsage = usage.find((u) => u.date === today);
  const week = useMemo(() => minutesForDays(lastNDays(7), usage, checkins), [usage, checkins]);
  const prevWeek = useMemo(() => minutesForDays(lastNDays(7, new Date(Date.now() - 7 * 86400000)), usage, checkins), [usage, checkins]);
  const avg = averageMinutes(week.days);
  const prevAvg = averageMinutes(prevWeek.days);
  const change = avg !== null && prevAvg ? Math.round(((avg - prevAvg) / prevAvg) * 100) : null;
  const weeks = useMemo(
    () =>
      [3, 2, 1, 0].map((back) => {
        const start = addDaysToKey(weekKey(), -7 * back);
        return { start, avg: averageMinutes(minutesForDays(weekDays(start), usage, checkins).days) };
      }),
    [usage, checkins],
  );
  const pauses = guardEvents.filter((e) => Date.now() - e.at < 7 * 86400000);
  const canRead = guard.isAvailable() && guard.hasUsageAccess();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDeviceData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const noData = week.source === 'none';

  return (
    <Screen
      title={t('usage.title')}
      refreshControl={canRead ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      testID="screen-usage"
    >
      {!canRead && !demo ? (
        <Card tone="alt" style={{ marginBottom: 16 }}>
          <Text variant="small">
            {guard.isAvailable() ? t('habits.allowUsage') : Platform.OS === 'android' ? t('habits.expoGoNote') : t('habits.otherPlatformNote')}
          </Text>
          <Row style={{ marginTop: 10 }} wrap>
            {guard.isAvailable() ? <Button label={t('permissions.openUsageSettings')} small onPress={() => guard.openUsageAccessSettings()} /> : null}
            <Button label={t('habits.logToday')} small variant="secondary" onPress={() => router.push('/habits/checkin')} />
          </Row>
        </Card>
      ) : null}

      <Segmented
        label={t('usage.viewLabel')}
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: t('usage.today') },
          { value: 'week', label: t('usage.week') },
        ]}
      />

      {noData ? (
        <EmptyState icon="hourglass-outline" title={t('usage.emptyTitle')} body={t('usage.emptyBody')} actionLabel={t('habits.logToday')} onAction={() => router.push('/habits/checkin')} />
      ) : view === 'day' ? (
        <View style={{ marginTop: 16 }}>
          <Row wrap style={{ marginBottom: 16 }}>
            <Stat label={t('usage.todayTotal')} value={week.days[6].minutes === null ? '—' : formatMinutes(week.days[6].minutes)} tone="primary" />
            <Stat label={t('usage.pickups')} value={todayUsage?.pickups !== undefined ? String(todayUsage.pickups) : '—'} hint={t('usage.pickupsHint')} />
          </Row>
          {todayUsage && todayUsage.apps.length > 0 ? (
            <Section title={t('usage.topApps')}>
              {todayUsage.apps
                .slice()
                .sort((a, b) => b.minutes - a.minutes)
                .slice(0, 8)
                .map((app) => (
                  <Card key={app.packageName}>
                    <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                        {app.label}
                      </Text>
                      <Text variant="small" color="textMuted">
                        {formatMinutes(app.minutes)}
                        {app.opens ? ` · ${t('usage.opens', { count: app.opens })}` : ''}
                      </Text>
                    </Row>
                    <ProgressBar value={app.minutes} max={Math.max(...todayUsage.apps.map((a) => a.minutes), 1)} label={app.label} />
                  </Card>
                ))}
            </Section>
          ) : (
            <Card tone="alt">
              <Text variant="small" color="textMuted">
                {t('usage.selfReportedDay')}
              </Text>
            </Card>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Row wrap style={{ marginBottom: 16 }}>
            <Stat label={t('habits.dailyAverage')} value={avg === null ? '—' : formatMinutes(avg)} tone="primary" />
            <Stat
              label={t('usage.vsLastWeek')}
              value={change === null ? '—' : `${change > 0 ? '+' : ''}${change}%`}
              hint={change !== null && change < 0 ? t('usage.niceDrop') : undefined}
              tone={change !== null && change < 0 ? 'success' : 'default'}
            />
          </Row>
          <Card style={{ marginBottom: 16 }}>
            <Text variant="bodyStrong" style={{ marginBottom: 12 }}>
              {t('usage.last7')}
            </Text>
            <BarChart
              bars={week.days.map((d) => ({ key: d.date, label: formatWeekdayShort(d.date), value: d.minutes, highlight: d.date === today }))}
              summary={t('habits.chartSummary', { avg: avg === null ? t('usage.noData') : formatMinutes(avg) })}
              showValues
              formatValue={(v) => `${Math.round(v / 6) / 10}h`}
            />
          </Card>
          <Card style={{ marginBottom: 16 }}>
            <Text variant="bodyStrong" style={{ marginBottom: 12 }}>
              {t('usage.fourWeeks')}
            </Text>
            <BarChart
              bars={weeks.map((w, i) => ({ key: w.start, label: i === 3 ? t('usage.thisWeek') : formatDate(w.start, { day: 'numeric', month: 'short' }), value: w.avg, highlight: i === 3 }))}
              summary={t('usage.fourWeeksSummary')}
              showValues
              formatValue={(v) => `${Math.round(v / 6) / 10}h`}
            />
          </Card>
          {pauses.length > 0 ? (
            <Card tone="success">
              <Text variant="bodyStrong" color="onSuccessSoft">
                {t('usage.pausesTitle')}
              </Text>
              <Text variant="small" color="onSuccessSoft">
                {t('usage.pausesBody', { closed: pauses.filter((p) => p.choice === 'closed').length, total: pauses.length })}
              </Text>
            </Card>
          ) : null}
        </View>
      )}

      <Section title={t('usage.next')} style={{ marginTop: 20 }}>
        <ListRow icon="hand-left-outline" title={t('tools.limits')} onPress={() => router.push('/habits/limits')} />
        <ListRow icon="analytics-outline" title={t('me.weekly')} onPress={() => router.push('/me/insights')} />
      </Section>
      <Text variant="caption" color="textMuted">
        {t('usage.privacy')}
      </Text>
    </Screen>
  );
}
