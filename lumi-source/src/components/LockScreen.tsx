/** Optional app lock (fingerprint, face or phone PIN) so nobody else can read your journal. */
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { IconCircle } from './Icon';
import { Text } from './Text';

export async function canUseAppLock(): Promise<boolean> {
  try {
    const [hardware, enrolled, level] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);
    return (hardware && enrolled) || level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export function LockScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  const locked = useApp((s) => s.locked);
  const setLocked = useApp((s) => s.setLocked);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!(await canUseAppLock())) {
        // The phone no longer has a lock set up: don't trap the user out of their own app.
        useSettings.getState().update({ appLock: false });
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt'),
        cancelLabel: t('common.cancel'),
        disableDeviceFallback: false,
      });
      if (result.success) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, [setLocked, t]);

  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  if (!locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.bg }]} accessibilityViewIsModal>
      <IconCircle name="lock-closed" size={72} />
      <Text variant="title" align="center">
        {t('lock.title')}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {t('lock.body')}
      </Text>
      <Button label={t('lock.unlock')} icon="finger-print" onPress={() => void unlock()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, zIndex: 100 },
});
