import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** primary: the one main action. neutral: everything else. danger: destructive. */
  variant?: 'primary' | 'neutral' | 'danger';
  loading?: boolean;
};

export function Button({ label, variant = 'primary', loading, disabled, ...rest }: Props) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const background = variant === 'primary' ? theme.colors.brand : theme.colors.surfaceRaised;
  const textColor = variant === 'primary' ? 'onBrand' : variant === 'danger' ? 'danger' : 'ink';
  // Control borders use ink-muted; `line` is too faint for them.
  const borderColor = variant === 'primary' ? theme.colors.brand : theme.colors.inkMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.space[4],
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors[textColor]} />
      ) : (
        <AppText variant="bodyStrong" color={textColor} center>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
