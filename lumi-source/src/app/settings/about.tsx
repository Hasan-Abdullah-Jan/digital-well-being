import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { appConfig } from '@/config';
import { useT } from '@/i18n';

export default function About() {
  const { t } = useT();
  return (
    <Screen title={t('settings.about')} testID="screen-about">
      <Row style={{ marginBottom: 16 }}>
        <IconCircle name="sunny" size={56} />
        <Text variant="title" style={{ flex: 1 }}>
          Lumi {appConfig.version}
        </Text>
      </Row>
      <Text variant="body" style={{ marginBottom: 20 }}>
        {t('about.intro')}
      </Text>
      <Card tone="accent" style={{ marginBottom: 20 }}>
        <Text variant="bodyStrong" color="onAccentSoft">
          {t('about.notTherapistTitle')}
        </Text>
        <Text variant="small" color="onAccentSoft" style={{ marginTop: 6 }}>
          {t('about.notTherapistBody')}
        </Text>
        <Button label={t('help.button')} icon="heart" variant="accent" small style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push('/help')} />
      </Card>
      <Section title={t('about.designTitle')}>
        {[t('about.design1'), t('about.design2'), t('about.design3'), t('about.design4'), t('about.design5')].map((d) => (
          <Text key={d} variant="body">
            • {d}
          </Text>
        ))}
      </Section>
      <Section title={t('about.limitsTitle')}>
        <Text variant="body">{t('about.limitsBody')}</Text>
      </Section>
      {appConfig.organisation.name ? (
        <Text variant="small" color="textMuted">
          {t('about.org', { name: appConfig.organisation.name })}
        </Text>
      ) : null}
      <Text variant="caption" color="textMuted" style={{ marginTop: 12 }}>
        {t('about.credits')}
      </Text>
    </Screen>
  );
}
