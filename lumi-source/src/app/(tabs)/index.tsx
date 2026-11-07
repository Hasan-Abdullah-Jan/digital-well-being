import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { Pill, Row, Section } from '@/components/Layout';
import { MoodPicker } from '@/components/MoodPicker';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { featuredTools, TOOLS } from '@/features/personalise';
import { greetingKey, nextWindow, useLastDays } from '@/features/selectors';
import { currentStreakLength, isLoggedToday } from '@/features/streaks';
import { personalisedQuotes } from '@/features/sync';
import { useContent, useT } from '@/i18n';
import { shouldOfferLowMoodSupport } from '@/safety/detect';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';
import { pickDaily, shuffle } from '@/utils/misc';
import { dateKey, formatClock, formatDate, formatTime } from '@/utils/time';


export default function Today() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const settings = useSettings();
  const moods = useWellbeing((s) => s.moods);
  const windows = useHabits((s) => s.windows);
  const activeFocus = useHabits((s) => s.activeFocus);
  const activeGaming = useHabits((s) => s.activeGaming);
  const streaks = useProgress((s) => s.streaks);
  const logStreak = useProgress((s) => s.logStreak);
  const { days, source } = useLastDays(2);
  const [quoteOffset, setQuoteOffset] = useState(0);
  const [swapSeed, setSwapSeed] = useState(0);

  const today = dateKey();
  const todayMoods = moods.filter((m) => dateKey(m.at) === today && m.context === 'general');
  const lastMood = todayMoods[todayMoods.length - 1];
  const goals = settings.goals;
  const quotes = useMemo(() => (goals ? personalisedQuotes() : []), [goals]);
  const quote = quotes.length ? (quoteOffset === 0 ? pickDaily(quotes, today) : quotes[(quoteOffset + quotes.length) % quotes.length]) : undefined;
  const swap = useMemo(() => {
    const pool = shuffle(content.swaps);
    return pool[swapSeed % pool.length];
  }, [content.swaps, swapSeed]);
  const next = nextWindow(windows);
  const tools = featuredTools(settings.concerns);
  const offerSupport = shouldOfferLowMoodSupport(moods, settings.lowMoodSupportShownAt);
  const activeStreak = streaks.filter((s) => s.active).sort((a, b) => currentStreakLength(b) - currentStreakLength(a))[0];
  const todayMinutes = days[1]?.minutes ?? null;
  const yesterdayMinutes = days[0]?.minutes ?? null;
  const nudge = pickDaily(content.nudges, `${today}-nudge`);
  const name = settings.nickname.trim();

  return (
    <Screen
      large
      title={name ? t(`today.greeting.${greetingKey()}Name`, { name }) : t(`today.greeting.${greetingKey()}`)}
      subtitle={formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
      testID="screen-today"
    >
      {quote ? (
        <Card tone="glass" style={{ marginBottom: 20 }} accessibilityLabel={`${t('today.quoteLabel')}: ${quote}`}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="sparkles" color={colors.primary} />
            <Text variant="heading" style={{ flex: 1 }}>
              {quote}
            </Text>
          </Row>
          <Button label={t('today.anotherQuote')} variant="ghost" small icon="refresh" onPress={() => setQuoteOffset((o) => o + 1)} style={{ alignSelf: 'flex-end', marginTop: 6 }} />
        </Card>
      ) : null}

      {activeFocus || activeGaming ? (
        <Card tone="warning" style={{ marginBottom: 16 }} onPress={() => router.push(activeFocus ? '/habits/focus' : '/habits/gaming')}>
          <Row>
            <IconCircle name={activeFocus ? 'flash' : 'game-controller'} tone="warning" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color="onWarningSoft">
                {activeFocus ? t('today.focusRunning') : t('today.gamingRunning')}
              </Text>
              <Text variant="small" color="onWarningSoft">
                {t('today.endsAt', { time: formatTime((activeFocus ?? activeGaming)!.endsAt) })}
              </Text>
            </View>
            <Icon name="chevron-forward" color={colors.onWarningSoft} />
          </Row>
        </Card>
      ) : null}

      {offerSupport ? (
        <Card tone="accent" style={{ marginBottom: 16 }}>
          <Text variant="bodyStrong" color="onAccentSoft">
            {t('today.supportTitle')}
          </Text>
          <Text variant="small" color="onAccentSoft" style={{ marginVertical: 8 }}>
            {t('today.supportBody')}
          </Text>
          <Row wrap>
            <Button label={t('today.supportOptions')} variant="accent" small onPress={() => router.push('/help')} />
            <Button label={t('common.notNow')} variant="ghost" small onPress={() => settings.update({ lowMoodSupportShownAt: Date.now() })} />
          </Row>
        </Card>
      ) : null}

      <Section title={t('today.checkinTitle')}>
        {lastMood ? (
          <Card onPress={() => router.push('/mind/mood')} accessibilityHint={t('today.checkinAgain')}>
            <Row>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.mood[lastMood.score - 1] }} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {t('today.checkedIn', { mood: content.moodLevels[lastMood.score - 1].label })}
              </Text>
              <Text variant="small" color="primary">
                {t('today.checkinAgain')}
              </Text>
            </Row>
          </Card>
        ) : (
          <Card>
            <Text variant="body" style={{ marginBottom: 12 }}>
              {t('today.howAreYou')}
            </Text>
            <MoodPicker value={null} onChange={(score) => router.push({ pathname: '/mind/mood', params: { score: String(score) } })} />
          </Card>
        )}
      </Section>

      <Section title={t('today.screenTitle')} action={<Button label={t('common.details')} variant="ghost" small onPress={() => router.push('/habits/usage')} />}>
        <Card onPress={() => router.push(todayMinutes === null && source !== 'device' ? '/habits/checkin' : '/habits/usage')}>
          {todayMinutes !== null ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="textMuted">
                  {source === 'self' ? t('today.screenSelf') : t('today.screenSoFar')}
                </Text>
                <Text variant="title">{formatMinutes(todayMinutes)}</Text>
                {yesterdayMinutes !== null ? (
                  <Text variant="small" color="textMuted">
                    {t('today.yesterday', { time: formatMinutes(yesterdayMinutes) })}
                  </Text>
                ) : null}
              </View>
              <IconCircle name="hourglass-outline" />
            </Row>
          ) : (
            <Row>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('today.screenEmptyTitle')}</Text>
                <Text variant="small" color="textMuted">
                  {t('today.screenEmptyBody')}
                </Text>
              </View>
              <Icon name="chevron-forward" color={colors.textMuted} />
            </Row>
          )}
        </Card>
        {next ? (
          <Card tone="alt" onPress={() => router.push('/habits/schedules')}>
            <Row>
              <IconCircle name={content.windowKinds.find((k) => k.id === next.window.kind)?.icon ?? 'time-outline'} tone={next.active ? 'success' : 'neutral'} size={40} />
              <Text variant="small" style={{ flex: 1 }}>
                {next.active
                  ? t('today.windowActive', { label: next.window.label, end: formatClock(next.window.end) })
                  : t('today.windowNext', {
                      label: next.window.label,
                      day: next.startsAt.toDateString() === new Date().toDateString() ? t('today.todayWord') : formatDate(next.startsAt, { weekday: 'long' }),
                      time: formatClock(next.window.start),
                    })}
              </Text>
            </Row>
          </Card>
        ) : null}
      </Section>

      {activeStreak ? (
        <Section title={t('today.streakTitle')}>
          <Card>
            <Row>
              <IconCircle name="flame-outline" tone="accent" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{activeStreak.target.label}</Text>
                <Text variant="small" color="textMuted">
                  {t('streaks.days', { count: currentStreakLength(activeStreak) })}
                </Text>
              </View>
            </Row>
            {activeStreak.target.kind === 'custom' && !isLoggedToday(activeStreak) ? (
              <Row style={{ marginTop: 12 }} wrap>
                <Button label={t('streaks.keptIt')} small icon="checkmark" onPress={() => logStreak(activeStreak.id, true)} />
                <Button label={t('streaks.slipped')} small variant="secondary" onPress={() => {
                  logStreak(activeStreak.id, false);
                  router.push('/me/streaks');
                }} />
              </Row>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section title={t('today.swapTitle')}>
        <Card tone="success">
          <Row>
            <IconCircle name="bulb-outline" tone="success" />
            <Text variant="bodyStrong" color="onSuccessSoft" style={{ flex: 1 }}>
              {swap?.text}
            </Text>
          </Row>
          <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <Pill label={t('swaps.minutes', { count: swap?.minutes ?? 2 })} tone="success" icon="time-outline" />
            <Button label={t('today.anotherIdea')} variant="ghost" small icon="shuffle" onPress={() => setSwapSeed((s) => s + 1)} />
          </Row>
        </Card>
      </Section>

      <Section title={t('today.forYou')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {tools.map((id) => (
            <Card key={id} onPress={() => router.push(TOOLS[id].route)} style={{ flexBasis: '46%', flexGrow: 1 }} testID={`tool-${id}`}>
              <IconCircle name={TOOLS[id].icon} size={40} />
              <Text variant="bodyStrong" style={{ marginTop: 10 }}>
                {t(TOOLS[id].key)}
              </Text>
            </Card>
          ))}
        </View>
      </Section>

      {nudge ? (
        <Section title={t('today.connectTitle')}>
          <Card onPress={() => router.push('/connect/nudges')}>
            <Row>
              <IconCircle name="people-outline" tone="accent" />
              <Text variant="body" style={{ flex: 1 }}>
                {nudge.text}
              </Text>
            </Row>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
