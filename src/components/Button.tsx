import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /**
   * The Material 3 button types:
   * primary: filled, the one main action on a screen.
   * neutral: outlined, everything else.
   * danger: outlined with the error colour, for destructive actions.
   */
  variant?: 'primary' | 'neutral' | 'danger';
  loading?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A Material 3 button: 40 high, fully rounded, label in "label large".
 * It dips when pressed and springs back, so a tap is always felt.
 */
export function Button({ label, variant = 'primary', loading, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const pressed = useSharedValue(0);
  const filled = variant === 'primary';

  const textColor = filled ? 'onBrand' : variant === 'danger' ? 'danger' : 'brand';

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.03 * pressed.get() }],
    opacity: 1 - 0.12 * pressed.get(),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      // The button is 40 high; this brings the area a finger can hit up to Material's 48.
      hitSlop={{ top: 4, bottom: 4 }}
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
          backgroundColor: filled ? theme.colors.brand : 'transparent',
          borderColor: filled ? theme.colors.brand : theme.colors.outline,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.space[6],
        },
        inactive ? styles.inactive : motion,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors[textColor]} />
      ) : (
        <AppText variant="label" color={textColor} center>
          {label}
        </AppText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  // Material's disabled state: the whole control at 38% strength.
  inactive: { opacity: 0.38 },
});
