import { router } from 'expo-router';
import { View } from 'react-native';

import { Chip } from '@/components/Layout';
import { CONCERN_TO_GOALS } from '@/features/personalise';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { useContent, useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import type { ConcernId } from '@/store/types';
import { uniq } from '@/utils/misc';


export default function Concerns() {
  const { t } = useT();
  const content = useContent();
  const concerns = useSettings((s) => s.concerns);
  const update = useSettings((s) => s.update);

  const toggle = (id: ConcernId) =>
    update({ concerns: concerns.includes(id) ? concerns.filter((c) => c !== id) : [...concerns, id] });

  return (
    <OnboardingFrame
      step={1}
      title={t('onboarding.concernsTitle')}
      subtitle={t('onboarding.concernsSubtitle')}
      onNext={() => {
        const suggested = uniq(concerns.flatMap((c) => CONCERN_TO_GOALS[c] ?? []));
        if (useSettings.getState().goals.length === 0) update({ goals: suggested.slice(0, 4) });
        router.push('/onboarding/goals');
      }}
      nextLabel={concerns.length ? t('common.continue') : t('onboarding.notSure')}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {content.concerns.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            selected={concerns.includes(c.id as ConcernId)}
            onPress={() => toggle(c.id as ConcernId)}
            testID={`concern-${c.id}`}
          />
        ))}
      </View>
    </OnboardingFrame>
  );
}
