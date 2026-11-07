import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Stepper, TimeField } from '@/components/Inputs';
import { ListRow, Row, Section, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { useContent, useT } from '@/i18n';
import { guard } from '@/native/guard';
import { syncGuard } from '@/services/guardSync';
import { syncReminders } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { sleepHours } from '@/utils/time';

export default function Bedtime() {
  const { t } = useT();
  const content = useContent();
  const { colors, radius } = useTheme();
  const bedtime = useHabits((s) => s.bedtime);
  const setBedtime = useHabits((s) => s.setBedtime);
  const settings = useSettings();
  const demo = useApp((s) => s.demoMode);
  const [checked, setChecked] = useState<string[]>([]);
  const android = guard.isAvailable() || demo;
  const grayscaleAllowed = guard.canWriteSecureSettings();

  const apply = (patch: Parameters<typeof setBedtime>[0]) => {
    setBedtime(patch);
    syncGuard();
    void syncReminders();
  };

  return (
    <Screen title={t('tools.bedtime')} subtitle={t('bedtime.subtitle')} testID="screen-bedtime">
      <ToggleRow icon="moon-outline" title={t('bedtime.enable')} subtitle={t('bedtime.enableSub')} value={bedtime.enabled} onChange={(enabled) => apply({ enabled })} testID="toggle-bedtime" />

      <Section title={t('bedtime.times')} style={{ marginTop: 20 }}>
        <Row>
          <TimeField
            label={t('onboarding.bedtime')}
            value={settings.bedtime}
            onChange={(v) => {
              settings.update({ bedtime: v });
              syncGuard();
              void syncReminders();
            }}
          />
          <TimeField
            label={t('onboarding.wake')}
            value={settings.wakeTime}
            onChange={(v) => {
              settings.update({ wakeTime: v });
              syncGuard();
              void syncReminders();
            }}
          />
        </Row>
        <Text variant="small" color="textMuted">
          {t('bedtime.sleepWindow', { hours: sleepHours(settings.bedtime, settings.wakeTime) })}
        </Text>
        <Stepper
          label={t('bedtime.windDown')}
          value={bedtime.windDownMinutes}
          min={10}
          max={120}
          step={10}
          format={(v) => formatMinutes(v)}
          onChange={(windDownMinutes) => apply({ windDownMinutes })}
        />
      </Section>

      <Section title={t('bedtime.phoneTitle')}>
        {android ? (
          <>
            <ToggleRow title={t('bedtime.lockApps')} subtitle={t('bedtime.lockAppsSub')} value={bedtime.lockApps} onChange={(lockApps) => apply({ lockApps })} />
            <ToggleRow
              title={t('bedtime.grayscale')}
              subtitle={grayscaleAllowed || demo ? t('bedtime.grayscaleSub') : t('bedtime.grayscaleNeedsSetup')}
              value={bedtime.grayscale}
              onChange={(grayscale) => apply({ grayscale })}
            />
            {!grayscaleAllowed && !demo ? <Button label={t('bedtime.grayscaleHow')} variant="ghost" small onPress={() => router.push('/habits/focus')} /> : null}
          </>
        ) : (
          <Card tone="alt">
            <Text variant="small">{Platform.OS === 'ios' ? t('bedtime.iosNote') : t('bedtime.otherNote')}</Text>
          </Card>
        )}
        {guard.isAvailable() ? (
          <ListRow icon="settings-outline" title={t('bedtime.systemMode')} subtitle={t('bedtime.systemModeSub')} onPress={() => guard.openDigitalWellbeingSettings()} />
        ) : null}
      </Section>

      <Section title={t('bedtime.routineTitle')}>
        <Text variant="small" color="textMuted">
          {t('bedtime.routineBody')}
        </Text>
        {content.windDown.map((item) => {
          const on = checked.includes(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => setChecked(on ? checked.filter((c) => c !== item.id) : [...checked, item.id])}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={item.text}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Icon name={on ? 'checkbox' : 'square-outline'} color={on ? colors.primary : colors.textMuted} />
              <Text variant="body" style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none' }}>
                {item.text}
              </Text>
            </Pressable>
          );
        })}
        {checked.length === content.windDown.length ? (
          <Card tone="success">
            <Text variant="bodyStrong" color="onSuccessSoft">
              {t('bedtime.routineDone')}
            </Text>
          </Card>
        ) : null}
      </Section>

      <Section title={t('bedtime.more')}>
        <View style={{ gap: 12 }}>
          <ListRow icon="leaf-outline" title={t('bedtime.breathe')} onPress={() => router.push({ pathname: '/mind/breathe', params: { pattern: '478' } })} />
          <ListRow icon="archive-outline" title={t('stress.worryJar')} onPress={() => router.push('/mind/stress')} />
          <ListRow icon="bed-outline" title={t('tools.sleep')} onPress={() => router.push('/mind/sleep')} />
          <ListRow icon="book-outline" title={t('bedtime.guide')} onPress={() => router.push('/connect/guide/sleep-basics')} />
        </View>
      </Section>
    </Screen>
  );
}
