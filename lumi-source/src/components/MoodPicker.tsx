import { Pressable, StyleSheet, View } from 'react-native';

import { useContent } from '@/i18n';
import type { MoodScore } from '@/store/types';
import { useTheme } from '@/theme';

import { tapFeedback } from './Button';
import { MoodIcon } from './Icon';
import { Text } from './Text';

export function MoodPicker({ value, onChange }: { value: MoodScore | null; onChange: (score: MoodScore) => void }) {
  const { colors, radius, neu } = useTheme();
  const content = useContent();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {content.moodLevels.map((level) => {
        const selected = value === level.score;
        const fill = colors.mood[level.score - 1];
        return (
          <Pressable
            key={level.score}
            testID={`mood-${level.score}`}
            onPress={() => {
              tapFeedback('toggle');
              onChange(level.score as MoodScore);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={level.label}
            style={({ pressed }) => [
              styles.option,
              {
                borderRadius: radius.md,
                backgroundColor: selected ? fill : colors.surface,
                boxShadow: selected || pressed ? neu.insetSm : neu.raisedSm,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <MoodIcon name={level.icon} size={32} color={selected ? '#1D2330' : colors.text} />
            <Text variant="caption" style={{ color: selected ? '#1D2330' : colors.text }} numberOfLines={1}>
              {level.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4, minHeight: 78 },
});
