import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { TextField } from '@/components/Inputs';
import { Chip, Row, Section, Stat, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { formatCountdown, useNow } from '@/features/useNow';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { syncGuard } from '@/services/guardSync';
import { cancelTimer, scheduleTimer } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useTheme } from '@/theme';
import { dateKey, weekKey } from '@/utils/time';

const PRESETS = [15, 25, 45, 60];

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
  const demo = useApp((s) => s.demoMode);
  const celebrate = useApp((s) => s.celebrate);
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState('');
  const [grayscale, setGrayscale] = useState(guard.isGrayscaleOn());
  const now = useNow(1000, !!active);
  const finishing = useRef(false);

  const remaining = active ? active.endsAt - now : 0;

  useEffect(() => {
    if (!active || remaining > 0 || finishing.current) return;
    finishing.current = true;
    end(true);
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
    end(false);
    syncGuard();
    await cancelTimer('timer-focus-end');
  };

  const thisWeek = sessions.filter((s) => s.completed && weekKey(s.startedAt) === weekKey());
  const today = sessions.filter((s) => s.completed && dateKey(s.startedAt) === dateKey());
  const canGray = guard.canWriteSecureSettings();

  return (
    <Screen title={t('tools.focus')} subtitle={t('focus.subtitle')} testID="screen-focus">
      {active ? <KeepAwake /> : null}
      <Card tone={active ? 'primary' : 'default'} style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 20 }}>
        <IconCircle name="flash" size={56} />
        <Text variant="display" style={{ marginTop: 12, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite" accessibilityLabel={active ? t('focus.remaining', { time: formatCountdown(remaining) }) : undefined}>
          {active ? formatCountdown(remaining) : formatCountdown(minutes * 60000)}
        </Text>
        <Text variant="small" color={active ? 'onPrimarySoft' : 'textMuted'} align="center">
          {active ? (active.label ? t('focus.workingOn', { label: active.label }) : t('focus.stayWithIt')) : t('focus.ready')}
        </Text>
        {active && (guard.isAvailable() || demo) && limits.length > 0 ? (
          <Text variant="caption" color="onPrimarySoft" align="center" style={{ marginTop: 6 }}>
            {t('focus.appsPaused', { count: limits.filter((l) => l.enabled).length })}
          </Text>
        ) : null}
      </Card>

      {active ? (
        <Button label={t('focus.stop')} variant="secondary" icon="stop" full onPress={stop} testID="focus-stop" />
      ) : (
        <View style={{ gap: 14 }}>
          <Text variant="smallStrong">{t('focus.length')}</Text>
          <Row wrap>
            {PRESETS.map((p) => (
              <Chip key={p} label={t('time.minutes', { count: p })} selected={minutes === p} onPress={() => setMinutes(p)} />
            ))}
          </Row>
          <TextField label={t('focus.label')} value={label} onChangeText={setLabel} maxLength={40} placeholder={t('focus.labelPlaceholder')} />
          <Button label={t('focus.start')} icon="play" full onPress={begin} testID="focus-start" />
          <Text variant="caption" color="textMuted">
            {guard.isAvailable() ? t('focus.howAndroid') : t('focus.howOther')}
          </Text>
        </View>
      )}

      <Row style={{ marginVertical: 20 }}>
        <Stat label={t('focus.today')} value={String(today.length)} />
        <Stat label={t('focus.thisWeek')} value={String(thisWeek.length)} tone="primary" />
      </Row>

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
