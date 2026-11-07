import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { Stepper, TextField } from '@/components/Inputs';
import { ListRow, Row, Section, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState, LoadingState } from '@/components/States';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { useContent, useT } from '@/i18n';
import { guard, type NativeApp } from '@/native/guard';
import { syncGuard } from '@/services/guardSync';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import type { AppLimit } from '@/store/types';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';

function usePermissionStatus() {
  const [state, setState] = useState({ usage: guard.hasUsageAccess(), overlay: guard.canDrawOverlays() });
  const refresh = useCallback(() => setState({ usage: guard.hasUsageAccess(), overlay: guard.canDrawOverlays() }), []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refresh();
        syncGuard();
      }
    });
    return () => sub.remove();
  }, [refresh]);
  return state;
}

export default function Limits() {
  const { t } = useT();
  const content = useContent();
  const { colors } = useTheme();
  const demo = useApp((s) => s.demoMode);
  const limits = useHabits((s) => s.limits);
  const guardEnabled = useHabits((s) => s.guardEnabled);
  const habits = useHabits();
  const watched = useSettings((s) => s.watchedApps);
  const frictionMinutes = useSettings((s) => s.frictionMinutes);
  const updateSettings = useSettings((s) => s.update);
  const perms = usePermissionStatus();
  const [adding, setAdding] = useState(false);
  const canEnforce = guard.isAvailable();

  const change = (fn: () => void) => {
    fn();
    syncGuard();
  };

  const toggleWatched = (pkg: string) =>
    change(() => updateSettings({ watchedApps: watched.includes(pkg) ? watched.filter((p) => p !== pkg) : [...watched, pkg] }));

  if (!canEnforce && !demo) {
    return (
      <Screen title={t('limits.title')} testID="screen-limits">
        <Card tone="alt" style={{ marginBottom: 16 }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <IconCircle name="information-circle-outline" tone="neutral" />
            <Text variant="small" style={{ flex: 1 }}>
              {Platform.OS === 'android' ? t('limits.expoGo') : t('limits.notSupported')}
            </Text>
          </Row>
        </Card>
        <Section title={t('limits.alternatives')}>
          <ListRow icon="calendar-outline" title={t('tools.windows')} subtitle={t('limits.altWindows')} onPress={() => router.push('/habits/schedules')} />
          <ListRow icon="flash-outline" title={t('tools.focus')} subtitle={t('limits.altFocus')} onPress={() => router.push('/habits/focus')} />
          <ListRow icon="create-outline" title={t('tools.checkin')} subtitle={t('limits.altCheckin')} onPress={() => router.push('/habits/checkin')} />
        </Section>
        {Platform.OS === 'ios' ? (
          <Card>
            <Text variant="bodyStrong">{t('limits.iosTitle')}</Text>
            <Text variant="small" color="textMuted" style={{ marginTop: 6 }}>
              {t('limits.iosSteps')}
            </Text>
          </Card>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      title={t('limits.title')}
      subtitle={t('limits.subtitle')}
      testID="screen-limits"
      footer={<Button label={t('limits.addApp')} icon="add" full onPress={() => setAdding(true)} testID="add-app" />}
    >
      {canEnforce ? (
        <Section title={t('limits.guardTitle')}>
          <Card>
            <Text variant="small" color="textMuted" style={{ marginBottom: 12 }}>
              {t('limits.guardBody')}
            </Text>
            <PermissionLine ok={perms.usage} label={t('limits.permUsage')} hint={t('limits.permUsageHint')} onFix={() => guard.openUsageAccessSettings()} />
            <PermissionLine ok={perms.overlay} label={t('limits.permOverlay')} hint={t('limits.permOverlayHint')} onFix={() => guard.openOverlaySettings()} />
          </Card>
          <ToggleRow
            icon="shield-checkmark-outline"
            title={t('limits.guardToggle')}
            subtitle={!perms.usage ? t('limits.needUsage') : guardEnabled ? t('limits.guardOn') : t('limits.guardOff')}
            value={guardEnabled && perms.usage}
            disabled={!perms.usage}
            onChange={(v) => change(() => habits.setGuardEnabled(v))}
            testID="toggle-guard"
          />
        </Section>
      ) : (
        <Card tone="warning" style={{ marginBottom: 16 }}>
          <Text variant="small" color="onWarningSoft">
            {t('limits.demoNote')}
          </Text>
        </Card>
      )}

      <Section title={t('limits.yourApps')}>
        {limits.length === 0 ? (
          <EmptyState icon="apps-outline" title={t('limits.emptyTitle')} body={t('limits.emptyBody')} />
        ) : (
          limits.map((limit) => (
            <LimitCard
              key={limit.id}
              limit={limit}
              watched={watched.includes(limit.packageName)}
              onToggleWatched={() => toggleWatched(limit.packageName)}
              onChange={(patch) => change(() => habits.upsertLimit({ ...limit, ...patch }))}
              onRemove={async () => {
                const ok = await confirm({
                  title: t('limits.removeTitle', { app: limit.label }),
                  message: t('limits.removeBody'),
                  confirmLabel: t('common.remove'),
                  cancelLabel: t('common.cancel'),
                  destructive: true,
                });
                if (ok) change(() => {
                  habits.removeLimit(limit.id);
                  updateSettings({ watchedApps: watched.filter((p) => p !== limit.packageName) });
                });
              }}
            />
          ))
        )}
      </Section>

      <Section title={t('limits.nudgeTitle')}>
        <Text variant="small" color="textMuted">
          {t('limits.nudgeBody')}
        </Text>
        <Stepper
          label={t('limits.nudgeAfter')}
          value={frictionMinutes}
          min={5}
          max={90}
          step={5}
          format={(v) => formatMinutes(v)}
          onChange={(v) => change(() => updateSettings({ frictionMinutes: v }))}
        />
      </Section>

      <Card tone="alt">
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="lock-closed-outline" color={colors.textMuted} />
          <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
            {t('limits.privacy')}
          </Text>
        </Row>
      </Card>

      <AddAppSheet
        visible={adding}
        onClose={() => setAdding(false)}
        existing={limits.map((l) => l.packageName)}
        demoApps={content.demo.apps}
        onPick={(app) => {
          change(() => habits.upsertLimit({ packageName: app.packageName, label: app.label, minutesPerDay: 30, pauseOnOpen: true, enabled: true }));
          setAdding(false);
        }}
      />
    </Screen>
  );
}

function PermissionLine({ ok, label, hint, onFix }: { ok: boolean; label: string; hint: string; onFix: () => void }) {
  const { t } = useT();
  const { colors } = useTheme();
  return (
    <Row style={{ marginBottom: 10, alignItems: 'flex-start' }}>
      <Icon name={ok ? 'checkmark-circle' : 'alert-circle-outline'} color={ok ? colors.success : colors.warning} />
      <View style={{ flex: 1 }}>
        <Text variant="smallStrong">{label}</Text>
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      </View>
      {!ok ? <Button label={t('limits.allow')} small variant="soft" onPress={onFix} /> : null}
    </Row>
  );
}

function LimitCard({
  limit,
  watched,
  onChange,
  onToggleWatched,
  onRemove,
}: {
  limit: AppLimit;
  watched: boolean;
  onChange: (patch: Partial<AppLimit>) => void;
  onToggleWatched: () => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {limit.label}
        </Text>
        <Button label={t('common.remove')} variant="ghost" small onPress={onRemove} />
      </Row>
      <View style={{ gap: 10 }}>
        <Stepper
          label={t('limits.dailyLimit')}
          value={limit.minutesPerDay}
          min={0}
          max={480}
          step={15}
          format={(v) => (v === 0 ? t('limits.noLimit') : formatMinutes(v))}
          onChange={(minutesPerDay) => onChange({ minutesPerDay })}
        />
        <ToggleRow title={t('limits.pauseOnOpen')} subtitle={t('limits.pauseOnOpenSub')} value={limit.pauseOnOpen} onChange={(pauseOnOpen) => onChange({ pauseOnOpen })} />
        <ToggleRow title={t('limits.longSession')} subtitle={t('limits.longSessionSub')} value={watched} onChange={onToggleWatched} />
        <ToggleRow title={t('limits.active')} value={limit.enabled} onChange={(enabled) => onChange({ enabled })} />
      </View>
    </Card>
  );
}

function AddAppSheet({
  visible,
  onClose,
  existing,
  demoApps,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  existing: string[];
  demoApps: { packageName: string; label: string; category: string }[];
  onPick: (app: NativeApp) => void;
}) {
  const { t } = useT();
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
    <Sheet visible={visible} onClose={onClose} title={t('limits.pickApp')}>
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
