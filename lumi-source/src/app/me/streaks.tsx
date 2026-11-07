import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Segmented, Stepper, TextField } from '@/components/Inputs';
import { Chip, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { formatMinutes } from '@/features/celebrations';
import { currentStreakLength, isLoggedToday, totalKeptDays } from '@/features/streaks';
import { useT } from '@/i18n';
import { guard } from '@/native/guard';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import { useProgress } from '@/store/progress';
import type { Streak } from '@/store/types';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatWeekdayShort, lastNDays } from '@/utils/time';

export default function Streaks() {
  const { t } = useT();
  const streaks = useProgress((s) => s.streaks);
  const p = useProgress();
  const limits = useHabits((s) => s.limits);
  const demo = useApp((s) => s.demoMode);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<'custom' | 'app'>('custom');
  const [label, setLabel] = useState('');
  const [app, setApp] = useState<string | null>(null);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [restartFor, setRestartFor] = useState<Streak | null>(null);
  const appStreaksPossible = (guard.isAvailable() && guard.hasUsageAccess()) || demo;

  const log = (s: Streak, kept: boolean) => {
    const { restarted } = p.logStreak(s.id, kept);
    if (restarted) setRestartFor(s);
    checkBadges();
  };

  const create = () => {
    if (kind === 'app') {
      const limit = limits.find((l) => l.packageName === app);
      if (!limit) return;
      p.addStreak({ kind: 'app', packageName: limit.packageName, label: limit.label, maxMinutes });
    } else {
      if (!label.trim()) return;
      p.addStreak({ kind: 'custom', label: label.trim() });
    }
    setLabel('');
    setApp(null);
    setCreating(false);
  };

  return (
    <Screen
      title={t('me.streaks')}
      subtitle={t('streaks.subtitle')}
      testID="screen-streaks"
      footer={<Button label={t('streaks.new')} icon="add" full onPress={() => setCreating(true)} testID="streak-new" />}
    >
      {streaks.length === 0 ? <EmptyState icon="flame-outline" title={t('streaks.emptyTitle')} body={t('streaks.emptyBody')} /> : null}
      <View style={{ gap: 12 }}>
        {streaks.map((s) => (
          <StreakCard
            key={s.id}
            streak={s}
            onKept={() => log(s, true)}
            onSlipped={() => log(s, false)}
            onDelete={async () => {
              const ok = await confirm({ title: t('streaks.deleteTitle'), message: t('streaks.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
              if (ok) p.removeStreak(s.id);
            }}
          />
        ))}
      </View>
      <Card tone="alt" style={{ marginTop: 16 }}>
        <Text variant="small">{t('streaks.kindNote')}</Text>
      </Card>

      <Sheet visible={creating} onClose={() => setCreating(false)} title={t('streaks.new')}>
        {appStreaksPossible && limits.length > 0 ? (
          <Segmented
            label={t('streaks.type')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'custom', label: t('streaks.custom') },
              { value: 'app', label: t('streaks.appBased') },
            ]}
          />
        ) : null}
        {kind === 'custom' ? (
          <>
            <TextField label={t('streaks.label')} hint={t('streaks.labelHint')} value={label} onChangeText={setLabel} maxLength={60} testID="streak-label" />
            <Row wrap>
              {[t('streaks.example1'), t('streaks.example2'), t('streaks.example3')].map((ex) => (
                <Chip key={ex} label={ex} onPress={() => setLabel(ex)} />
              ))}
            </Row>
          </>
        ) : (
          <>
            <Text variant="smallStrong">{t('streaks.pickApp')}</Text>
            <Row wrap>
              {limits.map((l) => (
                <Chip key={l.packageName} label={l.label} selected={app === l.packageName} onPress={() => setApp(l.packageName)} />
              ))}
            </Row>
            <Stepper label={t('streaks.maxPerDay')} value={maxMinutes} min={0} max={240} step={15} format={(v) => (v === 0 ? t('streaks.zero') : formatMinutes(v))} onChange={setMaxMinutes} />
            <Text variant="caption" color="textMuted">
              {t('streaks.autoNote')}
            </Text>
          </>
        )}
        <Button label={t('common.save')} full onPress={create} disabled={kind === 'custom' ? !label.trim() : !app} testID="streak-save" />
      </Sheet>

      <Sheet visible={!!restartFor} onClose={() => setRestartFor(null)} title={t('streaks.restartTitle')}>
        <IconCircle name="refresh" tone="success" size={56} />
        <Text variant="body">{t('streaks.restartBody', { best: restartFor?.best ?? 0, total: restartFor ? totalKeptDays(restartFor) : 0 })}</Text>
        <Text variant="small" color="textMuted">
          {t('streaks.restartTip')}
        </Text>
        <Button label={t('streaks.freshStart')} full onPress={() => setRestartFor(null)} />
      </Sheet>
    </Screen>
  );
}

function StreakCard({ streak, onKept, onSlipped, onDelete }: { streak: Streak; onKept: () => void; onSlipped: () => void; onDelete: () => void }) {
  const { t } = useT();
  const { colors } = useTheme();
  const length = currentStreakLength(streak);
  const days = lastNDays(14);
  return (
    <Card>
      <Row>
        <IconCircle name="flame" tone="accent" />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{streak.target.label}</Text>
          <Text variant="small" color="textMuted">
            {streak.target.kind === 'app' ? t('streaks.appRule', { time: streak.target.maxMinutes === 0 ? t('streaks.zero') : formatMinutes(streak.target.maxMinutes) }) : t('streaks.customRule')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="title">{length}</Text>
          <Text variant="caption" color="textMuted">
            {t('streaks.daysWord', { count: length })}
          </Text>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }} accessible accessibilityLabel={t('streaks.historyLabel', { kept: totalKeptDays(streak) })}>
        {days.map((d) => {
          const v = streak.log[d];
          return (
            <View key={d} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ width: '100%', height: 18, borderRadius: 5, backgroundColor: v === true ? colors.success : v === false ? colors.warningSoft : colors.surfaceAlt }} />
              <Text variant="caption" color="textMuted" style={{ fontSize: 10 }}>
                {formatWeekdayShort(d)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
        {t('streaks.bestAndRestarts', { best: Math.max(streak.best, length), total: totalKeptDays(streak) })}
      </Text>
      <Row style={{ marginTop: 12 }} wrap>
        {streak.target.kind === 'custom' && !isLoggedToday(streak) ? (
          <>
            <Button label={t('streaks.keptIt')} icon="checkmark" small onPress={onKept} />
            <Button label={t('streaks.slipped')} small variant="secondary" onPress={onSlipped} />
          </>
        ) : streak.target.kind === 'custom' ? (
          <Text variant="smallStrong" color={streak.log[lastNDays(1)[0]] ? 'success' : 'textMuted'}>
            {streak.log[lastNDays(1)[0]] ? t('streaks.loggedKept') : t('streaks.loggedSlip')}
          </Text>
        ) : (
          <Text variant="caption" color="textMuted">
            {t('streaks.autoNote')}
          </Text>
        )}
        <Button label={t('common.delete')} variant="ghost" small onPress={onDelete} />
      </Row>
    </Card>
  );
}
