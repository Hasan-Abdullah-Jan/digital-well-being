import { View } from 'react-native';

import { memberColor } from '@/features/crew';
import type { CrewMember } from '@/store/types';

import { Text } from './Text';

/** A coloured circle with the member's initial. */
export function CrewAvatar({ member, size = 40, ring }: { member: CrewMember; size?: number; ring?: boolean }) {
  const color = memberColor(member);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 3 : 0,
        borderColor: 'rgba(255,255,255,0.85)',
      }}
    >
      <Text variant={size >= 44 ? 'heading' : 'smallStrong'} style={{ color: '#FFFFFF' }}>
        {(member.name.trim()[0] ?? '?').toUpperCase()}
      </Text>
    </View>
  );
}
