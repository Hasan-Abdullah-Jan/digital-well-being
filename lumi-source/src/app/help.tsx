import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { appConfig } from '@/config';
import { callTrustedPerson, directoryUrl, emergencyHref, helplineOptions, messageTrustedPerson, openLink } from '@/features/help';
import { useT } from '@/i18n';
import { useCommunityMode } from '@/services/community';
import { useSettings } from '@/store/settings';

export default function Help() {
  const { t } = useT();
  const trusted = useSettings((s) => s.trustedContact);
  const mode = useCommunityMode();
  const options = helplineOptions();
  const emergency = appConfig.help.emergencyNumber;

  return (
    <Screen title={t('help.title')} help={false} testID="screen-help">
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <IconCircle name="heart" tone="accent" size={64} />
        <Text variant="title" align="center">
          {t('help.heading')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {t('help.intro')}
        </Text>
      </View>

      <Section title={t('help.dangerTitle')}>
        <Card tone="accent">
          <Text variant="small" color="onAccentSoft" style={{ marginBottom: 10 }}>
            {t('help.dangerBody')}
          </Text>
          <Button
            label={emergency ? t('help.callEmergencyNumber', { number: emergency }) : t('help.callEmergency')}
            icon="call"
            variant="accent"
            full
            onPress={() => openLink(emergencyHref())}
            testID="help-emergency"
          />
        </Card>
      </Section>

      <Section title={t('help.talkTitle')}>
        {options.length > 0 ? (
          options.map((o) => (
            <Button key={o.id} label={o.label} icon={o.icon} full onPress={() => openLink(o.href)} accessibilityHint={o.display} testID={`help-${o.id}`} />
          ))
        ) : (
          <Card>
            <Text variant="small" color="textMuted" style={{ marginBottom: 10 }}>
              {t('help.noHelpline')}
            </Text>
            <Button label={t('help.findHelpline')} icon="globe-outline" full onPress={() => openLink(directoryUrl())} testID="help-directory" />
          </Card>
        )}
        {options.length > 0 ? (
          <Button label={t('help.findOther')} variant="ghost" icon="globe-outline" full onPress={() => openLink(directoryUrl())} />
        ) : null}
      </Section>

      <Section title={t('help.trustedTitle')}>
        {trusted?.phone ? (
          <Card>
            <Text variant="bodyStrong">{trusted.name || t('trusted.someone')}</Text>
            <Text variant="small" color="textMuted" style={{ marginBottom: 10 }}>
              {t('help.trustedBody')}
            </Text>
            <Row wrap>
              <Button label={t('help.textTrusted')} icon="chatbubble-ellipses" small onPress={() => void messageTrustedPerson()} />
              <Button label={t('help.callTrusted')} icon="call-outline" small variant="secondary" onPress={() => void callTrustedPerson()} />
            </Row>
          </Card>
        ) : (
          <Button label={t('help.addTrusted')} icon="person-add-outline" variant="secondary" full onPress={() => router.push('/connect/trusted')} />
        )}
        {mode !== 'unavailable' ? (
          <Button label={t('help.anonNote')} icon="mail-unread-outline" variant="secondary" full onPress={() => router.push('/connect/note')} />
        ) : null}
      </Section>

      <Section title={t('help.calmTitle')}>
        <Row>
          <Button label={t('tools.breathe')} icon="leaf-outline" variant="soft" style={{ flex: 1 }} onPress={() => router.push('/mind/breathe')} />
          <Button label={t('tools.grounding')} icon="hand-right-outline" variant="soft" style={{ flex: 1 }} onPress={() => router.push('/mind/grounding')} />
        </Row>
      </Section>

      <Card tone="alt">
        <Text variant="bodyStrong">{t('help.aboutTitle')}</Text>
        <Text variant="small" color="textMuted" style={{ marginTop: 6 }}>
          {t('help.aboutBody')}
        </Text>
      </Card>
    </Screen>
  );
}
