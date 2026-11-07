import { View } from 'react-native';

import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { formatDate } from '@/utils/time';

export default function Badges() {
  const { t } = useT();
  const content = useContent();
  const earned = useProgress((s) => s.badges);
  const sorted = [...content.badges].sort((a, b) => Number(!!earned[b.id]) - Number(!!earned[a.id]));

  return (
    <Screen title={t('me.badgesTitle')} subtitle={t('badges.subtitle', { earned: Object.keys(earned).length, total: content.badges.length })} testID="screen-badges">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {sorted.map((b) => {
          const at = earned[b.id];
          return (
            <Card
              key={b.id}
              tone={at ? 'success' : 'alt'}
              style={{ flexBasis: '46%', flexGrow: 1, alignItems: 'center', gap: 6 }}
              accessibilityLabel={`${b.title}. ${b.description}. ${at ? t('badges.earnedOn', { date: formatDate(at) }) : t('badges.notYet')}`}
            >
              <IconCircle name={b.icon} tone={at ? 'success' : 'neutral'} size={52} />
              <Text variant="bodyStrong" align="center" color={at ? 'onSuccessSoft' : 'text'}>
                {b.title}
              </Text>
              <Text variant="caption" align="center" color={at ? 'onSuccessSoft' : 'textMuted'}>
                {b.description}
              </Text>
              <Text variant="caption" align="center" color={at ? 'onSuccessSoft' : 'textMuted'}>
                {at ? t('badges.earnedOn', { date: formatDate(at) }) : t('badges.notYet')}
              </Text>
            </Card>
          );
        })}
      </View>
      <Text variant="caption" color="textMuted" style={{ marginTop: 16 }}>
        {t('badges.note')}
      </Text>
    </Screen>
  );
}
