/** Searchable list of installed apps (real apps on Android, sample apps in demo mode). */
import { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { useContent, useT } from '@/i18n';
import { guard, type NativeApp } from '@/native/guard';
import { useTheme } from '@/theme';

import { Icon, IconCircle } from './Icon';
import { TextField } from './Inputs';
import { Sheet } from './Sheet';
import { LoadingState } from './States';
import { Text } from './Text';

export function AppPickerSheet({
  visible,
  onClose,
  existing,
  onPick,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  existing: string[];
  onPick: (app: NativeApp) => void;
  title?: string;
}) {
  const { t } = useT();
  const content = useContent();
  const demoApps = content.demo.apps;
  const { colors, radius } = useTheme();
  const [apps, setApps] = useState<NativeApp[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    (async () => {
      const list = guard.isAvailable() ? await guard.getLaunchableApps() : demoApps;
      if (alive) setApps(list);
    })();
    return () => {
      alive = false;
    };
  }, [visible, demoApps]);

  const filtered = useMemo(
    () => (apps ?? []).filter((a) => !existing.includes(a.packageName) && a.label.toLowerCase().includes(query.trim().toLowerCase())),
    [apps, existing, query],
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={title ?? t('limits.pickApp')}>
      <TextField label={t('limits.search')} value={query} onChangeText={setQuery} autoCorrect={false} />
      {apps === null ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Text variant="small" color="textMuted">
          {t('limits.noApps')}
        </Text>
      ) : (
        filtered.slice(0, 80).map((app) => (
          <Pressable
            key={app.packageName}
            onPress={() => onPick(app)}
            accessibilityRole="button"
            accessibilityLabel={app.label}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            })}
          >
            <IconCircle name={app.category === 'game' ? 'game-controller-outline' : app.category === 'social' ? 'people-outline' : app.category === 'video' ? 'play-circle-outline' : 'apps-outline'} size={36} tone="neutral" />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {app.label}
            </Text>
            <Icon name="add-circle-outline" color={colors.primary} />
          </Pressable>
        ))
      )}
    </Sheet>
  );
}
