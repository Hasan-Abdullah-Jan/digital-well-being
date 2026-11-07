import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CommunityGate } from '@/components/CommunityGate';
import { communityIssues, issueMessage } from '@/components/CommunityComposer';
import { TextField } from '@/components/Inputs';
import { Chip, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { offerSupportIfNeeded } from '@/features/distress';
import { randomAlias } from '@/features/format';
import { useContent, useT } from '@/i18n';
import { getCommunity } from '@/services/community';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';

const MAX = 500;

export default function PeerPost() {
  const { t } = useT();
  const content = useContent();
  const alias = useSettings((s) => s.alias);
  const update = useSettings((s) => s.update);
  const toast = useApp((s) => s.showToast);
  const [topic, setTopic] = useState('other');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const issues = communityIssues(text, MAX);
  const error = touched ? issueMessage(issues) : undefined;

  const submit = async () => {
    setTouched(true);
    if (issues.length > 0) return;
    const service = getCommunity();
    if (!service) return;
    setBusy(true);
    try {
      await service.createPost({ topic, text: text.trim(), alias: alias || randomAlias(content.aliasAdjectives, content.aliasNouns) });
      const supported = offerSupportIfNeeded(text, 'peer');
      if (!supported) toast(t('peer.posted'));
      router.back();
    } catch {
      toast(t('peer.postFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('peer.share')}
      testID="screen-peer-post"
      footer={<Button label={t('peer.send')} icon="send" full loading={busy} disabled={!text.trim()} onPress={submit} testID="peer-send" />}
    >
      <CommunityGate feature="peer">
        <Section title={t('peer.topic')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {content.peerTopics.map((p) => (
              <Chip key={p.id} label={p.label} selected={topic === p.id} onPress={() => setTopic(p.id)} />
            ))}
          </View>
        </Section>
        <TextField
          label={t('peer.yourPost')}
          hint={t('peer.postHint')}
          value={text}
          onChangeText={setText}
          onBlur={() => setTouched(true)}
          multiline
          maxLength={MAX}
          error={error}
          testID="peer-text"
        />
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }} wrap>
          <Text variant="small" color="textMuted">
            {t('peer.postingAs', { alias: alias || '…' })}
          </Text>
          <Button label={t('peer.newAlias')} variant="ghost" small onPress={() => update({ alias: randomAlias(content.aliasAdjectives, content.aliasNouns) })} />
        </Row>
        <Card tone="alt">
          <Text variant="smallStrong">{t('peer.rulesTitle')}</Text>
          <Text variant="small" color="textMuted" style={{ marginTop: 4 }}>
            {t('peer.rules')}
          </Text>
        </Card>
      </CommunityGate>
    </Screen>
  );
}
