import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { AppPickerSheet } from '@/components/AppPicker';
import { Segmented, TextField } from '@/components/Inputs';
import { Chip, Pill, ProgressBar, Row, Section, Stat, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { formatMinutes } from '@/features/celebrations';
import { formatCountdown, useNow } from '@/features/useNow';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { syncGuard } from '@/services/guardSync';
import { cancelTimer, scheduleTimer } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useTheme } from '@/theme';
import { dateKey, weekKey } from '@/utils/time';

const PRESETS = [15, 25, 45, 60, 90];
/** A locked session can still be ended in an emergency, after a short wait. */
const EMERGENCY_WAIT_MS = 60_000;

function KeepAwake() {
  useKeepAwake();
  return null;
}

export default function Focus() {
  const { t } = useT();
  const { colors } = useTheme();
  const active = useHabits((s) => s.activeFocus);
  const sessions = useHabits((s) => s.focusSessions);
  const start = useHabits((s) => s.startFocus);
  const end = useHabits((s) => s.endFocus);
  const limits = useHabits((s) => s.limits);
  const mode = useHabits((s) => s.focusMode);
  const lockedPref = useHabits((s) => s.focusLocked);
  const allow = useHabits((s) => s.focusAllow);
  const setOptions = useHabits((s) => s.setFocusOptions);
  const demo = useApp((s) => s.demoMode);
  const celebrate = useApp((s) => s.celebrate);
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState('');
  const [picking, setPicking] = useState(false);
  const [stopAt, setStopAt] = useState<number | null>(null);
  const [grayscale, setGrayscale] = useState(guard.isGrayscaleOn());
  const now = useNow(1000, !!active || !!stopAt);
  const finishing = useRef(false);
  const enforce = guard.isAvailable() || demo;

  const remaining = active ? active.endsAt - now : 0;
  const total = active ? active.endsAt - active.startedAt : 1;

  useEffect(() => {
    if (!active || remaining > 0 || finishing.current) return;
    finishing.current = true;
    end(true);
    setStopAt(null);
    syncGuard();
    celebrate({ kind: 'message', title: t('focus.doneTitle'), body: t('focus.doneBody') });
    checkBadges();
    finishing.current = false;
  }, [active, remaining, end, celebrate, t]);

  const begin = async () => {
    const timer = start(minutes, label.trim() || undefined);
    syncGuard();
    await scheduleTimer('timer-focus-end', timer.endsAt, t('focus.notifTitle'), t('focus.notifBody'), '/habits/focus');
  };

  const stop = async () => {
    setStopAt(null);
    end(false);
    syncGuard();
    await cancelTimer('timer-focus-end');
  };

  const stopLeft = stopAt ? stopAt - now : 0;
  const thisWeek = sessions.filter((s) => s.completed && weekKey(s.startedAt) === weekKey());
  const today = sessions.filter((s) => s.completed && dateKey(s.startedAt) === dateKey());
  const weekMinutes = thisWeek.reduce((sum, s) => sum + s.plannedMinutes, 0);
  const canGray = guard.canWriteSecureSettings();
  const activeMode = active?.mode ?? 'gentle';
  const enabledLimits = limits.filter((l) => l.enabled).length;

  return (
    <Screen title={t('tools.focus')} subtitle={t('focus.subtitle')} testID="screen-focus">
      {active ? <KeepAwake /> : null}
      <Card tone={active ? 'primary' : 'default'} style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 20 }}>
        <IconCircle name={active ? (activeMode === 'deep' ? 'moon' : 'flash') : 'flash'} size={56} />
        <Text variant="display" style={{ marginTop: 12, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite" accessibilityLabel={active ? t('focus.remaining', { time: formatCountdown(remaining) }) : undefined}>
          {active ? formatCountdown(remaining) : formatCountdown(minutes * 60000)}
        </Text>
        <Text variant="small" color={active ? 'onPrimarySoft' : 'textMuted'} align="center">
          {active ? (active.label ? t('focus.workingOn', { label: active.label }) : t('focus.stayWithIt')) : t('focus.ready')}
        </Text>
        {active ? (
          <View style={{ alignSelf: 'stretch', marginTop: 16, gap: 10 }}>
            <ProgressBar value={total - Math.max(0, remaining)} max={total} label={t('focus.progress')} />
            <Row wrap gap={8} style={{ justifyContent: 'center' }}>
              <Pill label={activeMode === 'deep' ? t('focus.modeDeep') : t('focus.modeGentle')} tone="primary" icon={activeMode === 'deep' ? 'moon-outline' : 'flash-outline'} />
              {active.locked ? <Pill label={t('focus.lockedPill')} tone="accent" icon="lock-closed-outline" /> : null}
            </Row>
            {enforce ? (
              <Text variant="caption" color="onPrimarySoft" align="center">
                {activeMode === 'deep' ? (allow.length ? t('focus.deepRunning', { count: allow.length }) : t('focus.deepRunningNone')) : enabledLimits > 0 ? t('focus.appsPaused', { count: enabledLimits }) : t('focus.noLimitsYet')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      {active ? (
        active.locked ? (
          stopAt ? (
            <View style={{ gap: 10 }}>
              <Text variant="small" color="textMuted" align="center">
                {stopLeft > 0 ? t('focus.emergencyWait', { time: formatCountdown(stopLeft) }) : t('focus.emergencyReady')}
              </Text>
              <Row>
                <Button label={t('focus.keepGoing')} full style={{ flex: 1 }} onPress={() => setStopAt(null)} />
                <Button label={t('focus.endNow')} variant="danger" style={{ flex: 1 }} full disabled={stopLeft > 0} onPress={stop} testID="focus-stop" />
              </Row>
            </View>
          ) : (
            <Button label={t('focus.emergencyStop')} variant="ghost" icon="alert-circle-outline" full onPress={() => setStopAt(Date.now() + EMERGENCY_WAIT_MS)} testID="focus-emergency" />
          )
        ) : (
          <Button label={t('focus.stop')} variant="secondary" icon="stop" full onPress={stop} testID="focus-stop" />
        )
      ) : (
        <View style={{ gap: 14 }}>
          <Text variant="smallStrong">{t('focus.length')}</Text>
          <Row wrap>
            {PRESETS.map((p) => (
              <Chip key={p} label={t('time.minutes', { count: p })} selected={minutes === p} onPress={() => setMinutes(p)} />
            ))}
          </Row>
          <TextField label={t('focus.label')} value={label} onChangeText={setLabel} maxLength={40} placeholder={t('focus.labelPlaceholder')} />

          <Text variant="smallStrong">{t('focus.modeTitle')}</Text>
          <Segmented
            label={t('focus.modeTitle')}
            value={mode}
            onChange={(focusMode) => setOptions({ focusMode })}
            options={[
              { value: 'gentle', label: t('focus.modeGentle') },
              { value: 'deep', label: t('focus.modeDeep') },
            ]}
          />
          <Text variant="caption" color="textMuted">
            {mode === 'deep' ? (enforce ? t('focus.deepHow') : t('focus.deepOther')) : enforce ? t('focus.howAndroid') : t('focus.howOther')}
          </Text>

          {mode === 'deep' && enforce ? (
            <Card>
              <Text variant="bodyStrong">{t('focus.allowedTitle')}</Text>
              <Text variant="caption" color="textMuted" style={{ marginVertical: 6 }}>
                {t('focus.allowedAlways')}
              </Text>
              <Row wrap gap={8}>
                {allow.map((a) => (
                  <Chip key={a.packageName} label={a.label} icon="close" selected onPress={() => setOptions({ focusAllow: allow.filter((x) => x.packageName !== a.packageName) })} />
                ))}
                <Chip label={t('focus.allowAdd')} icon="add" onPress={() => setPicking(true)} />
              </Row>
            </Card>
          ) : null}

          <ToggleRow icon="lock-closed-outline" title={t('focus.lockToggle')} subtitle={t('focus.lockToggleSub')} value={lockedPref} onChange={(focusLocked) => setOptions({ focusLocked })} testID="toggle-focus-lock" />
          <Button label={t('focus.start')} icon="play" full onPress={begin} testID="focus-start" />
        </View>
      )}

      <Row style={{ marginVertical: 20 }} wrap>
        <Stat label={t('focus.today')} value={String(today.length)} />
        <Stat label={t('focus.thisWeek')} value={String(thisWeek.length)} hint={formatMinutes(weekMinutes)} tone="primary" />
      </Row>

      <AppPickerSheet
        visible={picking}
        onClose={() => setPicking(false)}
        title={t('focus.allowPick')}
        existing={allow.map((a) => a.packageName)}
        onPick={(app) => {
          setOptions({ focusAllow: [...allow, { packageName: app.packageName, label: app.label }] });
          setPicking(false);
        }}
      />

      <Section title={t('focus.grayTitle')}>
        <Text variant="small" color="textMuted">
          {t('focus.grayBody')}
        </Text>
        {Platform.OS === 'android' && guard.isAvailable() ? (
          canGray ? (
            <ToggleRow
              icon="contrast-outline"
              title={t('focus.grayToggle')}
              value={grayscale}
              onChange={(v) => {
                const ok = guard.setGrayscale(v);
                if (ok) setGrayscale(v);
              }}
            />
          ) : (
            <Card>
              <Text variant="bodyStrong">{t('focus.grayManualTitle')}</Text>
              <Text variant="small" color="textMuted" style={{ marginVertical: 8 }}>
                {t('focus.grayManualSteps')}
              </Text>
              <Button label={t('focus.openAccessibility')} small variant="soft" onPress={() => guard.openAccessibilitySettings()} />
              <Text variant="caption" color="textMuted" style={{ marginTop: 10 }}>
                {t('focus.grayAdb')}
              </Text>
              <Text variant="caption" selectable style={{ fontFamily: Platform.select({ android: 'monospace', default: 'Courier' }), color: colors.text, marginTop: 4 }}>
                adb shell pm grant digital_wellbeing.app android.permission.WRITE_SECURE_SETTINGS
              </Text>
            </Card>
          )
        ) : (
          <Card tone="alt">
            <Text variant="small">{Platform.OS === 'ios' ? t('focus.grayIos') : t('focus.grayOther')}</Text>
          </Card>
        )}
      </Section>
    </Screen>
  );
}
