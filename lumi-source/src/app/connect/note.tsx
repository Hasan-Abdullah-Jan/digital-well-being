import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CommunityGate } from '@/components/CommunityGate';
import { TextField } from '@/components/Inputs';
import { Chip, Pill, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { Text } from '@/components/Text';
import { offerSupportIfNeeded } from '@/features/distress';
import { timeAgo } from '@/features/format';
import { useContent, useT } from '@/i18n';
import { getCommunity, useCommunityMode, type AnonNote, type NoteMessage } from '@/services/community';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { confirm } from '@/utils/confirm';

const MAX = 1000;

export default function AnonymousNote() {
  const { t } = useT();
  const content = useContent();
  const mode = useCommunityMode();
  const consent = useSettings((s) => s.communityConsent);
  const toast = useApp((s) => s.showToast);
  const [notes, setNotes] = useState<AnonNote[] | null>(null);
  const [error, setError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [topic, setTopic] = useState('other');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<AnonNote | null>(null);
  const [messages, setMessages] = useState<NoteMessage[] | null>(null);
  const [reply, setReply] = useState('');
  const ready = mode === 'demo' || (mode === 'cloud' && consent?.granted);

  const load = useCallback(async () => {
    const service = getCommunity();
    if (!service || !ready) return;
    setError(false);
    try {
      setNotes(await service.listMyNotes());
    } catch {
      setError(true);
    }
  }, [ready]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openNote = async (note: AnonNote) => {
    setOpen(note);
    setMessages(null);
    try {
      setMessages((await getCommunity()?.listNoteMessages(note.id)) ?? []);
    } catch {
      setMessages([]);
      toast(t('common.errorBody'));
    }
  };

  const send = async () => {
    const service = getCommunity();
    if (!service || !text.trim()) return;
    setBusy(true);
    try {
      await service.createNote({ topic, text: text.trim() });
      offerSupportIfNeeded(text, 'note');
      setText('');
      setComposing(false);
      toast(t('note.sent'));
      await load();
    } catch {
      toast(t('peer.postFailed'));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!open || !reply.trim()) return;
    try {
      await getCommunity()?.sendNoteMessage(open.id, reply.trim());
      offerSupportIfNeeded(reply, 'note');
      setReply('');
      await openNote(open);
      await load();
    } catch {
      toast(t('peer.postFailed'));
    }
  };

  return (
    <Screen
      title={t('connect.anonNote')}
      testID="screen-note"
      footer={ready && !composing ? <Button label={t('note.new')} icon="create-outline" full onPress={() => setComposing(true)} testID="note-new" /> : undefined}
    >
      <Card tone="accent" style={{ marginBottom: 16 }}>
        <Text variant="bodyStrong" color="onAccentSoft">
          {t('note.howTitle')}
        </Text>
        <Text variant="small" color="onAccentSoft" style={{ marginTop: 6 }}>
          {t('note.howBody')}
        </Text>
        <Button label={t('note.urgent')} icon="heart" variant="accent" small style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push('/help')} />
      </Card>

      <CommunityGate feature="note">
        {composing ? (
          <Section title={t('note.new')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {content.noteTopics.map((n) => (
                <Chip key={n.id} label={n.label} selected={topic === n.id} onPress={() => setTopic(n.id)} />
              ))}
            </View>
            <TextField label={t('note.yourNote')} hint={t('note.hint')} value={text} onChangeText={setText} multiline maxLength={MAX} testID="note-text" />
            <Button label={t('note.send')} icon="send" full loading={busy} disabled={!text.trim()} onPress={send} testID="note-send" />
            <Button label={t('common.cancel')} variant="ghost" full onPress={() => setComposing(false)} />
          </Section>
        ) : null}

        <Section title={t('note.yours')}>
          {error ? (
            <ErrorState onRetry={load} />
          ) : notes === null ? (
            <LoadingState />
          ) : notes.length === 0 ? (
            <EmptyState icon="mail-outline" title={t('note.emptyTitle')} body={t('note.emptyBody')} />
          ) : (
            notes.map((n) => (
              <Card key={n.id} onPress={() => void openNote(n)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">{content.noteTopics.find((x) => x.id === n.topic)?.label ?? n.topic}</Text>
                  <Pill label={t(`note.status.${n.status}`)} tone={n.status === 'answered' ? 'success' : n.status === 'open' ? 'warning' : 'neutral'} />
                </Row>
                <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                  {t('note.lastActivity', { time: timeAgo(n.lastMessageAt) })}
                </Text>
              </Card>
            ))
          )}
        </Section>
      </CommunityGate>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open ? (content.noteTopics.find((x) => x.id === open.topic)?.label ?? '') : ''}>
        {messages === null ? (
          <LoadingState />
        ) : (
          messages.map((m) => (
            <Card key={m.id} tone={m.from === 'helper' ? 'primary' : 'alt'} style={{ alignSelf: m.from === 'helper' ? 'flex-start' : 'flex-end', maxWidth: '92%' }}>
              <Text variant="caption" color={m.from === 'helper' ? 'onPrimarySoft' : 'textMuted'}>
                {m.from === 'helper' ? t('note.helper') : t('note.you')} · {timeAgo(m.createdAt)}
              </Text>
              <Text variant="body" color={m.from === 'helper' ? 'onPrimarySoft' : 'text'}>
                {m.text}
              </Text>
            </Card>
          ))
        )}
        {open && open.status !== 'closed' ? (
          <>
            <TextField label={t('note.reply')} value={reply} onChangeText={setReply} multiline maxLength={MAX} />
            <Button label={t('note.sendReply')} icon="send" full disabled={!reply.trim()} onPress={sendReply} />
            <Button
              label={t('note.close')}
              variant="ghost"
              full
              onPress={async () => {
                const ok = await confirm({ title: t('note.closeTitle'), message: t('note.closeBody'), confirmLabel: t('note.close'), cancelLabel: t('common.cancel') });
                if (!ok || !open) return;
                await getCommunity()?.closeNote(open.id).catch(() => undefined);
                setOpen(null);
                await load();
              }}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
