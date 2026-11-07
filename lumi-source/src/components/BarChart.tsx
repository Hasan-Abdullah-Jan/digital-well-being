/** Lightweight bar chart made of plain Views: fast on low-end phones and fully accessible. */
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type Bar = { key: string; label: string; value: number | null; color?: string; highlight?: boolean };

export function BarChart({
  bars,
  height = 140,
  goal,
  formatValue = (v) => String(v),
  summary,
  showValues = false,
}: {
  bars: Bar[];
  height?: number;
  goal?: number;
  formatValue?: (v: number) => string;
  /** Spoken by screen readers instead of reading every bar. */
  summary: string;
  showValues?: boolean;
}) {
  const { colors, radius } = useTheme();
  const max = Math.max(goal ?? 0, ...bars.map((b) => b.value ?? 0), 1);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={[styles.plot, { height }]}>
        {goal ? (
          <View
            style={[styles.goal, { bottom: (goal / max) * height, borderColor: colors.chart.goal }]}
            importantForAccessibility="no"
          />
        ) : null}
        {bars.map((bar) => {
          const h = bar.value === null ? 4 : Math.max(4, (bar.value / max) * height);
          return (
            <View key={bar.key} style={styles.barSlot}>
              {showValues && bar.value !== null ? (
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {formatValue(bar.value)}
                </Text>
              ) : null}
              <View
                style={{
                  height: h,
                  width: '70%',
                  maxWidth: 34,
                  borderRadius: radius.sm,
                  backgroundColor:
                    bar.value === null ? colors.surfaceAlt : (bar.color ?? (bar.highlight ? colors.chart.bar : colors.chart.barMuted)),
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {bars.map((bar) => (
          <Text key={bar.key} variant="caption" color={bar.highlight ? 'text' : 'textMuted'} align="center" style={styles.label} numberOfLines={1}>
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  goal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  labels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  label: { flex: 1 },
});
