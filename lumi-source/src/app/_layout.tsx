import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconCircle } from '@/components/Icon';
import { LockScreen } from '@/components/LockScreen';
import { CelebrationHost, ToastHost } from '@/components/Overlays';
import { SupportSheet } from '@/components/SupportSheet';
import { Text } from '@/components/Text';
import { bootstrapData } from '@/demo';
import { afterStart, onForeground } from '@/features/sync';
import { applyLanguage } from '@/features/language';
import { t } from '@/i18n';
import { configureNotifications } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { buildTheme, useColorSchemePreference } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const RELOCK_AFTER_MS = 30_000;

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const scheme = useColorSchemePreference();
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await bootstrapData();
        applyLanguage();
        await configureNotifications().catch(() => undefined);
        if (useSettings.getState().appLock && Platform.OS !== 'web') useApp.getState().setLocked(true);
      } finally {
        if (!cancelled) {
          useApp.getState().setReady(true);
          await SplashScreen.hideAsync().catch(() => undefined);
          void afterStart();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => undefined);
  }, [theme.colors.bg]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state === 'active' && useApp.getState().ready) {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        if (useSettings.getState().appLock && away > RELOCK_AFTER_MS && Platform.OS !== 'web') useApp.getState().setLocked(true);
        backgroundedAt.current = null;
        void onForeground();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url);
    };
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.bg,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    };
  }, [scheme, theme]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="help" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <SupportSheet />
      <CelebrationHost />
      <ToastHost />
      <LockScreen />
    </ThemeProvider>
  );
}

/** Friendly fallback if a screen crashes. The Help button keeps working. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = buildTheme('light').colors;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14, backgroundColor: colors.bg }}>
      <IconCircle name="construct-outline" tone="warning" size={72} />
      <Text variant="title" align="center">
        {t('errorBoundary.title')}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {t('errorBoundary.body')}
      </Text>
      {__DEV__ ? (
        <Text variant="caption" color="textMuted" align="center">
          {error.message}
        </Text>
      ) : null}
      <Button label={t('common.retry')} icon="refresh" onPress={retry} />
      <Button label={t('help.button')} variant="accent" icon="heart" onPress={() => router.push('/help')} />
    </View>
  );
}
