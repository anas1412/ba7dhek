import { Text, type TextProps } from 'react-native';

import { useTheme, type ColorTokens, type TextVariant } from '@/theme';

type Props = TextProps & {
  variant?: TextVariant;
  color?: keyof ColorTokens;
  center?: boolean;
};

/**
 * All text goes through here so the typeface, scale and colours stay on the
 * design tokens. Alignment follows the language unless `center` is set.
 */
export function AppText({ variant = 'body', color = 'ink', center, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        theme.text[variant],
        { color: theme.colors[color] },
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
