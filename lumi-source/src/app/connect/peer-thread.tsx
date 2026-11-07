import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CommunityGate } from '@/components/CommunityGate';
import { communityIssues, issueMessage } from '@/components/CommunityComposer';
import { TextField } from '@/components/Inputs';
import { Pill, Row, Section } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { ReportSheet } from '@/components/ReportSheet';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { Text } from '@/components/Text';
import { offerSupportIfNeeded } from '@/features/distress';
import { randomAlias, timeAgo } from '@/features/format';
import { useContent, useT } from '@/i18n';
import { getCommunity, type PeerPost, type PeerReply, type ReactionType } from '@/services/community';
import { useApp } from '@/store/app';
import { useCommunityLocal } from '@/store/community';
import { useSettings } from '@/store/settings';

const MAX = 300;

export default function PeerThread() {
  const { t } = useT();
  const content = useContent();
  const { id } = useLocalSearchParams<{ id: string }>();
  const alias = useSettings((s) => s.alias);
  const reactions = useCommunityLocal((s) => s.reactions);
  const local = useCommunityLocal();
  const toast = useApp((s) => s.showToast);
  const [post, setPost] = useState<PeerPost | null | undefined>(undefined);
  const [replies, setReplies] = useState<PeerReply[] | null>(null);
  const [error, setError] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const myId = getCommunity()?.currentUserId();

  const load = useCallback(async () => {
    const service = getCommunity();
    if (!service || !id) return;
    setError(false);
    try {
      const [p, r] = await Promise.all([service.getPost(id), service.listReplies(id)]);
      setPost(p);
      setReplies(r);
    } catch {
      setError(true);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const issues = communityIssues(text, MAX);
  const send = async () => {
    const service = getCommunity();
    if (!service || !id || issues.length) return;
    setBusy(true);
    try {
      const reply = await service.createReply(id, { text: text.trim(), alias: alias || randomAlias(content.aliasAdjectives, content.aliasNouns) });
      setReplies((list) => [...(list ?? []), reply]);
      if (!offerSupportIfNeeded(text, 'peer-reply')) toast(t('peer.replySent'));
      setText('');
    } catch {
      toast(t('peer.postFailed'));
    } finally {
      setBusy(false);
    }
  };

  const react = async (type: ReactionType) => {
    if (!post) return;
    local.setReaction(post.id, type);
    setPost({ ...post, reactions: { ...post.reactions, [type]: post.reactions[type] + 1 } });
    try {
      await getCommunity()?.react(post.id, type);
    } catch {
      toast(t('peer.reactFailed'));
    }
  };

  return (
    <Screen title={t('peer.thread')} testID="screen-peer-thread">
      <CommunityGate feature="peer">
        {error ? (
          <ErrorState onRetry={load} />
        ) : post === undefined ? (
          <LoadingState />
        ) : post === null ? (
          <EmptyState icon="chatbubbles-outline" title={t('peer.goneTitle')} body={t('peer.goneBody')} />
        ) : (
          <>
            <PostCard
              post={post}
              myReaction={reactions[post.id]}
              onReact={post.status === 'published' && post.authorId !== myId ? (type) => void react(type) : undefined}
              onReport={post.authorId !== myId ? () => setReporting(true) : undefined}
              showStatus={post.authorId === myId}
            />
            <Section title={t('peer.repliesTitle')} style={{ marginTop: 20 }}>
              {replies === null ? (
                <LoadingState />
              ) : replies.length === 0 ? (
                <Text variant="small" color="textMuted">
                  {t('peer.noReplies')}
                </Text>
              ) : (
                replies.map((r) => (
                  <Card key={r.id} tone={r.fromStaff ? 'primary' : 'default'}>
                    <Row style={{ justifyContent: 'space-between', marginBottom: 6 }} wrap>
                      <Row gap={6}>
                        <Text variant="smallStrong" color={r.fromStaff ? 'onPrimarySoft' : 'text'}>
                          {r.alias}
                        </Text>
                        {r.fromStaff ? <Pill label={t('peer.team')} tone="primary" icon="shield-checkmark-outline" /> : null}
                        {r.status === 'pending' ? <Pill label={t('peer.status.pending')} tone="warning" /> : null}
                      </Row>
                      <Text variant="caption" color="textMuted">
                        {timeAgo(r.createdAt)}
                      </Text>
                    </Row>
                    <Text variant="body" color={r.fromStaff ? 'onPrimarySoft' : 'text'}>
                      {r.text}
                    </Text>
                  </Card>
                ))
              )}
            </Section>
            {post.status === 'published' ? (
              <View style={{ gap: 10 }}>
                <TextField
                  label={t('peer.replyLabel')}
                  hint={t('peer.replyHint')}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={MAX}
                  error={text.trim() ? issueMessage(issues) : undefined}
                />
                <Button label={t('peer.sendReply')} icon="send" full loading={busy} disabled={!text.trim() || issues.length > 0} onPress={send} />
              </View>
            ) : null}
          </>
        )}
        <ReportSheet
          visible={reporting}
          onClose={() => setReporting(false)}
          onReport={async (reason) => {
            setReporting(false);
            if (!post) return;
            try {
              await getCommunity()?.report(post.id, reason);
              local.setReported(post.id);
              toast(t('peer.reported'));
            } catch {
              toast(t('peer.reportFailed'));
            }
          }}
        />
      </CommunityGate>
    </Screen>
  );
}
