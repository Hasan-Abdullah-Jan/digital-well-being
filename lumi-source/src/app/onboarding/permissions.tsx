import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Row } from '@/components/Layout';
import { OnboardingFrame } from '@/components/OnboardingFrame';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { getNotificationPermission, requestNotificationPermission, type PermissionState } from '@/services/notifications';

export default function Permissions() {
  const { t } = useT();
  const [notif, setNotif] = useState<PermissionState>('undetermined');
  const [usage, setUsage] = useState(guard.hasUsageAccess());

  const refresh = useCallback(async () => {
    setNotif(await getNotificationPermission());
    setUsage(guard.hasUsageAccess());
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  return (
    <OnboardingFrame step={4} title={t('onboarding.permissionsTitle')} subtitle={t('onboarding.permissionsSubtitle')} onNext={() => router.push('/onboarding/safety')}>
      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <IconCircle name="notifications-outline" />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {t('permissions.notificationsTitle')}
          </Text>
        </Row>
        <Text variant="small" color="textMuted" style={{ marginVertical: 10 }}>
          {t('permissions.notificationsBody')}
        </Text>
        {notif === 'granted' ? (
          <Text variant="smallStrong" color="success">
            {t('permissions.allowed')}
          </Text>
        ) : notif === 'unsupported' ? (
          <Text variant="small" color="textMuted">
            {t('permissions.notificationsWeb')}
          </Text>
        ) : (
          <Button label={t('permissions.allowReminders')} variant="soft" icon="notifications" onPress={async () => {
            await requestNotificationPermission();
            await refresh();
          }} />
        )}
      </Card>

      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <IconCircle name="stats-chart-outline" />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {t('permissions.usageTitle')}
          </Text>
        </Row>
        <Text variant="small" color="textMuted" style={{ marginVertical: 10 }}>
          {guard.isAvailable() ? t('permissions.usageBody') : Platform.OS === 'android' ? t('permissions.usageExpoGo') : t('permissions.usageOther')}
        </Text>
        {guard.isAvailable() ? (
          usage ? (
            <Text variant="smallStrong" color="success">
              {t('permissions.allowed')}
            </Text>
          ) : (
            <Button label={t('permissions.openUsageSettings')} variant="soft" icon="open-outline" onPress={() => guard.openUsageAccessSettings()} />
          )
        ) : null}
      </Card>
      <Text variant="caption" color="textMuted">
        {t('permissions.later')}
      </Text>
    </OnboardingFrame>
  );
}
