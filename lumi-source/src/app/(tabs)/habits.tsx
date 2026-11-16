import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { ListRow, Pill, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { useLastDays } from '@/features/selectors';
import { crewStatus } from '@/features/crew';
import { averageMinutes } from '@/features/usage';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { useApp } from '@/store/app';
import { bodyScore, dayOf, useBody } from '@/store/body';
import { useCrew } from '@/store/crew';
import { isCommitLocked, useHabits } from '@/store/habits';
import { useTheme } from '@/theme';
import { dateKey, formatDate, formatTime, formatWeekdayShort } from '@/utils/time';

export default function Habits() {
  const { t } = useT();
  const { days, source } = useLastDays(7);
  const limits = useHabits((s) => s.limits);
  const windows = useHabits((s) => s.windows);
  const bedtime = useHabits((s) => s.bedtime);
  const budget = useHabits((s) => s.gamingBudgetMinutes);
  const strict = useHabits((s) => s.strict);
  const guardEnabled = useHabits((s) => s.guardEnabled);
  const activeFocus = useHabits((s) => s.activeFocus);
  const bodyDays = useBody((s) => s.days);
  const bodyTargets = useBody((s) => s.targets);
  const eyeOn = useBody((s) => s.reminders.eye.enabled);
  const crews = useCrew((s) => s.crews);
  const { colors } = useTheme();
  const locked = isCommitLocked(strict);
  const bodyPct = bodyScore(dayOf(bodyDays), bodyTargets);
  const activeCrews = crews.filter((c) => !c.archived && crewStatus(c) !== 'finished').length;
  const demo = useApp((s) => s.demoMode);
  const avg = averageMinutes(days);
  const today = dateKey();
  const nativeReady = guard.isAvailable() && guard.hasUsageAccess();
  const canEnforce = guard.isAvailable() || demo;
  const protectionOn = canEnforce && guardEnabled && limits.some((l) => l.enabled);
  const protectionRoute = limits.length === 0 || !guardEnabled ? '/habits/limits' : '/habits/strict';
  const protectionLine = !canEnforce
    ? t('habits.protectUnavailable')
    : limits.length === 0
      ? t('habits.protectSetup')
      : !guardEnabled
        ? t('habits.protectTurnOn')
        : locked
          ? t('habits.protectLocked', { date: formatDate(strict.lockedUntil, { weekday: 'short', day: 'numeric', month: 'short' }) })
          : strict.enabled
            ? t('habits.protectStrict')
            : t('habits.protectGentle');

  return (
    <Screen large title={t('habits.title')} subtitle={t('habits.subtitle')} testID="screen-habits">
      <Card tone="glass" style={{ marginBottom: 20 }} onPress={() => router.push(protectionRoute)} testID="card-protection">
        <Row>
          <IconCircle name={protectionOn ? 'shield-checkmark' : 'shield-outline'} tone={protectionOn ? 'success' : 'neutral'} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{protectionOn ? t('habits.protectOn') : t('habits.protectOff')}</Text>
            <Text variant="small" color="textMuted">
              {protectionLine}
            </Text>
          </View>
          <Icon name="chevron-forward" color={colors.textMuted} />
        </Row>
        <Row wrap gap={8} style={{ marginTop: 12 }}>
          <Pill label={t('habits.pillLimits', { count: limits.filter((l) => l.enabled).length })} tone={limits.some((l) => l.enabled) ? 'primary' : 'neutral'} icon="hand-left-outline" />
          <Pill label={strict.enabled ? t('habits.pillStrictOn') : t('habits.pillStrictOff')} tone={strict.enabled ? 'success' : 'neutral'} icon="shield-half-outline" />
          {locked ? <Pill label={t('habits.pillLocked')} tone="accent" icon="lock-closed-outline" /> : null}
          {activeFocus ? <Pill label={t('habits.pillFocus')} tone="warning" icon="flash-outline" /> : null}
          {eyeOn ? <Pill label={t('habits.pillEye')} tone="primary" icon="eye-outline" /> : null}
        </Row>
      </Card>

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

      <Section title={t('habits.groupControl')}>
        <ListRow
          icon="hand-left-outline"
          title={t('tools.limits')}
          subtitle={limits.length ? t('habits.limitsCount', { count: limits.length }) : t('habits.limitsEmpty')}
          onPress={() => router.push('/habits/limits')}
          testID="row-limits"
        />
        <ListRow
          icon={strict.enabled ? 'shield-checkmark' : 'shield-half-outline'}
          tone={strict.enabled ? 'success' : undefined}
          title={t('strict.title')}
          subtitle={locked ? t('habits.strictLocked') : strict.enabled ? t('strict.rowOn') : t('habits.strictSub')}
          onPress={() => router.push('/habits/strict')}
          testID="row-strict"
        />
        <ListRow
          icon="calendar-outline"
          title={t('tools.windows')}
          subtitle={windows.length ? t('habits.windowsCount', { count: windows.filter((w) => w.enabled).length }) : t('habits.windowsEmpty')}
          onPress={() => router.push('/habits/schedules')}
          testID="row-windows"
        />
        <ListRow icon="moon-outline" title={t('tools.bedtime')} subtitle={bedtime.enabled ? t('common.on') : t('common.off')} onPress={() => router.push('/habits/bedtime')} />
      </Section>

      <Section title={t('habits.groupFocus')}>
        <ListRow
          icon="flash-outline"
          title={t('tools.focus')}
          subtitle={activeFocus ? t('habits.focusRunning', { time: formatTime(activeFocus.endsAt) }) : t('habits.focusSub')}
          tone={activeFocus ? 'warning' : undefined}
          onPress={() => router.push('/habits/focus')}
          testID="row-focus"
        />
        <ListRow
          icon="game-controller-outline"
          title={t('tools.gaming')}
          subtitle={t('habits.gamingSub', { budget: formatMinutes(budget) })}
          onPress={() => router.push('/habits/gaming')}
          testID="row-gaming"
        />
      </Section>

      <Section title={t('habits.groupBody')}>
        <ListRow
          icon="eye-outline"
          title={t('body.title')}
          subtitle={t('habits.bodySub', { percent: Math.round(bodyPct * 100) })}
          onPress={() => router.push('/body')}
          testID="row-body"
        />
        <ListRow icon="body-outline" title={t('body.stretchTitle')} subtitle={t('habits.stretchSub')} onPress={() => router.push('/body/stretch')} />
      </Section>

      <Section title={t('habits.groupOffline')}>
        <ListRow
          icon="people-circle-outline"
          tone="accent"
          title={t('crew.title')}
          subtitle={activeCrews ? t('habits.crewCount', { count: activeCrews }) : t('habits.crewSub')}
          onPress={() => router.push('/crew')}
          testID="row-crew"
        />
        <ListRow icon="trophy-outline" title={t('tools.challenges')} subtitle={t('habits.challengesSub')} onPress={() => router.push('/me/challenges')} />
        <ListRow icon="bulb-outline" title={t('tools.swaps')} subtitle={t('habits.swapsSub')} onPress={() => router.push('/habits/swaps')} />
      </Section>

      <Section title={t('habits.groupLearn')}>
        <ListRow icon="create-outline" title={t('tools.checkin')} subtitle={t('habits.checkinSub')} onPress={() => router.push('/habits/checkin')} />
        <ListRow icon="infinite-outline" title={t('habits.learnTitle')} subtitle={t('habits.learnSub')} onPress={() => router.push('/connect/guide/scrolling-trap')} />
      </Section>
    </Screen>
  );
}
