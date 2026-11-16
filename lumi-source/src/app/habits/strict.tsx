import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { Chip, ListRow, ProgressBar, Row, Section, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { formatMinutes } from '@/features/celebrations';
import { formatCountdown, useNow } from '@/features/useNow';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { syncGuard } from '@/services/guardSync';
import { useApp } from '@/store/app';
import { isCommitLocked, UNLOCK_WAIT_MS, useHabits } from '@/store/habits';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatDate, formatTime } from '@/utils/time';

const CAPS = [0, 10, 15, 20, 30, 45];
const COOLDOWNS = [15, 30, 60, 120];
const LOCK_DAYS = [1, 3, 7];

export default function Strict() {
  const { t } = useT();
  const { colors } = useTheme();
  const demo = useApp((s) => s.demoMode);
  const showToast = useApp((s) => s.showToast);
  const strict = useHabits((s) => s.strict);
  const guardEnabled = useHabits((s) => s.guardEnabled);
  const limits = useHabits((s) => s.limits);
  const setStrict = useHabits((s) => s.setStrict);
  const lockStrict = useHabits((s) => s.lockStrict);
  const requestUnlock = useHabits((s) => s.requestUnlock);
  const cancelUnlock = useHabits((s) => s.cancelUnlock);
  const completeUnlock = useHabits((s) => s.completeUnlock);
  const [lockDays, setLockDays] = useState(3);
  const now = useNow(1000, !!strict.unlockRequestedAt);
  const locked = isCommitLocked(strict, now);
  const canEnforce = guard.isAvailable() || demo;
  const unlockLeft = strict.unlockRequestedAt ? strict.unlockRequestedAt + UNLOCK_WAIT_MS - now : 0;

  const change = (patch: Parameters<typeof setStrict>[0]) => {
    setStrict(patch);
    syncGuard();
  };

  const lock = async () => {
    const ok = await confirm({
      title: t('strict.lockConfirmTitle', { count: lockDays }),
      message: t('strict.lockConfirmBody'),
      confirmLabel: t('strict.lockConfirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    if (!strict.enabled) setStrict({ enabled: true });
    lockStrict(lockDays);
    syncGuard();
    showToast(t('strict.lockedToastDone'));
  };

  return (
    <Screen title={t('strict.title')} subtitle={t('strict.subtitle')} testID="screen-strict">
      <Card tone={strict.enabled ? 'primary' : 'glass'} style={{ marginBottom: 20 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <IconCircle name={strict.enabled ? 'shield-checkmark' : 'shield-outline'} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading" color={strict.enabled ? 'onPrimarySoft' : undefined}>
              {strict.enabled ? t('strict.heroOn') : t('strict.heroOff')}
            </Text>
            <Text variant="small" color={strict.enabled ? 'onPrimarySoft' : 'textMuted'}>
              {t('strict.heroBody')}
            </Text>
          </View>
        </Row>
      </Card>

      {!canEnforce ? (
        <Card tone="alt" style={{ marginBottom: 16 }}>
          <Text variant="small">{Platform.OS === 'android' ? t('limits.expoGo') : t('strict.otherPlatform')}</Text>
        </Card>
      ) : !guardEnabled || limits.length === 0 ? (
        <Card tone="warning" style={{ marginBottom: 16 }} onPress={() => router.push('/habits/limits')}>
          <Row>
            <Icon name="alert-circle-outline" color={colors.onWarningSoft} />
            <Text variant="small" color="onWarningSoft" style={{ flex: 1 }}>
              {limits.length === 0 ? t('strict.needLimits') : t('strict.needGuard')}
            </Text>
            <Icon name="chevron-forward" color={colors.onWarningSoft} />
          </Row>
        </Card>
      ) : null}

      <Section>
        <ToggleRow
          icon="shield-half-outline"
          title={t('strict.toggle')}
          subtitle={locked && strict.enabled ? t('strict.cantLoosen') : t('strict.toggleSub')}
          value={strict.enabled}
          disabled={locked && strict.enabled}
          onChange={(enabled) => change({ enabled })}
          testID="toggle-strict"
        />
      </Section>

      <Section title={t('strict.capTitle')}>
        <Text variant="small" color="textMuted">
          {t('strict.capBody')}
        </Text>
        <Row wrap gap={10}>
          {CAPS.map((cap) => {
            // Under the lock you can shorten the cap but not lengthen or remove it.
            const loosens = locked && strict.sessionCapMinutes > 0 && (cap === 0 || cap > strict.sessionCapMinutes);
            return (
              <Chip
                key={cap}
                label={cap === 0 ? t('strict.capOff') : formatMinutes(cap)}
                selected={strict.sessionCapMinutes === cap}
                onPress={() => (loosens ? showToast(t('strict.lockedToast')) : change({ sessionCapMinutes: cap }))}
              />
            );
          })}
        </Row>
        {strict.sessionCapMinutes > 0 ? (
          <>
            <Text variant="smallStrong">{t('strict.cooldownTitle')}</Text>
            <Row wrap gap={10}>
              {COOLDOWNS.map((c) => {
                const loosens = locked && c < strict.cooldownMinutes;
                return (
                  <Chip
                    key={c}
                    label={formatMinutes(c)}
                    selected={strict.cooldownMinutes === c}
                    onPress={() => (loosens ? showToast(t('strict.lockedToast')) : change({ cooldownMinutes: c }))}
                  />
                );
              })}
            </Row>
            <Text variant="caption" color="textMuted">
              {t('strict.capExample', { cap: formatMinutes(strict.sessionCapMinutes), cooldown: formatMinutes(strict.cooldownMinutes) })}
            </Text>
          </>
        ) : null}
      </Section>

      <Section title={t('strict.lockTitle')}>
        {locked ? (
          <Card>
            <Row style={{ alignItems: 'flex-start' }}>
              <IconCircle name="lock-closed" tone="accent" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('strict.lockedUntil', { date: formatDate(strict.lockedUntil, { weekday: 'long', day: 'numeric', month: 'long' }), time: formatTime(strict.lockedUntil) })}</Text>
                <Text variant="small" color="textMuted">
                  {t('strict.lockedBody')}
                </Text>
              </View>
            </Row>
            {strict.unlockRequestedAt ? (
              <View style={{ marginTop: 16, gap: 10 }}>
                <Text variant="smallStrong">{unlockLeft > 0 ? t('strict.unlockWaiting', { time: formatCountdown(unlockLeft) }) : t('strict.unlockReady')}</Text>
                <ProgressBar value={UNLOCK_WAIT_MS - Math.max(0, unlockLeft)} max={UNLOCK_WAIT_MS} label={t('strict.unlockProgress')} />
                <Row wrap>
                  <Button
                    label={t('strict.unlockNow')}
                    small
                    disabled={unlockLeft > 0}
                    onPress={() => {
                      if (completeUnlock()) {
                        syncGuard();
                        showToast(t('strict.unlockedToast'));
                      }
                    }}
                  />
                  <Button label={t('strict.keepLock')} small variant="secondary" onPress={cancelUnlock} />
                </Row>
              </View>
            ) : (
              <Button label={t('strict.emergency')} variant="ghost" small icon="key-outline" onPress={requestUnlock} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
            )}
          </Card>
        ) : (
          <>
            <Text variant="small" color="textMuted">
              {t('strict.lockBody')}
            </Text>
            <Row wrap gap={10}>
              {LOCK_DAYS.map((d) => (
                <Chip key={d} label={t('strict.days', { count: d })} selected={lockDays === d} onPress={() => setLockDays(d)} />
              ))}
            </Row>
            <Button label={t('strict.lockButton', { count: lockDays })} icon="lock-closed" full onPress={lock} testID="strict-lock" />
          </>
        )}
      </Section>

      <Section title={t('strict.alsoTitle')}>
        <ListRow icon="flash-outline" title={t('strict.deepFocus')} subtitle={t('strict.deepFocusSub')} onPress={() => router.push('/habits/focus')} />
        <ListRow icon="calendar-outline" title={t('tools.windows')} subtitle={t('limits.altWindows')} onPress={() => router.push('/habits/schedules')} />
      </Section>

      <Card tone="alt">
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="call-outline" color={colors.textMuted} />
          <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
            {t('strict.safetyNote')}
          </Text>
        </Row>
      </Card>
    </Screen>
  );
}
