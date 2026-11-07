/**
 * Team tools for moderators, helpers and organisers.
 * They only ever see what young people chose to post or send anonymously,
 * never mood, journal or screen-time data (that never leaves the phone).
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DayPicker, Stepper, TextField, TimeField } from '@/components/Inputs';
import { Chip, Pill, Row, Section } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { Text } from '@/components/Text';
import { timeAgo } from '@/features/format';
import { useContent, useT } from '@/i18n';
import { getCommunity, type AnonNote, type NoteMessage, type PeerPost, type PeerReply } from '@/services/community';
import { useApp } from '@/store/app';
import { addDays, hhmmToMinutes, startOfDay } from '@/utils/time';

type Tab = 'posts' | 'replies' | 'reported' | 'notes' | 'events';

export default function Moderation() {
  const { t } = useT();
  const content = useContent();
  const staff = useApp((s) => s.staff);
  const toast = useApp((s) => s.showToast);
  const [tab, setTab] = useState<Tab>(staff?.moderator ? 'posts' : staff?.helper ? 'notes' : 'events');
  const [posts, setPosts] = useState<PeerPost[] | null>(null);
  const [replies, setReplies] = useState<PeerReply[] | null>(null);
  const [notes, setNotes] = useState<AnonNote[] | null>(null);
  const [error, setError] = useState(false);
  const [openNote, setOpenNote] = useState<AnonNote | null>(null);
  const [messages, setMessages] = useState<NoteMessage[] | null>(null);
  const [reply, setReply] = useState('');
  // Event form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('social');
  const [inDays, setInDays] = useState(3);
  const [time, setTime] = useState('16:00');
  const [weekday, setWeekday] = useState<number[]>([]);

  const load = useCallback(async () => {
    const service = getCommunity();
    if (!service) return;
    setError(false);
    try {
      if (tab === 'posts') setPosts(await service.listPendingPosts());
      if (tab === 'reported') setPosts(await service.listReportedPosts());
      if (tab === 'replies') setReplies(await service.listPendingReplies());
      if (tab === 'notes') setNotes(await service.listHelperNotes());
    } catch {
      setError(true);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      setPosts(null);
      setReplies(null);
      setNotes(null);
      void load();
    }, [load]),
  );

  if (!staff || !(staff.moderator || staff.helper || staff.organiser)) {
    return (
      <Screen title={t('connect.teamTools')}>
        <EmptyState icon="lock-closed-outline" title={t('moderation.noAccessTitle')} body={t('moderation.noAccessBody')} />
      </Screen>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    ...(staff.moderator
      ? [
          { value: 'posts' as Tab, label: t('moderation.posts') },
          { value: 'replies' as Tab, label: t('moderation.replies') },
          { value: 'reported' as Tab, label: t('moderation.reported') },
        ]
      : []),
    ...(staff.helper ? [{ value: 'notes' as Tab, label: t('moderation.notes') }] : []),
    ...(staff.organiser || staff.moderator ? [{ value: 'events' as Tab, label: t('moderation.events') }] : []),
  ];

  const act = async (fn: () => Promise<void> | undefined) => {
    try {
      await fn();
      toast(t('moderation.done'));
      await load();
    } catch {
      toast(t('common.errorBody'));
    }
  };

  const openThread = async (note: AnonNote) => {
    setOpenNote(note);
    setMessages(null);
    try {
      setMessages((await getCommunity()?.listNoteMessages(note.id)) ?? []);
    } catch {
      setMessages([]);
    }
  };

  return (
    <Screen title={t('connect.teamTools')} subtitle={t('moderation.subtitle')} testID="screen-moderation">
      <Row wrap accessibilityLabel={t('moderation.view')}>
        {tabs.map((o) => (
          <Chip key={o.value} label={o.label} selected={tab === o.value} onPress={() => setTab(o.value)} />
        ))}
      </Row>
      <View style={{ gap: 12, marginTop: 16 }}>
        {error ? <ErrorState onRetry={load} /> : null}

        {(tab === 'posts' || tab === 'reported') && !error ? (
          posts === null ? (
            <LoadingState />
          ) : posts.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title={t('moderation.clearTitle')} body={t('moderation.clearBody')} />
          ) : (
            posts.map((p) => (
              <View key={p.id} style={{ gap: 8 }}>
                <PostCard post={p} showStatus />
                {tab === 'reported' ? <Text variant="caption" color="textMuted">{t('moderation.reports', { count: p.reportCount })}</Text> : null}
                <Row wrap>
                  {p.status !== 'published' ? <Button label={t('moderation.approve')} icon="checkmark" small onPress={() => act(() => getCommunity()?.moderatePost(p.id, 'published'))} /> : null}
                  <Button label={t('moderation.hide')} icon="eye-off-outline" small variant="secondary" onPress={() => act(() => getCommunity()?.moderatePost(p.id, 'hidden'))} />
                  <Button label={t('common.delete')} small variant="danger" onPress={() => act(() => getCommunity()?.deletePost(p.id))} />
                </Row>
              </View>
            ))
          )
        ) : null}

        {tab === 'replies' && !error ? (
          replies === null ? (
            <LoadingState />
          ) : replies.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title={t('moderation.clearTitle')} body={t('moderation.clearBody')} />
          ) : (
            replies.map((r) => (
              <Card key={r.id}>
                <Text variant="caption" color="textMuted">
                  {r.alias} · {timeAgo(r.createdAt)}
                </Text>
                <Text variant="body" style={{ marginVertical: 8 }}>
                  {r.text}
                </Text>
                <Row wrap>
                  <Button label={t('moderation.approve')} icon="checkmark" small onPress={() => act(() => getCommunity()?.moderateReply(r.id, 'published'))} />
                  <Button label={t('moderation.hide')} icon="eye-off-outline" small variant="secondary" onPress={() => act(() => getCommunity()?.moderateReply(r.id, 'hidden'))} />
                </Row>
              </Card>
            ))
          )
        ) : null}

        {tab === 'notes' && !error ? (
          notes === null ? (
            <LoadingState />
          ) : notes.length === 0 ? (
            <EmptyState icon="mail-outline" title={t('moderation.noNotesTitle')} body={t('moderation.noNotesBody')} />
          ) : (
            notes.map((n) => (
              <Card key={n.id} onPress={() => void openThread(n)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">{content.noteTopics.find((x) => x.id === n.topic)?.label ?? n.topic}</Text>
                  <Pill label={t(`note.status.${n.status}`)} tone={n.status === 'open' ? 'warning' : 'success'} />
                </Row>
                <Text variant="caption" color="textMuted">
                  {t('note.lastActivity', { time: timeAgo(n.lastMessageAt) })}
                </Text>
              </Card>
            ))
          )
        ) : null}

        {tab === 'events' ? (
          <Section title={t('moderation.newEvent')}>
            <TextField label={t('moderation.eventTitle')} value={title} onChangeText={setTitle} maxLength={80} />
            <TextField label={t('moderation.eventDescription')} value={description} onChangeText={setDescription} multiline maxLength={500} />
            <TextField label={t('moderation.eventLocation')} value={location} onChangeText={setLocation} maxLength={120} />
            <Row wrap>
              {content.eventCategories.map((c) => (
                <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
              ))}
            </Row>
            <Stepper label={t('moderation.inDays')} value={inDays} min={0} max={90} onChange={setInDays} format={(v) => t('moderation.daysFromNow', { count: v })} />
            <Row>
              <TimeField label={t('moderation.startTime')} value={time} onChange={setTime} />
            </Row>
            <Text variant="caption" color="textMuted">
              {t('moderation.weekdayHint')}
            </Text>
            <DayPicker value={weekday} onChange={(d) => setWeekday(d.slice(-1))} />
            <Button
              label={t('moderation.publishEvent')}
              icon="megaphone-outline"
              full
              disabled={!title.trim() || !location.trim()}
              onPress={() =>
                act(async () => {
                  let day = addDays(startOfDay(), inDays);
                  if (weekday.length) {
                    day = startOfDay();
                    while (day.getDay() !== weekday[0]) day = addDays(day, 1);
                  }
                  const minutes = hhmmToMinutes(time);
                  day.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
                  await getCommunity()?.createEvent({ title: title.trim(), description: description.trim(), location: location.trim(), category, startsAt: day.getTime() });
                  setTitle('');
                  setDescription('');
                  setLocation('');
                })
              }
            />
          </Section>
        ) : null}
      </View>

      <Sheet visible={!!openNote} onClose={() => setOpenNote(null)} title={t('moderation.noteThread')}>
        <Card tone="alt">
          <Text variant="caption">{t('moderation.helperReminder')}</Text>
        </Card>
        {messages === null ? (
          <LoadingState />
        ) : (
          messages.map((m) => (
            <Card key={m.id} tone={m.from === 'helper' ? 'primary' : 'default'}>
              <Text variant="caption" color={m.from === 'helper' ? 'onPrimarySoft' : 'textMuted'}>
                {m.from === 'helper' ? t('note.helper') : t('moderation.young')} · {timeAgo(m.createdAt)}
              </Text>
              <Text variant="body" color={m.from === 'helper' ? 'onPrimarySoft' : 'text'}>
                {m.text}
              </Text>
            </Card>
          ))
        )}
        <TextField label={t('note.reply')} value={reply} onChangeText={setReply} multiline maxLength={1000} />
        <Button
          label={t('note.sendReply')}
          icon="send"
          full
          disabled={!reply.trim()}
          onPress={async () => {
            if (!openNote) return;
            try {
              await getCommunity()?.helperReply(openNote.id, reply.trim());
              setReply('');
              await openThread(openNote);
              await load();
            } catch {
              toast(t('common.errorBody'));
            }
          }}
        />
      </Sheet>
    </Screen>
  );
}
