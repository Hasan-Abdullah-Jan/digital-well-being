import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Chip, Row, Section, ToggleRow } from '@/components/Layout';
import { DayPicker, TextField, TimeField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { guard } from '@/native/guard';
import { syncGuard } from '@/services/guardSync';
import { syncReminders } from '@/services/notifications';
import { useApp } from '@/store/app';
import { useHabits } from '@/store/habits';
import type { PhoneFreeWindow, WindowKind } from '@/store/types';
import { confirm } from '@/utils/confirm';
import { formatClock } from '@/utils/time';

type Draft = Omit<PhoneFreeWindow, 'id'> & { id?: string };

const TEMPLATES: Record<WindowKind, Pick<Draft, 'days' | 'start' | 'end'>> = {
  study: { days: [1, 2, 3, 4, 5], start: '16:30', end: '18:00' },
  sleep: { days: [0, 1, 2, 3, 4, 5, 6], start: '22:30', end: '07:00' },
  meals: { days: [0, 1, 2, 3, 4, 5, 6], start: '19:00', end: '19:45' },
  prayer: { days: [0, 1, 2, 3, 4, 5, 6], start: '06:00', end: '06:30' },
  personal: { days: [6, 0], start: '10:00', end: '12:00' },
  family: { days: [0], start: '13:00', end: '15:00' },
  custom: { days: [1, 2, 3, 4, 5], start: '09:00', end: '10:00' },
};

export default function Schedules() {
  const { t } = useT();
  const content = useContent();
  const windows = useHabits((s) => s.windows);
  const upsert = useHabits((s) => s.upsertWindow);
  const remove = useHabits((s) => s.removeWindow);
  const demo = useApp((s) => s.demoMode);
  const [draft, setDraft] = useState<Draft | null>(null);
  const canLock = guard.isAvailable() || demo;

  const after = () => {
    syncGuard();
    void syncReminders();
  };

  const startNew = (kind: WindowKind) => {
    const label = content.windowKinds.find((k) => k.id === kind)?.label ?? '';
    setDraft({ kind, label, ...TEMPLATES[kind], enabled: true, lockApps: canLock });
  };

  const save = () => {
    if (!draft || draft.days.length === 0) return;
    upsert({ ...draft, label: draft.label.trim() || content.windowKinds.find((k) => k.id === draft.kind)?.label || '' });
    setDraft(null);
    after();
  };

  return (
    <Screen title={t('tools.windows')} subtitle={t('windows.subtitle')} testID="screen-windows">
      <Section title={t('windows.yours')}>
        {windows.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('windows.emptyTitle')} body={t('windows.emptyBody')} />
        ) : (
          windows.map((w) => (
            <Card key={w.id} onPress={() => setDraft({ ...w })} accessibilityHint={t('common.edit')}>
              <Row>
                <IconCircle name={content.windowKinds.find((k) => k.id === w.kind)?.icon ?? 'time-outline'} tone={w.enabled ? 'primary' : 'neutral'} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{w.label}</Text>
                  <Text variant="small" color="textMuted">
                    {formatClock(w.start)} – {formatClock(w.end)} · {w.days.length === 7 ? t('windows.everyDay') : w.days.map((d) => t(`days.short.${d}`)).join(' ')}
                  </Text>
                </View>
                <Text variant="caption" color={w.enabled ? 'success' : 'textMuted'}>
                  {w.enabled ? t('common.on') : t('common.off')}
                </Text>
              </Row>
            </Card>
          ))
        )}
      </Section>

      <Section title={t('windows.add')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {content.windowKinds.map((k) => (
            <Chip key={k.id} label={k.label} icon={k.icon} onPress={() => startNew(k.id as WindowKind)} testID={`window-kind-${k.id}`} />
          ))}
        </View>
        <Text variant="caption" color="textMuted">
          {canLock ? t('windows.howAndroid') : t('windows.howOther')}
        </Text>
      </Section>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.id ? t('windows.edit') : t('windows.new')}>
        {draft ? (
          <>
            <TextField label={t('windows.name')} value={draft.label} onChangeText={(label) => setDraft({ ...draft, label })} maxLength={40} />
            <Text variant="smallStrong">{t('windows.days')}</Text>
            <DayPicker value={draft.days} onChange={(days) => setDraft({ ...draft, days })} />
            <Row>
              <TimeField label={t('windows.from')} value={draft.start} onChange={(start) => setDraft({ ...draft, start })} />
              <TimeField label={t('windows.to')} value={draft.end} onChange={(end) => setDraft({ ...draft, end })} />
            </Row>
            {canLock ? (
              <ToggleRow title={t('windows.lockApps')} subtitle={t('windows.lockAppsSub')} value={draft.lockApps} onChange={(lockApps) => setDraft({ ...draft, lockApps })} />
            ) : null}
            <ToggleRow title={t('windows.enabled')} value={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} />
            {draft.days.length === 0 ? (
              <Text variant="caption" color="danger">
                {t('windows.pickDay')}
              </Text>
            ) : null}
            <Button label={t('common.save')} full onPress={save} disabled={draft.days.length === 0} testID="save-window" />
            {draft.id ? (
              <Button
                label={t('common.delete')}
                variant="danger"
                full
                onPress={async () => {
                  const ok = await confirm({ title: t('windows.deleteTitle'), message: t('windows.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
                  if (ok && draft.id) {
                    remove(draft.id);
                    setDraft(null);
                    after();
                  }
                }}
              />
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
