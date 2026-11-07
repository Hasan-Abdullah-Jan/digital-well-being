import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconCircle } from '@/components/Icon';
import { Backdrop } from '@/components/Surfaces';
import { Text } from '@/components/Text';
import { enterDemoMode } from '@/demo';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

export default function Welcome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  const promises = [
    { icon: 'lock-closed-outline', title: t('welcome.privateTitle'), body: t('welcome.privateBody') },
    { icon: 'heart-outline', title: t('welcome.kindTitle'), body: t('welcome.kindBody') },
    { icon: 'people-outline', title: t('welcome.humanTitle'), body: t('welcome.humanBody') },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Backdrop />
      <View style={styles.inner}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: colors.primary, boxShadow: '0px 14px 36px rgba(42,107,102,0.45)' }]}>
            <View style={[styles.glow, { backgroundColor: colors.accentSoft }]} />
            <View style={[styles.core, { backgroundColor: '#FCE7C8' }]} />
          </View>
          <Text variant="display" align="center">
            Lumi
          </Text>
          <Text variant="heading" color="textMuted" align="center">
            {t('welcome.tagline')}
          </Text>
        </View>
        <View style={{ gap: 14 }}>
          {promises.map((p) => (
            <View key={p.title} style={styles.promise}>
              <IconCircle name={p.icon} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{p.title}</Text>
                <Text variant="small" color="textMuted">
                  {p.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ gap: 10 }}>
          <Button label={t('welcome.start')} full onPress={() => router.push('/onboarding/concerns')} testID="welcome-start" />
          <Button
            label={t('welcome.demo')}
            variant="secondary"
            full
            loading={loading}
            testID="welcome-demo"
            onPress={async () => {
              setLoading(true);
              try {
                await enterDemoMode();
                router.replace('/(tabs)');
              } finally {
                setLoading(false);
              }
            }}
          />
          <Text variant="caption" color="textMuted" align="center">
            {t('welcome.disclaimer')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  inner: { flex: 1, width: '100%', maxWidth: 560, justifyContent: 'space-between', gap: 24 },
  hero: { alignItems: 'center', gap: 8, marginTop: 12 },
  logo: { width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  glow: { position: 'absolute', width: 64, height: 64, borderRadius: 32, opacity: 0.55 },
  core: { width: 40, height: 40, borderRadius: 20 },
  promise: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});
