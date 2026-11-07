/** Form controls that work the same on Android, iOS and the web. */
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useT } from '@/i18n';
import { TOUCH, useTheme } from '@/theme';
import { formatClock, hhmmToMinutes, minutesToHHMM } from '@/utils/time';

import { Button, tapFeedback } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export function TextField({
  label,
  hint,
  value,
  onChangeText,
  maxLength,
  multiline,
  error,
  ...rest
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const { colors, radius, neu } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallStrong">{label}</Text>
      {hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline={multiline}
        placeholderTextColor={colors.placeholder}
        accessibilityLabel={label}
        accessibilityHint={hint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            boxShadow: neu.inset,
            borderColor: error ? colors.danger : focused ? colors.primary : 'transparent',
            borderRadius: radius.md,
            minHeight: multiline ? 120 : TOUCH + 4,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        {...rest}
      />
      <View style={styles.inputMeta}>
        {error ? (
          <Text variant="caption" color="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {maxLength ? (
          <Text variant="caption" color="textMuted">
            {(value ?? '').length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Time picker built from +/- steppers (accessible and works on the web). */
export function TimeField({ label, value, onChange, step = 15 }: { label: string; value: string; onChange: (v: string) => void; step?: number }) {
  const { colors, radius, neu } = useTheme();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const shift = (minutes: number) => setDraft((d) => minutesToHHMM(hhmmToMinutes(d) + minutes));
  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatClock(value)}`}
        accessibilityHint={t('inputs.changeTime')}
        style={({ pressed }) => [
          styles.timeField,
          { backgroundColor: colors.surface, borderRadius: radius.md, boxShadow: pressed ? neu.insetSm : neu.raisedSm },
        ]}
      >
        <Text variant="small" color="textMuted">
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="bodyStrong">{formatClock(value)}</Text>
          <Icon name="time-outline" size={18} color={colors.textMuted} />
        </View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <Text variant="display" align="center" accessibilityLiveRegion="polite">
          {formatClock(draft)}
        </Text>
        <View style={styles.stepRow}>
          <Button label={t('inputs.hourMinus')} variant="secondary" small onPress={() => shift(-60)} />
          <Button label={t('inputs.hourPlus')} variant="secondary" small onPress={() => shift(60)} />
        </View>
        <View style={styles.stepRow}>
          <Button label={t('inputs.minutesMinus', { n: step })} variant="secondary" small onPress={() => shift(-step)} />
          <Button label={t('inputs.minutesPlus', { n: step })} variant="secondary" small onPress={() => shift(step)} />
        </View>
        <Button
          label={t('common.done')}
          full
          onPress={() => {
            onChange(draft);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const { colors, radius, neu } = useTheme();
  const { t } = useT();
  const set = (v: number) => {
    tapFeedback();
    onChange(Math.max(min, Math.min(max, v)));
  };
  return (
    <View
      style={[styles.stepper, { backgroundColor: colors.surface, boxShadow: neu.raisedSm, borderRadius: radius.md }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
    >
      <Text variant="small" color="textMuted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Pressable
        onPress={() => set(value - step)}
        accessibilityLabel={t('inputs.decrease')}
        hitSlop={6}
        style={({ pressed }) => [styles.stepButton, { backgroundColor: colors.surface, boxShadow: pressed ? neu.insetSm : neu.raisedSm }]}
      >
        <Icon name="remove" size={20} />
      </Pressable>
      <Text variant="bodyStrong" style={{ minWidth: 72 }} align="center">
        {format(value)}
      </Text>
      <Pressable
        onPress={() => set(value + step)}
        accessibilityLabel={t('inputs.increase')}
        hitSlop={6}
        style={({ pressed }) => [styles.stepButton, { backgroundColor: colors.surface, boxShadow: pressed ? neu.insetSm : neu.raisedSm }]}
      >
        <Icon name="add" size={20} />
      </Pressable>
    </View>
  );
}

/** Monday-first day picker. Values are JS weekdays (0 = Sunday). */
export function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const { colors, neu } = useTheme();
  const { t } = useT();
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <View style={styles.days} accessibilityRole="none">
      {order.map((day) => {
        const on = value.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => {
              tapFeedback('toggle');
              onChange(on ? value.filter((d) => d !== day) : [...value, day].sort());
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={t(`days.long.${day}`)}
            style={[styles.day, { backgroundColor: on ? colors.primary : colors.surface, boxShadow: on ? neu.insetSm : neu.raisedSm }]}
          >
            <Text variant="smallStrong" style={{ color: on ? colors.onPrimary : colors.text }}>
              {t(`days.short.${day}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const { colors, radius, neu } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, boxShadow: neu.inset }]}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tapFeedback('toggle');
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            style={[styles.segment, { backgroundColor: on ? colors.surface : 'transparent', borderRadius: radius.pill, boxShadow: on ? neu.raisedSm : undefined }]}
          >
            <Text variant="smallStrong" style={{ color: on ? colors.text : colors.textMuted }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 22 },
  inputMeta: { flexDirection: 'row', alignItems: 'center' },
  timeField: {
    paddingHorizontal: 14,
    minHeight: TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  stepRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: TOUCH + 8 },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
