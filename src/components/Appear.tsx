import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  /** Position in a list. Each row follows the one before it by a beat. */
  index?: number;
  style?: StyleProp<ViewStyle>;
};

const STAGGER_MS = 45;
// Past this many rows the delay would be felt as slowness, so the rest arrive together.
const MAX_STAGGERED = 6;

/**
 * A list row that fades and rises into place, leaves with a fade, and slides
 * when its neighbours change. Reanimated holds all of this still when the
 * phone asks for reduced motion.
 */
export function Appear({ children, index = 0, style }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(Math.min(index, MAX_STAGGERED) * STAGGER_MS)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(220)}
      style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * For a value that changes in place, such as a status. Give it a `key` that
 * changes with the value and the new one fades in over the old.
 */
export function Swap({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={style}>
      {children}
    </Animated.View>
  );
}
