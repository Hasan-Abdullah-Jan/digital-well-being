import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Row, Section, ToggleRow } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { appConfig } from '@/config';
import { useT } from '@/i18n';
import { getCommunity, useCommunityMode } from '@/services/community';
import { deleteCloudData, deleteEverything, exportData } from '@/services/privacy';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';

export default function Privacy() {
  const { t } = useT();
  const { colors } = useTheme();
  const mode = useCommunityMode();
  const consent = useSettings((s) => s.communityConsent);
  const update = useSettings((s) => s.update);
  const toast = useApp((s) => s.showToast);
  const [busy, setBusy] = useState<string | null>(null);
  const uid = mode === 'cloud' && consent?.granted ? getCommunity()?.currentUserId() : null;

  const rows: { what: string; where: string; icon: string }[] = [
    { what: t('privacy.rowWellbeing'), where: t('privacy.onDevice'), icon: 'phone-portrait-outline' },
    { what: t('privacy.rowHabits'), where: t('privacy.onDevice'), icon: 'phone-portrait-outline' },
    { what: t('privacy.rowEvidence'), where: t('privacy.onDevice'), icon: 'phone-portrait-outline' },
    { what: t('privacy.rowCommunity'), where: t('privacy.cloudAnon'), icon: 'cloud-outline' },
    { what: t('privacy.rowEvents'), where: t('privacy.cloudPublic'), icon: 'cloud-outline' },
  ];

  const withdraw = async () => {
    const ok = await confirm({ title: t('privacy.withdrawTitle'), message: t('privacy.withdrawBody'), confirmLabel: t('privacy.withdrawConfirm'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    setBusy('withdraw');
    try {
      await deleteCloudData();
      toast(t('privacy.withdrawn'));
    } catch {
      toast(t('privacy.cloudDeleteFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title={t('settings.privacy')} subtitle={t('privacy.subtitle')} testID="screen-privacy">
      <Section title={t('privacy.promisesTitle')}>
        {[t('privacy.promise1'), t('privacy.promise2'), t('privacy.promise3'), t('privacy.promise4'), t('privacy.promise5')].map((p) => (
          <Row key={p} style={{ alignItems: 'flex-start' }}>
            <Icon name="checkmark-circle" color={colors.success} />
            <Text variant="body" style={{ flex: 1 }}>
              {p}
            </Text>
          </Row>
        ))}
      </Section>

      <Section title={t('privacy.whereTitle')}>
        {rows.map((r) => (
          <Card key={r.what}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Icon name={r.icon} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{r.what}</Text>
                <Text variant="small" color="textMuted">
                  {r.where}
                </Text>
              </View>
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={t('privacy.consentTitle')}>
        {mode === 'cloud' ? (
          <ToggleRow
            icon="people-outline"
            title={t('privacy.communityConsent')}
            subtitle={consent?.granted ? t('privacy.consentGiven') : t('privacy.consentNotGiven')}
            value={!!consent?.granted}
            onChange={(v) => {
              if (v) update({ communityConsent: { granted: true, at: Date.now() } });
              else void withdraw();
            }}
          />
        ) : (
          <Text variant="small" color="textMuted">
            {mode === 'demo' ? t('privacy.demoNoCloud') : t('privacy.noCloud')}
          </Text>
        )}
        {uid ? (
          <Card tone="alt">
            <Text variant="caption" color="textMuted">
              {t('privacy.anonId')}
            </Text>
            <Text variant="small" selectable>
              {uid}
            </Text>
            <Button
              label={t('privacy.copyId')}
              variant="ghost"
              small
              onPress={async () => {
                await Clipboard.setStringAsync(uid);
                toast(t('privacy.copied'));
              }}
            />
          </Card>
        ) : null}
      </Section>

      <Section title={t('privacy.dataTitle')}>
        <Button
          label={t('privacy.export')}
          icon="download-outline"
          variant="secondary"
          full
          loading={busy === 'export'}
          testID="export-data"
          onPress={async () => {
            setBusy('export');
            try {
              const result = await exportData();
              if (result === 'unavailable') toast(t('privacy.exportUnavailable'));
            } catch {
              toast(t('common.errorBody'));
            } finally {
              setBusy(null);
            }
          }}
        />
        {mode === 'cloud' && consent?.granted ? (
          <Button label={t('privacy.deleteCloud')} icon="cloud-offline-outline" variant="secondary" full loading={busy === 'withdraw'} onPress={withdraw} />
        ) : null}
        <Button
          label={t('privacy.deleteAll')}
          icon="trash-outline"
          variant="danger"
          full
          loading={busy === 'all'}
          testID="delete-all"
          onPress={async () => {
            const ok = await confirm({ title: t('privacy.deleteAllTitle'), message: t('privacy.deleteAllBody'), confirmLabel: t('privacy.deleteAllConfirm'), cancelLabel: t('common.cancel'), destructive: true });
            if (!ok) return;
            setBusy('all');
            try {
              const { cloudError } = await deleteEverything();
              toast(cloudError ? t('privacy.deletedLocalOnly') : t('privacy.deletedAll'));
              router.replace('/');
            } finally {
              setBusy(null);
            }
          }}
        />
        <Text variant="caption" color="textMuted">
          {t('privacy.deleteNote')}
        </Text>
        {appConfig.organisation.privacyEmail ? (
          <Text variant="caption" color="textMuted">
            {t('privacy.contact', { email: appConfig.organisation.privacyEmail })}
          </Text>
        ) : null}
      </Section>
    </Screen>
  );
}
