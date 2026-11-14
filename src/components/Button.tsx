import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** primary: the one main action. neutral: everything else. danger: destructive. */
  variant?: 'primary' | 'neutral' | 'danger';
  loading?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Every button dips when pressed and springs back, so a tap is always felt. */
export function Button({ label, variant = 'primary', loading, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const pressed = useSharedValue(0);

  const background = variant === 'primary' ? theme.colors.brand : theme.colors.surfaceRaised;
  const textColor = variant === 'primary' ? 'onBrand' : variant === 'danger' ? 'danger' : 'ink';
  // Control borders use ink-muted; `line` is too faint for them.
  const borderColor = variant === 'primary' ? theme.colors.brand : theme.colors.inkMuted;

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.03 * pressed.get() }],
    opacity: 1 - 0.12 * pressed.get(),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      {...rest}
      onPressIn={(event) => {
        pressed.set(withTiming(1, { duration: 80 }));
        haptic.tap();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.set(withSpring(0, { damping: 14, stiffness: 260 }));
        onPressOut?.(event);
      }}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.space[4],
        },
        inactive ? styles.inactive : motion,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors[textColor]} />
      ) : (
        <AppText variant="bodyStrong" color={textColor} center>
          {label}
        </AppText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  inactive: { opacity: 0.5 },
});
