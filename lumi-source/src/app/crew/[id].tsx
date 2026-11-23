import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CrewAvatar } from '@/components/CrewAvatar';
import { Icon, IconCircle } from '@/components/Icon';
import { Segmented } from '@/components/Inputs';
import { Pill, ProgressBar, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import {
  crewStatus,
  dayNumber,
  dayPoints,
  doneOn,
  editableDates,
  encodeCrew,
  endDate,
  isPerfectDay,
  leaderboard,
  levelFor,
  PERFECT_DAY_BONUS,
  teamGoal,
  teamPoints,
  teamStreak,
} from '@/features/crew';
import { useT } from '@/i18n';
import { playSound } from '@/services/sound';
import { useApp } from '@/store/app';
import { useCrew } from '@/store/crew';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';
import { dateKey, formatDate, parseDateKey } from '@/utils/time';

export default function CrewBoard() {
  const { t } = useT();
  const { colors, radius, neu } = useTheme();
  const params = useLocalSearchParams<{ id: string; fresh?: string }>();
  const crew = useCrew((s) => s.crews.find((c) => c.id === params.id));
  const toggle = useCrew((s) => s.toggleHabit);
  const removeCrew = useCrew((s) => s.removeCrew);
  const showToast = useApp((s) => s.showToast);
  const today = dateKey();
  const dates = useMemo(() => (crew ? editableDates(crew, today) : []), [crew, today]);
  const [picked, setDate] = useState(dates[0] ?? today);
  // Keep the selected day valid when the challenge's editable days move on.
  const date = dates.includes(picked) ? picked : (dates[0] ?? today);
  const [memberId, setMemberId] = useState<string | undefined>(crew?.members.find((m) => m.me)?.id ?? crew?.members[0]?.id);
  const status = crew ? crewStatus(crew, today) : 'finished';

  useEffect(() => {
    if (status === 'finished') checkBadges();
  }, [status]);

  if (!crew) {
    return (
      <Screen title={t('crew.title')}>
        <EmptyState icon="people-outline" title={t('crew.notFound')} body={t('crew.notFoundBody')} />
      </Screen>
    );
  }

  const member = crew.members.find((m) => m.id === memberId) ?? crew.members[0];
  const board = leaderboard(crew, today);
  const done = member ? doneOn(crew, date, member.id) : [];
  const team = teamPoints(crew, today);
  const goal = teamGoal(crew);
  const editable = dates.includes(date);

  const tick = (habitId: string) => {
    if (!member || !editable) return;
    const nowDone = toggle(crew.id, date, member.id, habitId);
    const latest = useCrew.getState().crews.find((c) => c.id === crew.id);
    if (nowDone && latest && isPerfectDay(latest, date, member.id)) {
      playSound('celebrate');
      showToast(t('crew.perfectDay', { name: member.name, bonus: PERFECT_DAY_BONUS }));
    } else if (nowDone) {
      playSound('success');
    }
  };

  const share = async () => {
    const code = encodeCrew(crew);
    const message = t('crew.shareMessage', { name: crew.name, code });
    await Clipboard.setStringAsync(code).catch(() => undefined);
    try {
      await Share.share({ message });
    } catch {
      showToast(t('crew.copied'));
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('crew.deleteTitle'),
      message: t('crew.deleteBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    removeCrew(crew.id);
    router.back();
  };

  const subtitle =
    status === 'upcoming'
      ? t('crew.startsOn', { date: formatDate(parseDateKey(crew.startDate), { weekday: 'long', day: 'numeric', month: 'short' }) })
      : status === 'active'
        ? t('crew.dayOfEnds', { day: dayNumber(crew, today), total: crew.days, date: formatDate(parseDateKey(endDate(crew)), { weekday: 'short', day: 'numeric', month: 'short' }) })
        : t('crew.finished');

  const winner = board[0];

  return (
    <Screen title={crew.name} subtitle={subtitle} testID="screen-crew-board">
      {params.fresh ? (
        <Card tone="primary" style={{ marginBottom: 16 }}>
          <Text variant="bodyStrong" color="onPrimarySoft">
            {t('crew.freshTitle')}
          </Text>
          <Text variant="small" color="onPrimarySoft" style={{ marginVertical: 6 }}>
            {t('crew.freshBody')}
          </Text>
          <Button label={t('crew.share')} icon="share-social-outline" small onPress={share} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}

      {status === 'finished' && winner ? (
        <Card tone="accent" style={{ marginBottom: 16, alignItems: 'center' }}>
          <IconCircle name="trophy" tone="accent" size={64} />
          <Text variant="title" align="center" style={{ marginTop: 8 }}>
            {crew.mode === 'team'
              ? team >= goal
                ? t('crew.teamWon')
                : t('crew.teamDone', { points: team })
              : t('crew.winner', { name: board.filter((s) => s.rank === 1).map((s) => s.member.name).join(' & ') })}
          </Text>
          {crew.reward ? (
            <Text variant="body" color="onAccentSoft" align="center" style={{ marginTop: 6 }}>
              {t('crew.rewardIs', { reward: crew.reward })}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {status === 'upcoming' ? (
        <Card tone="alt" style={{ marginBottom: 16 }}>
          <Text variant="small">{t('crew.upcomingBody')}</Text>
        </Card>
      ) : null}

      {status === 'active' && member ? (
        <Section title={t('crew.checkinTitle')}>
          <Text variant="small" color="textMuted">
            {t('crew.whoHint')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 2 }}>
            {crew.members.map((m) => {
              const on = m.id === member.id;
              const count = doneOn(crew, date, m.id).length;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMemberId(m.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t('crew.memberA11y', { name: m.name, done: count, total: crew.habits.length })}
                  style={{
                    alignItems: 'center',
                    gap: 4,
                    padding: 10,
                    minWidth: 76,
                    borderRadius: radius.md,
                    backgroundColor: on ? colors.primarySoft : colors.surface,
                    boxShadow: on ? neu.insetSm : neu.raisedSm,
                  }}
                >
                  <CrewAvatar member={m} size={40} />
                  <Text variant="smallStrong" numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {count}/{crew.habits.length}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {dates.length > 1 ? (
            <Segmented
              label={t('crew.whichDay')}
              value={date}
              onChange={setDate}
              options={dates.map((d) => ({ value: d, label: d === today ? t('crew.today') : t('crew.yesterday') }))}
            />
          ) : null}

          {crew.habits.map((h) => {
            const on = done.includes(h.id);
            return (
              <Pressable
                key={h.id}
                onPress={() => tick(h.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t('crew.habitA11y', { habit: h.title, points: h.points, name: member.name })}
                testID={`crew-habit-${h.id}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  minHeight: 60,
                  borderRadius: radius.md,
                  backgroundColor: on ? colors.successSoft : colors.surface,
                  boxShadow: on || pressed ? neu.insetSm : neu.raisedSm,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <IconCircle name={on ? 'checkmark' : h.icon} tone={on ? 'success' : 'neutral'} size={40} />
                <Text variant="bodyStrong" style={{ flex: 1 }} color={on ? 'onSuccessSoft' : undefined}>
                  {h.title}
                </Text>
                <View style={{ justifyContent: 'center' }}>
                  <Pill label={`+${h.points}`} tone={on ? 'success' : 'neutral'} />
                </View>
              </Pressable>
            );
          })}
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="small" color="textMuted">
              {t('crew.dayTotal', { name: member.name, points: dayPoints(crew, date, member.id) })}
            </Text>
            {isPerfectDay(crew, date, member.id) ? <Pill label={t('crew.perfectPill', { bonus: PERFECT_DAY_BONUS })} tone="accent" icon="star" /> : null}
          </Row>
        </Section>
      ) : null}

      {crew.mode === 'team' ? (
        <Section title={t('crew.teamTitle')}>
          <Card>
            <Row>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="textMuted">
                  {t('crew.teamProgress')}
                </Text>
                <Text variant="title">{t('crew.teamPoints', { points: team, goal })}</Text>
              </View>
              <Pill label={t('crew.teamStreak', { count: teamStreak(crew, today) })} tone="accent" icon="flame-outline" />
            </Row>
            <View style={{ marginTop: 12 }}>
              <ProgressBar value={team} max={goal} height={14} label={t('crew.teamProgress')} />
            </View>
          </Card>
        </Section>
      ) : null}

      <Section title={crew.mode === 'team' ? t('crew.contributions') : t('crew.leaderboard')}>
        {board.map((s) => {
          const lvl = levelFor(s.points);
          return (
            <Card key={s.member.id}>
              <Row>
                <Text variant="heading" style={{ width: 26 }} color={s.rank === 1 && s.points > 0 ? 'accent' : 'textMuted'}>
                  {crew.mode === 'team' ? '' : s.rank}
                </Text>
                <CrewAvatar member={s.member} size={40} />
                <View style={{ flex: 1 }}>
                  <Row gap={6}>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {s.member.name}
                    </Text>
                    {s.rank === 1 && s.points > 0 && crew.mode === 'versus' ? <Icon name="trophy" size={16} color={colors.accent} /> : null}
                  </Row>
                  <Text variant="caption" color="textMuted">
                    {t('crew.memberStats', { level: lvl.level, streak: s.streak })}
                    {s.perfectDays > 0 ? ` · ${t('crew.memberPerfect', { count: s.perfectDays })}` : ''}
                  </Text>
                </View>
                <Text variant="heading">{s.points}</Text>
              </Row>
              <View style={{ marginTop: 10 }}>
                <ProgressBar value={lvl.progress} max={1} height={6} color={colors.accent} label={t('crew.levelProgress', { level: lvl.level + 1 })} />
              </View>
            </Card>
          );
        })}
      </Section>

      {crew.reward && status !== 'finished' ? (
        <Card tone="alt" style={{ marginBottom: 24 }}>
          <Row>
            <Icon name="gift-outline" />
            <Text variant="small" style={{ flex: 1 }}>
              {t('crew.rewardIs', { reward: crew.reward })}
            </Text>
          </Row>
        </Card>
      ) : null}

      <Section title={t('crew.syncTitle')}>
        <Text variant="small" color="textMuted">
          {t('crew.syncBody')}
        </Text>
        <Row wrap>
          <Button label={t('crew.share')} icon="share-social-outline" small onPress={share} testID="crew-share" />
          <Button label={t('crew.update')} icon="download-outline" small variant="secondary" onPress={() => router.push('/crew/join')} />
        </Row>
      </Section>

      <Button label={t('crew.delete')} variant="ghost" small icon="trash-outline" onPress={remove} style={{ alignSelf: 'center' }} />
      <Text variant="caption" color="textMuted" align="center" style={{ marginTop: 8 }}>
        {t('crew.fairPlay')}
      </Text>
    </Screen>
  );
}
