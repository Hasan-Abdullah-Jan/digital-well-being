import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { getNotificationPermission, requestNotificationPermission, type PermissionState } from '@/services/notifications';
import { useTheme } from '@/theme';

type Item = { id: string; icon: string; title: string; why: string; status: 'on' | 'off' | 'na'; action?: () => void; actionLabel?: string };

export default function Permissions() {
  const { t } = useT();
  const { colors } = useTheme();
  const [notif, setNotif] = useState<PermissionState>('undetermined');
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    setNotif(await getNotificationPermission());
    setTick((x) => x + 1);
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  const android = guard.isAvailable();
  const items: Item[] = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: t('perm.notificationsTitle'),
      why: t('perm.notificationsWhy'),
      status: notif === 'unsupported' ? 'na' : notif === 'granted' ? 'on' : 'off',
      action: notif === 'denied' ? () => Linking.openSettings() : async () => {
        await requestNotificationPermission();
        await refresh();
      },
      actionLabel: notif === 'denied' ? t('perm.openSettings') : t('perm.allow'),
    },
    {
      id: 'usage',
      icon: 'stats-chart-outline',
      title: t('perm.usageTitle'),
      why: t('perm.usageWhy'),
      status: android ? (guard.hasUsageAccess() ? 'on' : 'off') : 'na',
      action: () => guard.openUsageAccessSettings(),
      actionLabel: t('perm.manage'),
    },
    {
      id: 'overlay',
      icon: 'layers-outline',
      title: t('perm.overlayTitle'),
      why: t('perm.overlayWhy'),
      status: android ? (guard.canDrawOverlays() ? 'on' : 'off') : 'na',
      action: () => guard.openOverlaySettings(),
      actionLabel: t('perm.manage'),
    },
    {
      id: 'grayscale',
      icon: 'contrast-outline',
      title: t('perm.grayscaleTitle'),
      why: t('perm.grayscaleWhy'),
      status: android ? (guard.canWriteSecureSettings() ? 'on' : 'off') : 'na',
    },
    { id: 'photos', icon: 'image-outline', title: t('perm.photosTitle'), why: t('perm.photosWhy'), status: 'na' },
    { id: 'biometrics', icon: 'finger-print-outline', title: t('perm.biometricsTitle'), why: t('perm.biometricsWhy'), status: 'na' },
    { id: 'network', icon: 'cloud-outline', title: t('perm.networkTitle'), why: t('perm.networkWhy'), status: 'na' },
  ];

  return (
    <Screen title={t('settings.permissions')} subtitle={t('perm.subtitle')} testID="screen-permissions">
      <View style={{ gap: 12 }}>
        {items.map((item) => (
          <Card key={item.id}>
            <Row style={{ alignItems: 'flex-start' }}>
              <IconCircle name={item.icon} tone={item.status === 'on' ? 'success' : 'neutral'} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{item.title}</Text>
                <Text variant="small" color="textMuted" style={{ marginTop: 2 }}>
                  {item.why}
                </Text>
                <Row style={{ marginTop: 8 }} gap={6}>
                  <Icon
                    name={item.status === 'on' ? 'checkmark-circle' : item.status === 'off' ? 'remove-circle-outline' : 'information-circle-outline'}
                    size={18}
                    color={item.status === 'on' ? colors.success : colors.textMuted}
                  />
                  <Text variant="caption" color="textMuted">
                    {item.status === 'on' ? t('perm.on') : item.status === 'off' ? t('perm.off') : t('perm.whenNeeded')}
                  </Text>
                </Row>
              </View>
            </Row>
            {item.status === 'off' && item.action && item.actionLabel ? (
              <Button label={item.actionLabel} small variant="soft" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={item.action} />
            ) : null}
          </Card>
        ))}
      </View>
      <Text variant="caption" color="textMuted" style={{ marginTop: 16 }}>
        {Platform.OS === 'ios' ? t('perm.iosNote') : t('perm.footer')}
      </Text>
    </Screen>
  );
}
