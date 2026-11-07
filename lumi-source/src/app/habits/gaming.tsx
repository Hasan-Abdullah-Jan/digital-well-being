import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Stepper, TextField } from '@/components/Inputs';
import { Chip, ListRow, ProgressBar, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { formatMinutes } from '@/features/celebrations';
import { gameMinutesFromUsage } from '@/features/usage';
import { formatCountdown, useNow } from '@/features/useNow';
import { useContent, useT } from '@/i18n';
import { cancelTimer, scheduleTimer } from '@/services/notifications';
import { useHabits } from '@/store/habits';
import { useTheme } from '@/theme';
import { average, round1 } from '@/utils/misc';
import { weekDays, weekKey } from '@/utils/time';

const PRESETS = [30, 45, 60, 90];
const LAST_ROUND_MS = 5 * 60_000;

export default function Gaming() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const habits = useHabits();
  const { activeGaming: active, gamingSessions: sessions, gamingBudgetMinutes: budget, usage } = habits;
  const [minutes, setMinutes] = useState(45);
  const [game, setGame] = useState('');
  const [rateId, setRateId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [manualMinutes, setManualMinutes] = useState(30);
  const now = useNow(1000, !!active);
  const ended = useRef(false);
  const remaining = active ? active.endsAt - now : 0;

  useEffect(() => {
    if (!active) {
      ended.current = false;
      return;
    }
    if (remaining <= 0 && !ended.current) {
      ended.current = true;
      const session = habits.endGaming();
      if (session) setRateId(session.id);
    }
  }, [active, remaining, habits]);

  const thisWeek = weekKey();
  const weekSessions = sessions.filter((s) => s.endedAt && weekKey(s.startedAt) === thisWeek);
  const timerMinutes = weekSessions.reduce((sum, s) => sum + Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000), 0);
  const deviceGameMinutes = gameMinutesFromUsage(usage, weekDays(thisWeek));
  const used = timerMinutes;

  const insight = useMemo(() => {
    const rated = sessions.filter((s) => s.moodScore !== undefined && s.endedAt);
    const long = rated.filter((s) => (s.endedAt! - s.startedAt) / 60000 >= 90).map((s) => s.moodScore!);
    const short = rated.filter((s) => (s.endedAt! - s.startedAt) / 60000 < 90).map((s) => s.moodScore!);
    if (long.length < 2 || short.length < 2) return null;
    return { long: round1(average(long)!), short: round1(average(short)!) };
  }, [sessions]);

  const begin = async () => {
    const timer = habits.startGaming(minutes, game.trim() || undefined);
    await scheduleTimer('timer-gaming-last', timer.endsAt - LAST_ROUND_MS, t('gaming.lastRoundTitle'), t('gaming.lastRoundBody'), '/habits/gaming');
    await scheduleTimer('timer-gaming-end', timer.endsAt, t('gaming.timeUpTitle'), t('gaming.timeUpBody'), '/habits/gaming');
  };

  const stop = async () => {
    ended.current = true;
    const session = habits.endGaming();
    await cancelTimer('timer-gaming-last');
    await cancelTimer('timer-gaming-end');
    if (session) setRateId(session.id);
  };

  return (
    <Screen title={t('tools.gaming')} subtitle={t('gaming.subtitle')} testID="screen-gaming">
      <Card style={{ marginBottom: 20 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <Text variant="bodyStrong">{t('gaming.budgetTitle')}</Text>
          <Text variant="small" color="textMuted">
            {formatMinutes(used)} / {formatMinutes(budget)}
          </Text>
        </Row>
        <ProgressBar value={used} max={budget} color={used > budget ? colors.warning : colors.primary} label={t('gaming.budgetTitle')} />
        <Text variant="small" color="textMuted" style={{ marginTop: 8 }}>
          {used <= budget ? t('gaming.budgetLeft', { time: formatMinutes(budget - used) }) : t('gaming.budgetOver')}
        </Text>
        {deviceGameMinutes > 0 ? (
          <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
            {t('gaming.deviceMinutes', { time: formatMinutes(deviceGameMinutes) })}
          </Text>
        ) : null}
      </Card>

      {active ? (
        <Card tone={remaining <= LAST_ROUND_MS ? 'warning' : 'primary'} style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 20 }}>
          <IconCircle name="game-controller" size={52} tone={remaining <= LAST_ROUND_MS ? 'warning' : 'primary'} />
          <Text variant="display" style={{ marginTop: 10, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
            {formatCountdown(remaining)}
          </Text>
          {remaining <= LAST_ROUND_MS ? (
            <Text variant="bodyStrong" color="onWarningSoft" align="center">
              {t('gaming.lastRoundNow')}
            </Text>
          ) : (
            <Text variant="small" color="onPrimarySoft" align="center">
              {active.game ? t('gaming.playing', { game: active.game }) : t('gaming.enjoy')}
            </Text>
          )}
          <Button label={t('gaming.end')} variant="secondary" icon="stop" style={{ marginTop: 14 }} onPress={stop} testID="gaming-end" />
        </Card>
      ) : (
        <Section title={t('gaming.startTitle')}>
          <Row wrap>
            {PRESETS.map((p) => (
              <Chip key={p} label={formatMinutes(p)} selected={minutes === p} onPress={() => setMinutes(p)} />
            ))}
          </Row>
          <TextField label={t('gaming.gameName')} value={game} onChangeText={setGame} maxLength={40} placeholder={t('gaming.gameNamePlaceholder')} />
          <Button label={t('gaming.start')} icon="play" full onPress={begin} testID="gaming-start" />
          <Text variant="caption" color="textMuted">
            {t('gaming.howItWorks')}
          </Text>
          <Button label={t('gaming.logManual')} variant="ghost" full onPress={() => setManual(true)} />
        </Section>
      )}

      {insight ? (
        <Card tone="alt" style={{ marginBottom: 20 }}>
          <Text variant="bodyStrong">{t('gaming.patternTitle')}</Text>
          <Text variant="small" color="textMuted" style={{ marginTop: 4 }}>
            {insight.short > insight.long ? t('gaming.patternLong', insight) : t('gaming.patternNeutral', insight)}
          </Text>
        </Card>
      ) : null}

      <Section title={t('gaming.budgetSetting')}>
        <Stepper label={t('gaming.weeklyBudget')} value={budget} min={0} max={40 * 60} step={30} format={(v) => formatMinutes(v)} onChange={habits.setGamingBudget} />
      </Section>

      <Section title={t('gaming.moreTitle')}>
        <ListRow icon="earth-outline" title={t('gaming.offline')} subtitle={t('gaming.offlineSub')} onPress={() => router.push({ pathname: '/me/challenges', params: { kind: 'offline' } })} />
        <ListRow icon="book-outline" title={t('gaming.guide')} onPress={() => router.push('/connect/guide/gaming-design')} />
        <ListRow icon="planet-outline" title={t('mind.escapismTitle')} onPress={() => router.push('/connect/guide/escapism')} />
      </Section>

      <Sheet visible={!!rateId} onClose={() => setRateId(null)} title={t('gaming.howFeel')}>
        <Text variant="small" color="textMuted">
          {t('gaming.howFeelBody')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {content.gameMoods.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              onPress={() => {
                if (rateId) habits.rateGaming(rateId, m.id, m.score);
                setRateId(null);
                checkBadges();
              }}
              testID={`game-mood-${m.id}`}
            />
          ))}
        </View>
        <Button label={t('common.skip')} variant="ghost" full onPress={() => setRateId(null)} />
      </Sheet>

      <Sheet visible={manual} onClose={() => setManual(false)} title={t('gaming.logManual')}>
        <Stepper label={t('gaming.howLong')} value={manualMinutes} min={5} max={600} step={15} format={(v) => formatMinutes(v)} onChange={setManualMinutes} />
        <Button
          label={t('common.save')}
          full
          onPress={() => {
            habits.addGamingManual(manualMinutes, game.trim() || undefined);
            const last = useHabits.getState().gamingSessions.slice(-1)[0];
            setManual(false);
            if (last) setRateId(last.id);
          }}
        />
      </Sheet>
    </Screen>
  );
}
