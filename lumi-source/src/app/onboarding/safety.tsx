import { router } from 'expo-router';
import { useState } from 'react';

import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { TextField } from '@/components/Inputs';
import { Row } from '@/components/Layout';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { helplineConfigured, helplineOptions } from '@/features/help';
import { useT } from '@/i18n';
import { syncReminders } from '@/services/notifications';
import { useSettings } from '@/store/settings';

export default function SafetySetup() {
  const { t } = useT();
  const existing = useSettings((s) => s.trustedContact);
  const update = useSettings((s) => s.update);
  const complete = useSettings((s) => s.completeOnboarding);
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const options = helplineOptions();

  const finish = () => {
    if (name.trim() || phone.trim()) {
      update({ trustedContact: { name: name.trim(), phone: phone.trim(), message: existing?.message ?? '' } });
    }
    complete();
    checkBadges();
    void syncReminders();
    router.replace('/(tabs)');
  };

  return (
    <OnboardingFrame step={5} title={t('onboarding.safetyTitle')} subtitle={t('onboarding.safetySubtitle')} onNext={finish} nextLabel={t('onboarding.finish')}>
      <Card tone="accent">
        <Row style={{ alignItems: 'flex-start' }}>
          <IconCircle name="information-circle-outline" tone="accent" />
          <Text variant="small" color="onAccentSoft" style={{ flex: 1 }}>
            {t('onboarding.notTherapist')}
          </Text>
        </Row>
      </Card>
      <Card>
        <Text variant="bodyStrong">{t('onboarding.helpAlways')}</Text>
        <Text variant="small" color="textMuted" style={{ marginTop: 4 }}>
          {helplineConfigured() ? t('onboarding.helplineSet', { name: options[0]?.label ?? '' }) : t('onboarding.helplineNotSet')}
        </Text>
      </Card>
      <Text variant="heading">{t('onboarding.trustedTitle')}</Text>
      <Text variant="small" color="textMuted">
        {t('onboarding.trustedBody')}
      </Text>
      <TextField label={t('trusted.name')} value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" />
      <TextField label={t('trusted.phone')} value={phone} onChangeText={setPhone} maxLength={24} keyboardType="phone-pad" hint={t('trusted.phoneHint')} />
    </OnboardingFrame>
  );
}
