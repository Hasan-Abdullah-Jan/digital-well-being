import { router } from 'expo-router';
import { View } from 'react-native';

import { TextField, TimeField } from '@/components/Inputs';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';

export default function Rhythm() {
  const { t } = useT();
  const s = useSettings();
  return (
    <OnboardingFrame step={3} title={t('onboarding.rhythmTitle')} subtitle={t('onboarding.rhythmSubtitle')} onNext={() => router.push('/onboarding/permissions')}>
      <TextField
        label={t('onboarding.nickname')}
        hint={t('onboarding.nicknameHint')}
        value={s.nickname}
        onChangeText={(nickname) => s.update({ nickname })}
        maxLength={30}
        autoCapitalize="words"
        returnKeyType="done"
        testID="nickname"
      />
      <Text variant="smallStrong">{t('onboarding.sleepTimes')}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TimeField label={t('onboarding.bedtime')} value={s.bedtime} onChange={(bedtime) => s.update({ bedtime })} />
        <TimeField label={t('onboarding.wake')} value={s.wakeTime} onChange={(wakeTime) => s.update({ wakeTime })} />
      </View>
      <Text variant="smallStrong">{t('onboarding.checkinTime')}</Text>
      <View style={{ flexDirection: 'row' }}>
        <TimeField label={t('onboarding.checkin')} value={s.checkinTime} onChange={(checkinTime) => s.update({ checkinTime })} />
      </View>
    </OnboardingFrame>
  );
}
