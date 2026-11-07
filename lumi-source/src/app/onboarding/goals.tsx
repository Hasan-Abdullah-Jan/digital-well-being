import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/components/Button';
import { Icon, IconCircle } from '@/components/Icon';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import type { GoalId } from '@/store/types';
import { useTheme } from '@/theme';

export default function Goals() {
  const { t } = useT();
  const content = useContent();
  const { colors, radius } = useTheme();
  const goals = useSettings((s) => s.goals);
  const update = useSettings((s) => s.update);

  const toggle = (id: GoalId) => update({ goals: goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id] });

  return (
    <OnboardingFrame
      step={2}
      title={t('onboarding.goalsTitle')}
      subtitle={t('onboarding.goalsSubtitle')}
      onNext={() => router.push('/onboarding/rhythm')}
    >
      {content.goals.map((g) => {
        const on = goals.includes(g.id as GoalId);
        return (
          <Pressable
            key={g.id}
            testID={`goal-${g.id}`}
            onPress={() => {
              tapFeedback();
              toggle(g.id as GoalId);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${g.label}. ${g.description}`}
            style={[
              styles.goal,
              { backgroundColor: on ? colors.primarySoft : colors.surface, borderColor: on ? colors.primary : colors.border, borderRadius: radius.md },
            ]}
          >
            <IconCircle name={g.icon} tone={on ? 'primary' : 'neutral'} size={42} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{g.label}</Text>
              <Text variant="small" color="textMuted">
                {g.description}
              </Text>
            </View>
            <Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.primary : colors.textMuted} />
          </Pressable>
        );
      })}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 2 },
});
