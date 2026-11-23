import { router } from 'expo-router';
import { View } from 'react-native';

import { crewStatus, dayNumber, leaderboard, teamGoal, teamPoints } from '@/features/crew';
import { useT } from '@/i18n';
import type { Crew } from '@/store/types';
import { useTheme } from '@/theme';
import { formatDate, parseDateKey } from '@/utils/time';

import { Card } from './Card';
import { CrewAvatar } from './CrewAvatar';
import { Icon } from './Icon';
import { Pill, ProgressBar, Row } from './Layout';
import { Text } from './Text';

export function CrewCard({ crew }: { crew: Crew }) {
  const { t } = useT();
  const { colors } = useTheme();
  const status = crewStatus(crew);
  const board = leaderboard(crew);
  const leader = board[0];
  const team = teamPoints(crew);
  const goal = teamGoal(crew);
  return (
    <Card onPress={() => router.push({ pathname: '/crew/[id]', params: { id: crew.id } })} testID={`crew-card-${crew.id}`}>
      <Row>
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {crew.name}
          </Text>
          <Text variant="small" color="textMuted">
            {status === 'upcoming'
              ? t('crew.startsOn', { date: formatDate(parseDateKey(crew.startDate), { weekday: 'long', day: 'numeric', month: 'short' }) })
              : status === 'active'
                ? t('crew.dayOf', { day: dayNumber(crew), total: crew.days })
                : t('crew.finished')}
          </Text>
        </View>
        <Pill label={crew.mode === 'team' ? t('crew.modeTeam') : t('crew.modeVersus')} tone={crew.mode === 'team' ? 'success' : 'accent'} />
      </Row>
      <Row gap={0} style={{ marginTop: 12 }}>
        {crew.members.slice(0, 6).map((m, i) => (
          <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <CrewAvatar member={m} size={32} ring />
          </View>
        ))}
        <View style={{ width: 16 }} />
        {crew.mode === 'versus' && leader && leader.points > 0 ? (
          <Row gap={6} style={{ flex: 1 }}>
            <Icon name="trophy" size={16} color={colors.accent} />
            <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
              {t('crew.leading', { name: leader.member.name, points: leader.points })}
            </Text>
          </Row>
        ) : null}
      </Row>
      {crew.mode === 'team' ? (
        <View style={{ marginTop: 12, gap: 6 }}>
          <ProgressBar value={team} max={goal} label={t('crew.teamProgress')} />
          <Text variant="caption" color="textMuted">
            {t('crew.teamPoints', { points: team, goal })}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
