import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Stepper, Segmented } from '@/components/Inputs';
import { Chip, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { checkUsageCelebration, formatMinutes } from '@/features/celebrations';
import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { addDaysToKey, dateKey } from '@/utils/time';

const QUICK = [
  { minutes: 45, key: 'checkin.under1' },
  { minutes: 90, key: 'checkin.oneToTwo' },
  { minutes: 150, key: 'checkin.twoToThree' },
  { minutes: 210, key: 'checkin.threeToFour' },
  { minutes: 300, key: 'checkin.fourToSix' },
  { minutes: 420, key: 'checkin.overSix' },
];

const CATEGORIES = ['social', 'video', 'games', 'messaging', 'browsing', 'school'];

export default function ScreenCheckin() {
  const { t } = useT();
  const add = useHabits((s) => s.addScreenCheckin);
  const existing = useHabits((s) => s.screenCheckins);
  const toast = useApp((s) => s.showToast);
  const [day, setDay] = useState<'today' | 'yesterday'>(new Date().getHours() < 12 ? 'yesterday' : 'today');
  const date = day === 'today' ? dateKey() : addDaysToKey(dateKey(), -1);
  const prior = existing.find((c) => c.date === date);
  const [minutes, setMinutes] = useState(prior?.minutes ?? 150);
  const [category, setCategory] = useState<string | undefined>(prior?.topCategory);

  return (
    <Screen
      title={t('tools.checkin')}
      subtitle={t('checkin.subtitle')}
      testID="screen-checkin"
      footer={
        <Button
          label={t('common.save')}
          full
          testID="checkin-save"
          onPress={() => {
            add(minutes, category, date);
            toast(t('checkin.saved'));
            checkUsageCelebration();
            checkBadges();
            router.back();
          }}
        />
      }
    >
      <Segmented
        label={t('checkin.whichDay')}
        value={day}
        onChange={setDay}
        options={[
          { value: 'today', label: t('usage.today') },
          { value: 'yesterday', label: t('checkin.yesterday') },
        ]}
      />
      <Section title={t('checkin.howMuch')} style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {QUICK.map((q) => (
            <Chip key={q.minutes} label={t(q.key)} selected={minutes === q.minutes} onPress={() => setMinutes(q.minutes)} />
          ))}
        </View>
        <Stepper label={t('checkin.exact')} value={minutes} min={0} max={1200} step={15} format={(v) => formatMinutes(v)} onChange={setMinutes} />
        <Card tone="alt">
          <Text variant="small">{Platform.OS === 'ios' ? t('checkin.tipIos') : t('checkin.tipAndroid')}</Text>
        </Card>
      </Section>
      <Section title={t('checkin.mostTime')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={t(`checkin.categories.${c}`)} selected={category === c} onPress={() => setCategory(category === c ? undefined : c)} />
          ))}
        </View>
      </Section>
      <Text variant="caption" color="textMuted">
        {t('checkin.noJudgement')}
      </Text>
    </Screen>
  );
}
