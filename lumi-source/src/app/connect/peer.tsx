import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CommunityGate } from '@/components/CommunityGate';
import { Segmented } from '@/components/Inputs';
import { Row } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { ReportSheet } from '@/components/ReportSheet';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { getCommunity, useCommunityMode, type PeerPost, type ReactionType } from '@/services/community';
import { useApp } from '@/store/app';
import { useCommunityLocal } from '@/store/community';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';

export default function Peer() {
  const { t } = useT();
  const { colors } = useTheme();
  const mode = useCommunityMode();
  const consent = useSettings((s) => s.communityConsent);
  const reactions = useCommunityLocal((s) => s.reactions);
  const reported = useCommunityLocal((s) => s.reported);
  const local = useCommunityLocal();
  const toast = useApp((s) => s.showToast);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [posts, setPosts] = useState<PeerPost[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const ready = mode === 'demo' || (mode === 'cloud' && consent?.granted);

  const load = useCallback(async () => {
    const service = getCommunity();
    if (!service || !ready) return;
    setError(false);
    try {
      const list = tab === 'all' ? await service.listPosts() : await service.listMyPosts();
      setPosts(list.filter((p) => tab === 'mine' || !useCommunityLocal.getState().reported[p.id]));
    } catch {
      setError(true);
    }
  }, [tab, ready]);

  useFocusEffect(
    useCallback(() => {
      setPosts(null);
      void load();
    }, [load]),
  );

  const react = async (post: PeerPost, type: ReactionType) => {
    const service = getCommunity();
    if (!service) return;
    local.setReaction(post.id, type);
    setPosts((list) => list?.map((p) => (p.id === post.id ? { ...p, reactions: { ...p.reactions, [type]: p.reactions[type] + 1 } } : p)) ?? null);
    try {
      await service.react(post.id, type);
    } catch {
      toast(t('peer.reactFailed'));
    }
  };

  const report = async (reason: string) => {
    const id = reporting;
    setReporting(null);
    const service = getCommunity();
    if (!id || !service) return;
    try {
      await service.report(id, reason);
      local.setReported(id);
      setPosts((list) => list?.filter((p) => p.id !== id) ?? null);
      toast(t('peer.reported'));
    } catch {
      toast(t('peer.reportFailed'));
    }
  };

  return (
    <Screen
      title={t('tools.peer')}
      testID="screen-peer"
      refreshControl={
        ready ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        ) : undefined
      }
      footer={ready ? <Button label={t('peer.share')} icon="create-outline" full onPress={() => router.push('/connect/peer-post')} testID="peer-new" /> : undefined}
    >
      <CommunityGate feature="peer">
        <Card tone="alt" style={{ marginBottom: 16 }}>
          <Text variant="small">{t('peer.intro')}</Text>
          <Button label={t('peer.guidelines')} variant="ghost" small style={{ alignSelf: 'flex-start', marginTop: 4 }} onPress={() => router.push('/connect/guide/report-block')} />
        </Card>
        <Segmented
          label={t('peer.view')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: t('peer.everyone') },
            { value: 'mine', label: t('peer.mine') },
          ]}
        />
        <View style={{ gap: 12, marginTop: 16 }}>
          {error ? (
            <ErrorState body={t('peer.loadError')} onRetry={load} />
          ) : posts === null ? (
            <LoadingState />
          ) : posts.length === 0 ? (
            <EmptyState icon="chatbubbles-outline" title={tab === 'all' ? t('peer.emptyTitle') : t('peer.emptyMineTitle')} body={tab === 'all' ? t('peer.emptyBody') : t('peer.emptyMineBody')} />
          ) : (
            posts.map((post) => (
              <View key={post.id} style={{ gap: 6 }}>
                <PostCard
                  post={post}
                  showStatus={tab === 'mine'}
                  myReaction={reactions[post.id]}
                  onReact={tab === 'all' && post.status === 'published' ? (type) => void react(post, type) : undefined}
                  onOpen={() => router.push({ pathname: '/connect/peer-thread', params: { id: post.id } })}
                  onReport={tab === 'all' && !reported[post.id] ? () => setReporting(post.id) : undefined}
                />
                {tab === 'mine' ? (
                  <Row style={{ justifyContent: 'flex-end' }}>
                    <Button
                      label={t('common.delete')}
                      variant="ghost"
                      small
                      onPress={async () => {
                        const ok = await confirm({ title: t('peer.deleteTitle'), message: t('peer.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
                        if (!ok) return;
                        try {
                          await getCommunity()?.deletePost(post.id);
                          setPosts((list) => list?.filter((p) => p.id !== post.id) ?? null);
                        } catch {
                          toast(t('common.errorBody'));
                        }
                      }}
                    />
                  </Row>
                ) : null}
              </View>
            ))
          )}
        </View>
        <ReportSheet visible={!!reporting} onClose={() => setReporting(null)} onReport={(r) => void report(r)} />
      </CommunityGate>
    </Screen>
  );
}
