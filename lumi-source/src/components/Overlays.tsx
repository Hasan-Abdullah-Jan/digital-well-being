/** App-wide overlays: badge celebrations and short toasts. */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useContent, useT } from '@/i18n';
import { playSound } from '@/services/sound';
import { useApp } from '@/store/app';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { IconCircle } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export function CelebrationHost() {
  const { t } = useT();
  const content = useContent();
  const current = useApp((s) => s.celebrations[0]);
  const support = useApp((s) => s.support.visible);
  const dismiss = useApp((s) => s.dismissCelebration);
  // Never celebrate on top of a support moment.
  const visible = !!current && !support;
  const badge = current?.badgeId ? content.badges.find((b) => b.id === current.badgeId) : undefined;
  useEffect(() => {
    if (visible && current) playSound('celebrate');
  }, [visible, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet visible={visible} onClose={dismiss} testID="celebration">
      <View style={{ alignItems: 'center', gap: 10 }}>
        <IconCircle name={badge?.icon ?? 'sparkles'} tone="success" size={72} />
        <Text variant="title" align="center">
          {current?.title ?? ''}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {current?.body ?? ''}
        </Text>
      </View>
      <Button label={t('celebrate.thanks')} full onPress={dismiss} />
    </Sheet>
  );
}

export function ToastHost() {
  const { colors, radius, neu } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useApp((s) => s.toast);
  const clear = useApp((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clear, 3200);
    return () => clearTimeout(timer);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 90 }]}>
      <View style={[styles.toast, { backgroundColor: colors.text, borderRadius: radius.pill, boxShadow: neu.float }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text variant="smallStrong" style={{ color: colors.bg }} align="center">
          {toast.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { paddingHorizontal: 18, paddingVertical: 12, maxWidth: 560 },
});
