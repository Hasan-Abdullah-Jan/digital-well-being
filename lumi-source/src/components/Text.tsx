import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type ThemeColors, type TypographyVariant } from '@/theme';

type ColorKey = keyof Pick<
  ThemeColors,
  | 'text'
  | 'textMuted'
  | 'primary'
  | 'onPrimary'
  | 'onPrimarySoft'
  | 'accent'
  | 'onAccent'
  | 'onAccentSoft'
  | 'success'
  | 'onSuccessSoft'
  | 'warning'
  | 'onWarningSoft'
  | 'danger'
  | 'onDangerSoft'
>;

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorKey;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
};

export function Text({ variant = 'body', color = 'text', align, weight, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <RNText
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}
