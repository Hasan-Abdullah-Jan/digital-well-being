import { Pressable, StyleSheet, View } from 'react-native';

import { timeAgo } from '@/features/format';
import { useContent, useT } from '@/i18n';
import type { PeerPost, ReactionType } from '@/services/community/types';
import { useTheme } from '@/theme';

import { tapFeedback } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Pill, Row } from './Layout';
import { Text } from './Text';

const REACTIONS: { type: ReactionType; icon: string }[] = [
  { type: 'hear', icon: 'ear-outline' },
  { type: 'strength', icon: 'fitness-outline' },
  { type: 'metoo', icon: 'people-outline' },
];

export function PostCard({
  post,
  myReaction,
  onReact,
  onOpen,
  onReport,
  showStatus,
}: {
  post: PeerPost;
  myReaction?: ReactionType;
  onReact?: (type: ReactionType) => void;
  onOpen?: () => void;
  onReport?: () => void;
  showStatus?: boolean;
}) {
  const { t } = useT();
  const content = useContent();
  const { colors, radius } = useTheme();
  const topic = content.peerTopics.find((p) => p.id === post.topic)?.label ?? post.topic;
  return (
    <Card onPress={onOpen} accessibilityLabel={`${post.alias}, ${topic}. ${post.text}`}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }} wrap>
        <Pill label={topic} tone="primary" />
        <Text variant="caption" color="textMuted">
          {post.alias} · {timeAgo(post.createdAt)}
        </Text>
      </Row>
      {showStatus ? (
        <View style={{ marginBottom: 8 }}>
          <Pill
            label={t(`peer.status.${post.status}`)}
            tone={post.status === 'published' ? 'success' : post.status === 'pending' ? 'warning' : 'neutral'}
            icon={post.status === 'pending' ? 'time-outline' : post.status === 'published' ? 'checkmark' : 'eye-off-outline'}
          />
        </View>
      ) : null}
      <Text variant="body">{post.text}</Text>
      <Row style={{ marginTop: 12, justifyContent: 'space-between' }} wrap>
        <Row gap={8} wrap>
          {REACTIONS.map((r) => {
            const mine = myReaction === r.type;
            const disabled = !onReact || !!myReaction;
            return (
              <Pressable
                key={r.type}
                disabled={disabled}
                onPress={() => {
                  tapFeedback();
                  onReact?.(r.type);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t(`peer.reactions.${r.type}`)}: ${post.reactions[r.type]}`}
                accessibilityState={{ disabled, selected: mine }}
                style={[
                  styles.reaction,
                  {
                    borderRadius: radius.pill,
                    backgroundColor: mine ? colors.primary : colors.surfaceAlt,
                    opacity: disabled && !mine ? 0.75 : 1,
                  },
                ]}
              >
                <Icon name={r.icon} size={16} color={mine ? colors.onPrimary : colors.text} />
                <Text variant="caption" style={{ color: mine ? colors.onPrimary : colors.text }}>
                  {t(`peer.reactions.${r.type}`)} {post.reactions[r.type] > 0 ? post.reactions[r.type] : ''}
                </Text>
              </Pressable>
            );
          })}
        </Row>
        <Row gap={6}>
          {post.replyCount > 0 ? (
            <Text variant="caption" color="textMuted">
              {t('peer.replies', { count: post.replyCount })}
            </Text>
          ) : null}
          {onReport ? (
            <Pressable onPress={onReport} accessibilityRole="button" accessibilityLabel={t('peer.report')} hitSlop={10} style={styles.more}>
              <Icon name="flag-outline" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </Row>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, minHeight: 34 },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
