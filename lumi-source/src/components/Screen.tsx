import { router } from 'expo-router';
import { useState, type ReactElement, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { TOUCH, useTheme } from '@/theme';

import { HelpButton } from './HelpButton';
import { Icon } from './Icon';
import { Backdrop, Glass } from './Surfaces';
import { Text } from './Text';

const MAX_WIDTH = 680;

type ScreenProps = {
  title?: string;
  subtitle?: string;
  /** Large title for tab home screens. */
  large?: boolean;
  back?: boolean;
  help?: boolean;
  scroll?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  contentStyle?: ViewStyle;
  refreshControl?: ReactElement<RefreshControlProps>;
  testID?: string;
};

export function Screen({
  title,
  subtitle,
  large,
  back = !large,
  help = true,
  scroll = true,
  children,
  footer,
  headerRight,
  contentStyle,
  refreshControl,
  testID,
}: ScreenProps) {
  const { colors, spacing, neu, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(insets.top + 60);
  const { t } = useT();
  const demo = useApp((s) => s.demoMode);

  const header = (
    <Glass
      intensity={50}
      style={[styles.headerWrap, { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]}
    >
    <View
      onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      style={[styles.header, { paddingTop: insets.top + 6, paddingHorizontal: spacing.lg }]}
    >
      <View style={styles.headerSide}>
        {back ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={10}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface, boxShadow: pressed ? neu.insetSm : neu.raisedSm }]}
          >
            <Icon name="chevron-back" size={22} />
          </Pressable>
        ) : null}
        {!large && title ? (
          <Text variant="heading" numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>
        {headerRight}
        {help ? <HelpButton /> : null}
      </View>
    </View>
    </Glass>
  );

  const body = (
    <View style={[styles.inner, { paddingHorizontal: spacing.lg }, contentStyle]}>
      {demo ? (
        <View style={[styles.demoBanner, { backgroundColor: colors.warningSoft, marginTop: 6 }]} accessibilityRole="text">
          <Icon name="flask-outline" size={14} color={colors.onWarningSoft} />
          <Text variant="caption" color="onWarningSoft">
            {t('demo.banner')}
          </Text>
        </View>
      ) : null}
      {large && title ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Text variant="display">{title}</Text>
          {subtitle ? (
            <Text variant="body" color="textMuted" style={{ marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : subtitle ? (
        <Text variant="body" color="textMuted" style={{ marginBottom: spacing.lg }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );

  return (
    <View style={styles.root} testID={testID}>
      <Backdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight, paddingBottom: footer ? 24 : insets.bottom + 120 }]}
            scrollIndicatorInsets={{ top: headerHeight }}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scrollContent, { paddingTop: headerHeight }]}>{body}</View>
        )}
        {footer ? (
          <Glass intensity={50} style={{ borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12, paddingHorizontal: spacing.lg }]}>
              <View style={styles.footerInner}>{footer}</View>
            </View>
          </Glass>
        ) : null}
      </KeyboardAvoidingView>
      {header}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, gap: 8 },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerTitle: { flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: TOUCH - 6, height: TOUCH - 6, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingTop: 8 },
  footer: { paddingTop: 14, alignItems: 'center' },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, gap: 10 },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
});
