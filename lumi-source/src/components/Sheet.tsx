import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Glass } from './Surfaces';
import { Text } from './Text';

/** Simple bottom sheet built on React Native's Modal (no extra native dependency). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  dismissable = true,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  dismissable?: boolean;
  testID?: string;
}) {
  const { colors, radius, neu } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : () => undefined} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel={dismissable ? t('common.close') : undefined}
          accessibilityRole={dismissable ? 'button' : undefined}
        />
        <Glass
          intensity={70}
          style={[styles.sheet, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderBottomWidth: 0, boxShadow: neu.float }]}
        >
        <View
          testID={testID}
          accessibilityViewIsModal
          style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 20, paddingTop: 8 }}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title || dismissable ? (
            <View style={styles.titleRow}>
              <Text variant="heading" style={{ flex: 1 }}>
                {title ?? ''}
              </Text>
              {dismissable ? (
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} style={[styles.close, { backgroundColor: colors.surface, boxShadow: neu.raisedSm }]}>
                  <Icon name="close" size={20} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
        </Glass>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: StyleSheet.absoluteFill,
  sheet: { maxHeight: '88%', width: '100%', maxWidth: 680, alignSelf: 'center' },
  grabber: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 14, paddingBottom: 8 },
});
