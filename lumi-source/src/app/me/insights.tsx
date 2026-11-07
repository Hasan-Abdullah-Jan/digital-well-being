import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Segmented, TextField } from '@/components/Inputs';
import { ProgressBar, Row, Section, Stat } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { formatMinutes } from '@/features/celebrations';
import { buildWeeklySummary } from '@/features/insights';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';
import { addDaysToKey, formatDate, formatWeekdayShort, weekKey } from '@/utils/time';

const HIGHLIGHT_ICONS: Record<string, string> = {
  screenDown: 'hourglass-outline',
  moodUp: 'sunny-outline',
  sleepGood: 'moon-outline',
  focusDone: 'flash-outline',
  winsLogged: 'trophy-outline',
  steppedAway: 'exit-outline',
  gamingBudget: 'game-controller-outline',
};

export default function Insights() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const wellbeing = useWellbeing();
  const habits = useHabits();
  const reflections = useProgress((s) => s.reflections);
  const saveReflection = useProgress((s) => s.saveReflection);
  const toast = useApp((s) => s.showToast);
  const [offset, setOffset] = useState<'0' | '1' | '2'>('0');
  const weekStart = addDaysToKey(weekKey(), -7 * Number(offset));
  const existing = reflections.find((r) => r.weekStart === weekStart);
  const [helped, setHelped] = useState(existing?.helped ?? '');
  const [tryNext, setTryNext] = useState(existing?.tryNext ?? '');

  const summary = useMemo(
    () =>
      buildWeeklySummary(
        {
          moods: wellbeing.moods,
          sleep: wellbeing.sleep,
          journal: wellbeing.journal,
          exercises: wellbeing.exercises,
          usage: habits.usage,
          checkins: habits.screenCheckins,
          gaming: habits.gamingSessions,
          gamingBudgetMinutes: habits.gamingBudgetMinutes,
          focus: habits.focusSessions,
          guardEvents: habits.guardEvents,
        },
        weekStart,
      ),
    [wellbeing, habits, weekStart],
  );

  const moodLabel = (v: number | null) => (v === null ? '—' : `${content.moodLevels[Math.max(0, Math.min(4, Math.round(v) - 1))].label} (${v})`);

  return (
    <Screen title={t('me.weekly')} subtitle={t('insights.subtitle')} testID="screen-insights">
      <Segmented
        label={t('insights.whichWeek')}
        value={offset}
        onChange={(v) => {
          setOffset(v);
          const r = reflections.find((x) => x.weekStart === addDaysToKey(weekKey(), -7 * Number(v)));
          setHelped(r?.helped ?? '');
          setTryNext(r?.tryNext ?? '');
        }}
        options={[
          { value: '0', label: t('insights.thisWeek') },
          { value: '1', label: t('insights.lastWeek') },
          { value: '2', label: t('insights.twoAgo') },
        ]}
      />
      <Text variant="small" color="textMuted" style={{ marginTop: 10, marginBottom: 16 }}>
        {formatDate(summary.days[0], { day: 'numeric', month: 'short' })} – {formatDate(summary.days[6], { day: 'numeric', month: 'short' })}
      </Text>

      {!summary.hasData ? (
        <EmptyState icon="analytics-outline" title={t('insights.emptyTitle')} body={t('insights.emptyBody')} />
      ) : (
        <>
          {summary.highlights.length ? (
            <Section title={t('insights.highlights')}>
              {summary.highlights.map((h) => (
                <Card key={h.id} tone="success">
                  <Row>
                    <IconCircle name={HIGHLIGHT_ICONS[h.id] ?? 'sparkles-outline'} tone="success" />
                    <Text variant="body" color="onSuccessSoft" style={{ flex: 1 }}>
                      {t(`insights.highlight.${h.id}`, { ...h.params, minutes: typeof h.params.minutes === 'number' ? formatMinutes(h.params.minutes) : '' })}
                    </Text>
                  </Row>
                </Card>
              ))}
            </Section>
          ) : null}

          <Section title={t('insights.screenTitle')}>
            <Row wrap>
              <Stat label={t('habits.dailyAverage')} value={summary.screen.avg === null ? '—' : formatMinutes(summary.screen.avg)} tone="primary" />
              <Stat
                label={t('usage.vsLastWeek')}
                value={summary.screen.changePct === null ? '—' : `${summary.screen.changePct > 0 ? '+' : ''}${summary.screen.changePct}%`}
                tone={summary.screen.changePct !== null && summary.screen.changePct < 0 ? 'success' : 'default'}
              />
            </Row>
            <Card>
              <BarChart
                bars={summary.screen.days.map((d) => ({ key: d.date, label: formatWeekdayShort(d.date), value: d.minutes }))}
                summary={t('habits.chartSummary', { avg: summary.screen.avg === null ? t('usage.noData') : formatMinutes(summary.screen.avg) })}
                height={90}
              />
              <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
                {summary.screen.source === 'self' ? t('insights.sourceSelf') : summary.screen.source === 'none' ? t('insights.sourceNone') : t('insights.sourceDevice')}
              </Text>
            </Card>
          </Section>

          <Section title={t('insights.moodTitle')}>
            <Row wrap>
              <Stat label={t('insights.avgMood')} value={moodLabel(summary.mood.avg)} />
              <Stat label={t('insights.checkins')} value={String(summary.mood.count)} />
            </Row>
            <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={t('mind.weekStripLabel')}>
              {summary.mood.byDay.map((v, i) => (
                <View key={summary.days[i]} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ width: '100%', height: 26, borderRadius: 6, backgroundColor: v ? colors.mood[Math.round(v) - 1] : colors.surfaceAlt }} />
                  <Text variant="caption" color="textMuted">
                    {formatWeekdayShort(summary.days[i])}
                  </Text>
                </View>
              ))}
            </View>
            {summary.mood.topEmotions.length ? (
              <Text variant="small" color="textMuted">
                {t('insights.topFeelings', { list: summary.mood.topEmotions.map((e) => content.emotions.find((x) => x.id === e)?.label ?? e).join(', ') })}
              </Text>
            ) : null}
            {summary.afterScroll.total ? (
              <Text variant="small" color="textMuted">
                {t('insights.afterScroll', { better: summary.afterScroll.better, same: summary.afterScroll.same, worse: summary.afterScroll.worse })}
              </Text>
            ) : null}
          </Section>

          <Section title={t('insights.restTitle')}>
            <Row wrap>
              <Stat label={t('sleep.average')} value={summary.sleep.avgHours === null ? '—' : t('sleep.hoursShort', { hours: summary.sleep.avgHours })} />
              <Stat label={t('insights.focus')} value={t('insights.focusValue', { count: summary.focus.sessions })} hint={summary.focus.minutes ? formatMinutes(summary.focus.minutes) : undefined} />
            </Row>
            {summary.gaming.sessions > 0 || summary.gaming.budget > 0 ? (
              <Card>
                <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text variant="bodyStrong">{t('tools.gaming')}</Text>
                  <Text variant="small" color="textMuted">
                    {formatMinutes(summary.gaming.minutes)} / {formatMinutes(summary.gaming.budget)}
                  </Text>
                </Row>
                <ProgressBar value={summary.gaming.minutes} max={summary.gaming.budget || 1} label={t('gaming.budgetTitle')} />
              </Card>
            ) : null}
            <Text variant="small" color="textMuted">
              {t('insights.journal', { gratitude: summary.journal.gratitude, wins: summary.journal.wins, exercises: summary.exercises })}
            </Text>
            {summary.pauses.closed + summary.pauses.continued > 0 ? (
              <Text variant="small" color="textMuted">
                {t('usage.pausesBody', { closed: summary.pauses.closed, total: summary.pauses.closed + summary.pauses.continued })}
              </Text>
            ) : null}
          </Section>

          <Section title={t('insights.patternsTitle')}>
            {summary.patterns.length === 0 ? (
              <Text variant="small" color="textMuted">
                {t('insights.noPatterns')}
              </Text>
            ) : (
              summary.patterns.map((p) => (
                <Card key={p.id} tone="primary">
                  <Text variant="body" color="onPrimarySoft">
                    {t(`insights.pattern.${p.id}`, p.params)}
                  </Text>
                </Card>
              ))
            )}
            <Text variant="caption" color="textMuted">
              {t('insights.patternsNote')}
            </Text>
          </Section>
        </>
      )}

      <Section title={t('insights.reflectTitle')}>
        <TextField label={t('insights.helped')} value={helped} onChangeText={setHelped} multiline maxLength={500} />
        <TextField label={t('insights.tryNext')} value={tryNext} onChangeText={setTryNext} multiline maxLength={500} />
        <Button
          label={existing ? t('insights.updateReflection') : t('insights.saveReflection')}
          full
          disabled={!helped.trim() && !tryNext.trim()}
          onPress={() => {
            saveReflection({ weekStart, helped: helped.trim(), tryNext: tryNext.trim() });
            toast(t('insights.reflectionSaved'));
            checkBadges();
          }}
          testID="reflection-save"
        />
      </Section>
      <Text variant="caption" color="textMuted">
        {t('insights.privacy')}
      </Text>
    </Screen>
  );
}
