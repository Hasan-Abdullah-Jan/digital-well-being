import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/Surfaces';
import { tapFeedback } from '@/components/Button';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['sunny', 'sunny-outline'],
  habits: ['hourglass', 'hourglass-outline'],
  mind: ['leaf', 'leaf-outline'],
  connect: ['people', 'people-outline'],
  me: ['person-circle', 'person-circle-outline'],
};

export default function TabsLayout() {
  const { colors, neu, radius } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: insets.bottom + 10,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          borderRadius: radius.xl,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          boxShadow: neu.float,
        },
        tabBarBackground: () => <Glass intensity={60} style={{ flex: 1, borderRadius: radius.xl }} />,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarItemStyle: { borderRadius: radius.lg },
        tabBarIcon: ({ focused, color, size }) => {
          const pair = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? pair[0] : pair[1]} size={size} color={color as string} />;
        },
      })}
      screenListeners={{ tabPress: () => tapFeedback() }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarButtonTestID: 'tab-today' }} />
      <Tabs.Screen name="habits" options={{ title: t('tabs.habits'), tabBarButtonTestID: 'tab-habits' }} />
      <Tabs.Screen name="mind" options={{ title: t('tabs.mind'), tabBarButtonTestID: 'tab-mind' }} />
      <Tabs.Screen name="connect" options={{ title: t('tabs.connect'), tabBarButtonTestID: 'tab-connect' }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me'), tabBarButtonTestID: 'tab-me' }} />
    </Tabs>
  );
}
