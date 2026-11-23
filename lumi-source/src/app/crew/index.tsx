import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CrewCard } from '@/components/CrewCard';
import { Icon, IconCircle } from '@/components/Icon';
import { Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { crewStatus } from '@/features/crew';
import { useT } from '@/i18n';
import { useCrew } from '@/store/crew';

export default function CrewHome() {
  const { t } = useT();
  const crews = useCrew((s) => s.crews);
  const current = crews.filter((c) => !c.archived && crewStatus(c) !== 'finished');
  const past = crews.filter((c) => c.archived || crewStatus(c) === 'finished');

  return (
    <Screen
      title={t('crew.title')}
      subtitle={t('crew.subtitle')}
      testID="screen-crew"
      footer={
        <Row>
          <Button label={t('crew.new')} icon="add" full style={{ flex: 1 }} onPress={() => router.push('/crew/new')} testID="crew-new" />
          <Button label={t('crew.join')} icon="enter-outline" variant="secondary" full style={{ flex: 1 }} onPress={() => router.push('/crew/join')} testID="crew-join" />
        </Row>
      }
    >
      <Card tone="glass" style={{ marginBottom: 20 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <IconCircle name="people-circle-outline" tone="accent" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading">{t('crew.heroTitle')}</Text>
            <Text variant="small" color="textMuted">
              {t('crew.heroBody')}
            </Text>
          </View>
        </Row>
      </Card>

      <Section title={t('crew.current')}>
        {current.length === 0 ? (
          <EmptyState icon="people-outline" title={t('crew.emptyTitle')} body={t('crew.emptyBody')} />
        ) : (
          current.map((crew) => <CrewCard key={crew.id} crew={crew} />)
        )}
      </Section>

      {past.length > 0 ? (
        <Section title={t('crew.past')}>
          {past.map((crew) => (
            <CrewCard key={crew.id} crew={crew} />
          ))}
        </Section>
      ) : null}

      <Card tone="alt">
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="lock-closed-outline" size={18} />
          <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
            {t('crew.privacy')}
          </Text>
        </Row>
      </Card>
    </Screen>
  );
}
