import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { Stepper, TimeField } from '@/components/Inputs';
import { Chip, ProgressBar, Row, Section, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { guard } from '@/native/guard';
import { syncGuard, usesNativeEyeRest } from '@/services/guardSync';
import { playSound } from '@/services/sound';
import { requestNotificationPermission, syncReminders } from '@/services/notifications';
import { BODY_METRICS, bodyScore, dayOf, useBody } from '@/store/body';
import type { BodyMetric, BodyReminders } from '@/store/types';
import { useTheme } from '@/theme';
import { pickDaily } from '@/utils/misc';
import { dateKey, formatWeekdayShort, lastNDays } from '@/utils/time';

type MetricInfo = {
  icon: string;
  tone: 'primary' | 'accent' | 'success' | 'warning';
  /** Quick-add amounts. */
  adds: number[];
  /** A guided routine that logs this metric. */
  route?: string;
  max: number;
  step: number;
};

const METRIC_INFO: Record<BodyMetric, MetricInfo> = {
  water: { icon: 'water-outline', tone: 'primary', adds: [1], max: 16, step: 1 },
  move: { icon: 'walk-outline', tone: 'success', adds: [5, 15], max: 180, step: 5 },
  stretch: { icon: 'body-outline', tone: 'accent', adds: [1], route: '/body/stretch', max: 10, step: 1 },
  eye: { icon: 'eye-outline', tone: 'primary', adds: [1], route: '/body/eye-break', max: 20, step: 1 },
  outdoor: { icon: 'sunny-outline', tone: 'warning', adds: [10, 30], max: 240, step: 10 },
};

const INTERVALS: Record<'eye' | 'move' | 'water', number[]> = {
  eye: [20, 30, 45, 60],
  move: [45, 60, 90],
  water: [60, 90, 120],
};

export default function Body() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const days = useBody((s) => s.days);
  const targets = useBody((s) => s.targets);
  const reminders = useBody((s) => s.reminders);
  const add = useBody((s) => s.add);
  const setTarget = useBody((s) => s.setTarget);
  const setReminders = useBody((s) => s.setReminders);
  const [chartMetric, setChartMetric] = useState<BodyMetric>('water');
  const [editing, setEditing] = useState(false);

  const today = dayOf(days);
  const score = bodyScore(today, targets);
  const week = lastNDays(7);
  const tip = useMemo(() => pickDaily(content.eyeTips, dateKey()), [content.eyeTips]);
  const smartEye = usesNativeEyeRest() || (guard.isAvailable() && guard.hasUsageAccess());

  const log = (metric: BodyMetric, amount: number) => {
    const before = today[metric];
    add(metric, amount);
    if (amount > 0 && before < targets[metric] && before + amount >= targets[metric]) playSound('success');
    checkBadges();
  };

  const updateReminders = async (patch: Partial<BodyReminders>, turningOn = false) => {
    if (turningOn) await requestNotificationPermission();
    setReminders(patch);
    syncGuard();
    void syncReminders();
  };

  const label = (m: BodyMetric) => t(`body.metric.${m}`);
  const amount = (m: BodyMetric, v: number) => t(`body.unit.${m}`, { count: v });

  return (
    <Screen title={t('body.title')} subtitle={t('body.subtitle')} testID="screen-body">
      <Card tone="glass" style={{ marginBottom: 20 }}>
        <Row>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="caption" color="textMuted">
              {t('body.todayScore')}
            </Text>
            <Text variant="display">{Math.round(score * 100)}%</Text>
            <Text variant="small" color="textMuted">
              {score >= 1 ? t('body.allDone') : t('body.goalsMet', { done: BODY_METRICS.filter((m) => today[m] >= targets[m]).length, total: BODY_METRICS.length })}
            </Text>
          </View>
          <IconCircle name={score >= 1 ? 'trophy' : 'body'} size={64} tone={score >= 1 ? 'success' : 'primary'} />
        </Row>
        <View style={{ marginTop: 14 }}>
          <ProgressBar value={score} max={1} height={12} label={t('body.todayScore')} />
        </View>
        <Row style={{ marginTop: 14 }} wrap>
          <Button label={t('body.eyeBreakShort')} small icon="eye-outline" onPress={() => router.push('/body/eye-break')} testID="body-eye-break" />
          <Button label={t('body.stretchShort')} small variant="secondary" icon="body-outline" onPress={() => router.push('/body/stretch')} />
        </Row>
      </Card>

      <Section title={t('body.todayTitle')} action={<Button label={t('body.editTargets')} variant="ghost" small onPress={() => setEditing(true)} />}>
        {BODY_METRICS.map((m) => {
          const info = METRIC_INFO[m];
          const value = today[m];
          const met = value >= targets[m];
          return (
            <Card key={m} testID={`metric-${m}`}>
              <Row>
                <IconCircle name={met ? 'checkmark' : info.icon} tone={met ? 'success' : info.tone} size={42} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{label(m)}</Text>
                  <Text variant="small" color="textMuted">
                    {t('body.ofTarget', { value, target: amount(m, targets[m]) })}
                  </Text>
                </View>
                <Text variant="heading" color={met ? 'success' : 'textMuted'}>
                  {Math.min(100, Math.round((value / Math.max(1, targets[m])) * 100))}%
                </Text>
              </Row>
              <View style={{ marginTop: 12 }}>
                <ProgressBar value={value} max={targets[m]} color={met ? colors.success : undefined} label={label(m)} />
              </View>
              <Row gap={8} style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                {value > 0 ? (
                  <Button label="" icon="remove" variant="secondary" small onPress={() => log(m, -info.adds[0])} accessibilityLabel={t('body.undo', { what: label(m) })} />
                ) : null}
                {info.adds.map((a) => (
                  <Button key={a} label={`+${a}`} small variant={info.route ? 'secondary' : 'soft'} onPress={() => log(m, a)} accessibilityLabel={t('body.addA11y', { amount: amount(m, a) })} testID={`add-${m}-${a}`} />
                ))}
                {info.route ? (
                  <Button label={t('body.start')} small icon="play" variant="soft" onPress={() => router.push(info.route as never)} />
                ) : null}
              </Row>
            </Card>
          );
        })}
      </Section>

      <Section title={t('body.weekTitle')}>
        <Row wrap gap={8}>
          {BODY_METRICS.map((m) => (
            <Chip key={m} label={label(m)} selected={chartMetric === m} onPress={() => setChartMetric(m)} />
          ))}
        </Row>
        <Card>
          <BarChart
            bars={week.map((d) => ({ key: d, label: formatWeekdayShort(d), value: dayOf(days, d)[chartMetric], highlight: d === dateKey() }))}
            goal={targets[chartMetric]}
            showValues
            summary={t('body.chartSummary', { metric: label(chartMetric) })}
            height={120}
          />
        </Card>
      </Section>

      <Section title={t('body.remindersTitle')}>
        {(['eye', 'move', 'water'] as const).map((kind) => (
          <View key={kind} style={{ gap: 10 }}>
            <ToggleRow
              icon={kind === 'eye' ? 'eye-outline' : kind === 'move' ? 'walk-outline' : 'water-outline'}
              title={t(`body.reminder.${kind}`)}
              subtitle={reminders[kind].enabled ? t('body.everyMinutes', { count: reminders[kind].every }) : t(`body.reminder.${kind}Sub`)}
              value={reminders[kind].enabled}
              onChange={(enabled) => void updateReminders({ [kind]: { ...reminders[kind], enabled } }, enabled)}
              testID={`reminder-${kind}`}
            />
            {reminders[kind].enabled ? (
              <Row wrap gap={8} style={{ paddingLeft: 8 }}>
                {INTERVALS[kind].map((every) => (
                  <Chip key={every} label={t('body.everyShort', { count: every })} selected={reminders[kind].every === every} onPress={() => void updateReminders({ [kind]: { ...reminders[kind], every } })} />
                ))}
              </Row>
            ) : null}
          </View>
        ))}
        <Row>
          <TimeField label={t('body.from')} value={reminders.from} onChange={(from) => void updateReminders({ from })} />
          <TimeField label={t('body.to')} value={reminders.to} onChange={(to) => void updateReminders({ to })} />
        </Row>
        <Text variant="caption" color="textMuted">
          {reminders.eye.enabled && smartEye ? t('body.smartEye') : t('body.remindersNote')}
        </Text>
      </Section>

      {tip ? (
        <Card tone="success">
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="bulb-outline" color={colors.onSuccessSoft} />
            <View style={{ flex: 1 }}>
              <Text variant="smallStrong" color="onSuccessSoft">
                {t('body.tipTitle')}
              </Text>
              <Text variant="small" color="onSuccessSoft">
                {tip}
              </Text>
            </View>
          </Row>
        </Card>
      ) : null}

      <Sheet visible={editing} onClose={() => setEditing(false)} title={t('body.targetsTitle')}>
        {BODY_METRICS.map((m) => (
          <Stepper
            key={m}
            label={label(m)}
            value={targets[m]}
            min={1}
            max={METRIC_INFO[m].max}
            step={METRIC_INFO[m].step}
            format={(v) => amount(m, v)}
            onChange={(v) => setTarget(m, v)}
          />
        ))}
        <Button label={t('common.done')} full onPress={() => setEditing(false)} />
      </Sheet>
    </Screen>
  );
}
