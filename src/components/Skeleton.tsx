import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type BlockProps = {
  width?: DimensionValue;
  height: number;
  /** Defaults to the small radius; pass the theme's full radius for a pill or disc. */
  radius?: number;
};

/**
 * A grey shape standing in for content that is on its way. It breathes slowly
 * so the screen reads as loading, not broken. With reduced motion it holds still.
 */
export function Skeleton({ width = '100%', height, radius }: BlockProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [pulse, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * pulse.get() }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius ?? theme.radius.sm, backgroundColor: theme.colors.line },
        style,
      ]}
    />
  );
}

/** The outline of a job card while the stack loads. */
export function CardSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flex: 1,
        padding: theme.space[6],
        gap: theme.space[4],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.surfaceRaised,
      }}>
      <Skeleton width={150} height={40} radius={theme.radius.full} />
      <Skeleton width="85%" height={36} />
      <Skeleton width="55%" height={26} />
      <Skeleton width="65%" height={22} />
      <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
        <Skeleton width={84} height={26} radius={theme.radius.full} />
        <Skeleton width={72} height={26} radius={theme.radius.full} />
      </View>
      <View style={{ flex: 1, gap: theme.space[2] }}>
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton width="70%" height={16} />
      </View>
      <Skeleton width={130} height={14} />
    </View>
  );
}

/** A few list rows while a list loads. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const theme = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: theme.space[4] }}>
      {Array.from({ length: rows }, (_, row) => (
        <View
          key={row}
          style={{
            padding: theme.space[4],
            gap: theme.space[2] + theme.space[1],
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.line,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          <Skeleton width="70%" height={24} />
          <Skeleton width="45%" height={18} />
          <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
            <Skeleton width={76} height={24} radius={theme.radius.full} />
            <Skeleton width={110} height={24} radius={theme.radius.full} />
          </View>
        </View>
      ))}
    </View>
  );
}
