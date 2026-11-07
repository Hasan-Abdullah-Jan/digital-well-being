/**
 * Explicit, revocable consent before anything is stored in the cloud.
 * Also explains what happens when cloud features are switched off or not set up.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useContent, useT } from '@/i18n';
import { randomAlias } from '@/features/format';
import { useCommunityMode } from '@/services/community';
import { useSettings } from '@/store/settings';

import { Button } from './Button';
import { Card } from './Card';
import { Icon, IconCircle } from './Icon';
import { Row } from './Layout';
import { Text } from './Text';

export function CommunityGate({ children, feature }: { children: ReactNode; feature: 'peer' | 'note' }) {
  const { t } = useT();
  const content = useContent();
  const mode = useCommunityMode();
  const consent = useSettings((s) => s.communityConsent);
  const alias = useSettings((s) => s.alias);
  const update = useSettings((s) => s.update);

  if (mode === 'unavailable') {
    return (
      <Card tone="alt">
        <Row style={{ alignItems: 'flex-start' }}>
          <IconCircle name="cloud-offline-outline" tone="neutral" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('community.offTitle')}</Text>
            <Text variant="small" color="textMuted" style={{ marginTop: 4 }}>
              {t('community.offBody')}
            </Text>
          </View>
        </Row>
        <Button label={t('help.button')} icon="heart" variant="accent" style={{ marginTop: 12 }} onPress={() => router.push('/help')} />
      </Card>
    );
  }

  if (mode === 'cloud' && !consent?.granted) {
    const points = feature === 'peer'
      ? [t('community.consentPeer1'), t('community.consentPeer2'), t('community.consentPeer3')]
      : [t('community.consentNote1'), t('community.consentNote2'), t('community.consentNote3')];
    return (
      <Card>
        <IconCircle name="shield-checkmark-outline" size={52} />
        <Text variant="heading" style={{ marginTop: 12 }}>
          {t('community.consentTitle')}
        </Text>
        <View style={{ gap: 10, marginVertical: 14 }}>
          {[...points, t('community.consentCommon1'), t('community.consentCommon2')].map((p) => (
            <Row key={p} style={{ alignItems: 'flex-start' }}>
              <Icon name="checkmark-circle-outline" size={20} />
              <Text variant="small" style={{ flex: 1 }}>
                {p}
              </Text>
            </Row>
          ))}
        </View>
        <Button
          label={t('community.agree')}
          full
          testID="consent-agree"
          onPress={() =>
            update({
              communityConsent: { granted: true, at: Date.now() },
              alias: alias || randomAlias(content.aliasAdjectives, content.aliasNouns),
            })
          }
        />
        <Button label={t('common.notNow')} variant="ghost" full onPress={() => router.back()} />
        <Text variant="caption" color="textMuted" align="center">
          {t('community.withdraw')}
        </Text>
      </Card>
    );
  }

  return <>{children}</>;
}
