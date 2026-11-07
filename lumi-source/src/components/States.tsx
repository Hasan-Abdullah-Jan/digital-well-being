/** Empty, loading and error states with warm, human copy. */
import { ActivityIndicator, View } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { IconCircle, type IconName } from './Icon';
import { Text } from './Text';

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IconName | string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 10 }}>
      <IconCircle name={icon} tone="primary" size={64} />
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="body" color="textMuted" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: 6 }} /> : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="small" color="textMuted">
        {label ?? t('common.loading')}
      </Text>
    </View>
  );
}

export function ErrorState({ title, body, onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }} accessibilityLiveRegion="polite">
      <IconCircle name="cloud-offline-outline" tone="warning" size={64} />
      <Text variant="heading" align="center">
        {title ?? t('common.errorTitle')}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {body ?? t('common.errorBody')}
      </Text>
      {onRetry ? <Button label={t('common.retry')} variant="secondary" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}
