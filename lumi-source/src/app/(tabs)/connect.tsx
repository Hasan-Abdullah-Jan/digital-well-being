import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { ListRow, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { appConfig } from '@/config';
import { useT } from '@/i18n';
import { useCommunityMode } from '@/services/community';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';

export default function Connect() {
  const { t } = useT();
  const mode = useCommunityMode();
  const staff = useApp((s) => s.staff);
  const trusted = useSettings((s) => s.trustedContact);
  const isStaff = !!staff && (staff.moderator || staff.helper || staff.organiser);

  return (
    <Screen large title={t('connect.title')} subtitle={t('connect.subtitle')} testID="screen-connect">
      <Section title={t('connect.talkTitle')}>
        <Card tone="accent" onPress={() => router.push('/help')}>
          <Row>
            <IconCircle name="heart" tone="accent" />
            <Text variant="bodyStrong" color="onAccentSoft" style={{ flex: 1 }}>
              {t('connect.helpNow')}
            </Text>
          </Row>
        </Card>
        <ListRow
          icon="person-outline"
          title={t('connect.trusted')}
          subtitle={trusted?.name ? t('connect.trustedSet', { name: trusted.name }) : t('connect.trustedEmpty')}
          onPress={() => router.push('/connect/trusted')}
        />
        <ListRow icon="mail-unread-outline" title={t('connect.anonNote')} subtitle={t('connect.anonNoteSub')} onPress={() => router.push('/connect/note')} testID="row-note" />
      </Section>

      <Section title={t('connect.communityTitle')}>
        {appConfig.features.peerSpace ? (
          <ListRow
            icon="chatbubbles-outline"
            title={t('tools.peer')}
            subtitle={mode === 'unavailable' ? t('connect.cloudOff') : t('connect.peerSub')}
            onPress={() => router.push('/connect/peer')}
            testID="row-peer"
          />
        ) : null}
        <ListRow icon="calendar-outline" title={t('connect.events')} subtitle={t('connect.eventsSub')} onPress={() => router.push('/connect/events')} />
        <ListRow icon="people-outline" title={t('tools.nudges')} subtitle={t('connect.nudgesSub')} onPress={() => router.push('/connect/nudges')} />
      </Section>

      <Section title={t('connect.safetyTitle')}>
        <ListRow icon="shield-checkmark-outline" title={t('tools.safety')} subtitle={t('connect.safetySub')} onPress={() => router.push('/connect/safety')} testID="row-safety" />
        <ListRow icon="folder-open-outline" title={t('tools.evidence')} subtitle={t('connect.evidenceSub')} onPress={() => router.push('/connect/evidence')} />
      </Section>

      {isStaff ? (
        <Section title={t('connect.teamTitle')}>
          <ListRow icon="briefcase-outline" title={t('connect.teamTools')} subtitle={mode === 'demo' ? t('connect.teamDemo') : t('connect.teamSub')} onPress={() => router.push('/connect/moderation')} />
        </Section>
      ) : null}
    </Screen>
  );
}
