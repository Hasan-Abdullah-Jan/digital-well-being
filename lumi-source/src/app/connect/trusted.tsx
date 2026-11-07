import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Inputs';
import { ListRow, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { callTrustedPerson, messageTrustedPerson } from '@/features/help';
import { useT } from '@/i18n';
import { useCommunityMode } from '@/services/community';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { confirm } from '@/utils/confirm';

export default function Trusted() {
  const { t } = useT();
  const contact = useSettings((s) => s.trustedContact);
  const update = useSettings((s) => s.update);
  const toast = useApp((s) => s.showToast);
  const mode = useCommunityMode();
  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [message, setMessage] = useState(contact?.message || t('trusted.defaultMessage'));

  const save = () => {
    update({ trustedContact: { name: name.trim(), phone: phone.trim(), message: message.trim() } });
    toast(t('trusted.saved'));
  };

  return (
    <Screen title={t('connect.trusted')} subtitle={t('trusted.subtitle')} testID="screen-trusted">
      <Card tone="alt" style={{ marginBottom: 16 }}>
        <Text variant="small">{t('trusted.who')}</Text>
      </Card>
      <Section title={t('trusted.details')}>
        <TextField label={t('trusted.name')} value={name} onChangeText={setName} maxLength={40} autoCapitalize="words" />
        <TextField label={t('trusted.phone')} hint={t('trusted.phoneHint')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={24} />
        <TextField label={t('trusted.message')} hint={t('trusted.messageHint')} value={message} onChangeText={setMessage} multiline maxLength={300} />
        <Button label={t('common.save')} full onPress={save} disabled={!name.trim() && !phone.trim()} testID="trusted-save" />
      </Section>
      {contact?.phone ? (
        <Section title={t('trusted.reachOut')}>
          <Row>
            <Button label={t('help.textTrusted')} icon="chatbubble-ellipses" style={{ flex: 1 }} onPress={() => void messageTrustedPerson()} />
            <Button label={t('help.callTrusted')} icon="call-outline" variant="secondary" style={{ flex: 1 }} onPress={() => void callTrustedPerson()} />
          </Row>
          <Button
            label={t('trusted.remove')}
            variant="ghost"
            full
            onPress={async () => {
              const ok = await confirm({ title: t('trusted.removeTitle'), message: t('trusted.removeBody'), confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), destructive: true });
              if (ok) {
                update({ trustedContact: null });
                setName('');
                setPhone('');
              }
            }}
          />
        </Section>
      ) : null}
      {mode !== 'unavailable' ? (
        <Section title={t('trusted.anonTitle')}>
          <ListRow icon="mail-unread-outline" title={t('connect.anonNote')} subtitle={t('trusted.anonSub')} onPress={() => router.push('/connect/note')} />
        </Section>
      ) : null}
      <Text variant="caption" color="textMuted">
        {t('trusted.privacy')}
      </Text>
    </Screen>
  );
}
