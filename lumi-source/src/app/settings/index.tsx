import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { canUseAppLock } from '@/components/LockScreen';
import { Segmented, TextField, TimeField } from '@/components/Inputs';
import { Chip, ListRow, Section, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { demoLocked, enterDemoMode, exitDemoMode, resetDemoData } from '@/demo';
import { applyLanguage } from '@/features/language';
import { LANGUAGES, useContent, useT } from '@/i18n';
import { getNotificationPermission, requestNotificationPermission, syncReminders, type PermissionState } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import type { ConcernId, GoalId, NotificationPrefs, ThemePref } from '@/store/types';
import { confirm } from '@/utils/confirm';

const NOTIFICATION_KEYS: (keyof NotificationPrefs)[] = ['checkin', 'bedtime', 'morning', 'windows', 'nudges', 'weekly', 'quotes'];

export default function Settings() {
  const { t } = useT();
  const content = useContent();
  const s = useSettings();
  const demo = useApp((x) => x.demoMode);
  const toast = useApp((x) => x.showToast);
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getNotificationPermission().then(setPerm);
  }, []);

  const toggleConcern = (id: ConcernId) => s.update({ concerns: s.concerns.includes(id) ? s.concerns.filter((c) => c !== id) : [...s.concerns, id] });
  const toggleGoal = (id: GoalId) => s.update({ goals: s.goals.includes(id) ? s.goals.filter((g) => g !== id) : [...s.goals, id] });
  const setNotif = (key: keyof NotificationPrefs, value: boolean) => {
    s.setNotification(key, value);
    void syncReminders();
  };

  return (
    <Screen title={t('settings.title')} testID="screen-settings">
      <Section title={t('settings.profile')}>
        <TextField label={t('onboarding.nickname')} hint={t('onboarding.nicknameHint')} value={s.nickname} onChangeText={(nickname) => s.update({ nickname })} maxLength={30} />
      </Section>

      <Section title={t('settings.focus')}>
        <Text variant="small" color="textMuted">
          {t('settings.focusBody')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {content.concerns.map((c) => (
            <Chip key={c.id} label={c.label} selected={s.concerns.includes(c.id as ConcernId)} onPress={() => toggleConcern(c.id as ConcernId)} />
          ))}
        </View>
        <Text variant="smallStrong">{t('settings.goals')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {content.goals.map((g) => (
            <Chip key={g.id} label={g.label} icon={g.icon} selected={s.goals.includes(g.id as GoalId)} onPress={() => toggleGoal(g.id as GoalId)} />
          ))}
        </View>
      </Section>

      <Section title={t('settings.reminders')}>
        {perm !== 'granted' && perm !== 'unsupported' ? (
          <Button
            label={t('permissions.allowReminders')}
            icon="notifications"
            variant="soft"
            onPress={async () => {
              await requestNotificationPermission();
              const next = await getNotificationPermission();
              setPerm(next);
              if (next === 'granted') void syncReminders();
            }}
          />
        ) : null}
        {perm === 'unsupported' ? (
          <Text variant="small" color="textMuted">
            {t('permissions.notificationsWeb')}
          </Text>
        ) : null}
        <TimeField
          label={t('onboarding.checkin')}
          value={s.checkinTime}
          onChange={(checkinTime) => {
            s.update({ checkinTime });
            void syncReminders();
          }}
        />
        {NOTIFICATION_KEYS.map((key) => (
          <ToggleRow key={key} title={t(`settings.notif.${key}`)} subtitle={t(`settings.notif.${key}Sub`)} value={s.notifications[key]} onChange={(v) => setNotif(key, v)} />
        ))}
        <Text variant="caption" color="textMuted">
          {t('settings.notifPrivacy')}
        </Text>
      </Section>

      <Section title={t('settings.appearance')}>
        <Segmented<ThemePref>
          label={t('settings.theme')}
          value={s.theme}
          onChange={(theme) => s.update({ theme })}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
        <ToggleRow title={t('settings.reduceMotion')} subtitle={t('settings.reduceMotionSub')} value={s.reduceMotion} onChange={(reduceMotion) => s.update({ reduceMotion })} />
        <ToggleRow title={t('settings.sounds')} subtitle={t('settings.soundsSub')} value={s.sounds} onChange={(sounds) => s.update({ sounds })} />
        {Platform.OS !== 'web' ? <ToggleRow title={t('settings.haptics')} value={s.haptics} onChange={(haptics) => s.update({ haptics })} /> : null}
        <Text variant="smallStrong">{t('settings.language')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('settings.languageSystem')} selected={s.language === 'system'} onPress={() => {
            s.update({ language: 'system' });
            applyLanguage();
          }} />
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} selected={s.language === l.code} onPress={() => {
              s.update({ language: l.code });
              applyLanguage();
            }} />
          ))}
        </View>
        <Text variant="caption" color="textMuted">
          {t('settings.languageNote')}
        </Text>
      </Section>

      <Section title={t('settings.security')}>
        {Platform.OS !== 'web' ? (
          <ToggleRow
            icon="lock-closed-outline"
            title={t('settings.appLock')}
            subtitle={t('settings.appLockSub')}
            value={s.appLock}
            onChange={async (value) => {
              if (value && !(await canUseAppLock())) {
                toast(t('settings.appLockUnavailable'));
                return;
              }
              s.update({ appLock: value });
            }}
          />
        ) : null}
        <ListRow icon="shield-outline" title={t('settings.privacy')} subtitle={t('me.privacySub')} onPress={() => router.push('/settings/privacy')} testID="row-privacy" />
        <ListRow icon="key-outline" title={t('settings.permissions')} subtitle={t('settings.permissionsSub')} onPress={() => router.push('/settings/permissions')} />
        <ListRow icon="person-outline" title={t('connect.trusted')} onPress={() => router.push('/connect/trusted')} />
      </Section>

      <Section title={t('settings.demo')}>
        <Text variant="small" color="textMuted">
          {demo ? t('settings.demoOnBody') : t('settings.demoOffBody')}
        </Text>
        {demoLocked ? (
          <Text variant="caption" color="textMuted">
            {t('settings.demoLocked')}
          </Text>
        ) : (
          <Button
            label={demo ? t('settings.demoExit') : t('settings.demoEnter')}
            icon="flask-outline"
            variant="secondary"
            loading={busy}
            full
            testID="toggle-demo"
            onPress={async () => {
              const ok = await confirm({
                title: demo ? t('settings.demoExit') : t('settings.demoEnter'),
                message: demo ? t('settings.demoExitConfirm') : t('settings.demoEnterConfirm'),
                confirmLabel: t('common.continue'),
                cancelLabel: t('common.cancel'),
              });
              if (!ok) return;
              setBusy(true);
              try {
                if (demo) await exitDemoMode();
                else await enterDemoMode();
                router.replace('/');
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {demo ? (
          <Button
            label={t('settings.demoReset')}
            variant="ghost"
            full
            onPress={async () => {
              await resetDemoData();
              toast(t('settings.demoResetDone'));
            }}
          />
        ) : null}
      </Section>

      <Section title={t('settings.more')}>
        <ListRow icon="information-circle-outline" title={t('settings.about')} onPress={() => router.push('/settings/about')} />
      </Section>
    </Screen>
  );
}
