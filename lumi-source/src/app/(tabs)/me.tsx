import { router } from 'expo-router';
import { View } from 'react-native';

import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { ListRow, Row, Section, Stat } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { currentStreakLength } from '@/features/streaks';
import { useContent, useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useWellbeing } from '@/store/wellbeing';
import { formatDate } from '@/utils/time';

export default function Me() {
  const { t } = useT();
  const content = useContent();
  const nickname = useSettings((s) => s.nickname);
  const since = useSettings((s) => s.onboardedAt);
  const badges = useProgress((s) => s.badges);
  const goals = useProgress((s) => s.goals);
  const streaks = useProgress((s) => s.streaks);
  const challenges = useProgress((s) => s.challenges);
  const wins = useWellbeing((s) => s.journal.filter((j) => j.type === 'win').length);
  const best = streaks.reduce((m, s) => Math.max(m, currentStreakLength(s)), 0);
  const activeChallenges = Object.values(challenges).filter((c) => !c.completedAt).length;

  return (
    <Screen large title={nickname ? t('me.titleName', { name: nickname }) : t('me.title')} subtitle={since ? t('me.since', { date: formatDate(since, { month: 'long', year: 'numeric' }) }) : undefined} testID="screen-me">
      <Row style={{ marginBottom: 20 }} wrap>
        <Stat label={t('me.badges')} value={`${Object.keys(badges).length}/${content.badges.length}`} tone="success" />
        <Stat label={t('me.bestStreak')} value={t('streaks.daysShort', { count: best })} tone="accent" />
        <Stat label={t('me.wins')} value={String(wins)} tone="primary" />
      </Row>

      <Card tone="primary" onPress={() => router.push('/me/insights')} style={{ marginBottom: 24 }} testID="card-insights">
        <Row>
          <IconCircle name="analytics-outline" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color="onPrimarySoft">
              {t('me.weekly')}
            </Text>
            <Text variant="small" color="onPrimarySoft">
              {t('me.weeklySub')}
            </Text>
          </View>
        </Row>
      </Card>

      <Section title={t('me.progressTitle')}>
        <ListRow icon="flag-outline" title={t('me.goals')} subtitle={goals.length ? t('me.goalsCount', { count: goals.filter((g) => !g.completedAt).length }) : t('me.goalsEmpty')} onPress={() => router.push('/me/goals')} testID="row-goals" />
        <ListRow icon="flame-outline" title={t('me.streaks')} subtitle={streaks.length ? t('me.streaksCount', { count: streaks.length }) : t('me.streaksEmpty')} onPress={() => router.push('/me/streaks')} />
        <ListRow icon="trophy-outline" title={t('tools.challenges')} subtitle={activeChallenges ? t('me.challengesCount', { count: activeChallenges }) : t('me.challengesEmpty')} onPress={() => router.push('/me/challenges')} />
        <ListRow icon="ribbon-outline" title={t('me.badgesTitle')} subtitle={t('me.badgesSub')} onPress={() => router.push('/me/badges')} />
      </Section>

      <Section title={t('me.settingsTitle')}>
        <ListRow icon="settings-outline" title={t('settings.title')} subtitle={t('me.settingsSub')} onPress={() => router.push('/settings')} testID="row-settings" />
        <ListRow icon="shield-outline" title={t('settings.privacy')} subtitle={t('me.privacySub')} onPress={() => router.push('/settings/privacy')} />
        <ListRow icon="information-circle-outline" title={t('settings.about')} subtitle={t('me.aboutSub')} onPress={() => router.push('/settings/about')} />
      </Section>
    </Screen>
  );
}
