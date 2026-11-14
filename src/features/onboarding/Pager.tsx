import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { isLayoutRtl } from '@/i18n';

type Props = {
  pages: ReactNode[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Turn off on a page that has its own swipe, so the two do not fight. */
  swipeEnabled?: boolean;
};

const SPRING = { damping: 22, stiffness: 220 };
const FLICK_VELOCITY = 600;

/**
 * Pages that follow the finger and settle on the nearest one. In Arabic the
 * order runs right to left: the next page comes in from the left.
 */
export function Pager({ pages, index, onIndexChange, swipeEnabled = true }: Props) {
  const [width, setWidth] = useState(0);
  // Fractional page position: 1.5 is halfway between the second and third page.
  const progress = useSharedValue(index);
  const direction = isLayoutRtl() ? -1 : 1;
  const last = pages.length - 1;

  // Buttons change `index` from outside; glide to it.
  useEffect(() => {
    progress.set(withSpring(index, SPRING));
  }, [index, progress]);

  const pan = usePanGesture({
    enabled: swipeEnabled && width > 0,
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      const dragged = index - (event.translationX * direction) / width;
      // Past the first or last page the drag meets resistance, then stops.
      const over = dragged < 0 ? dragged : dragged > last ? dragged - last : 0;
      progress.set(Math.min(last, Math.max(0, dragged)) + over * 0.25);
    },
    onDeactivate: (event) => {
      'worklet';
      const moved = (-event.translationX * direction) / width;
      const speed = -event.velocityX * direction;
      let target = index;
      if (!event.canceled) {
        if (moved > 0.25 || speed > FLICK_VELOCITY) target = index + 1;
        else if (moved < -0.25 || speed < -FLICK_VELOCITY) target = index - 1;
      }
      target = Math.min(last, Math.max(0, target));
      progress.set(withSpring(target, SPRING));
      if (target !== index) scheduleOnRN(onIndexChange, target);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {pages.map((page, pageIndex) => (
          <Page key={pageIndex} index={pageIndex} progress={progress} width={width} direction={direction}>
            {page}
          </Page>
        ))}
      </View>
    </GestureDetector>
  );
}

function Page({
  children,
  index,
  progress,
  width,
  direction,
}: {
  children: ReactNode;
  index: number;
  progress: SharedValue<number>;
  width: number;
  direction: number;
}) {
  const style = useAnimatedStyle(() => {
    const offset = index - progress.get();
    return {
      transform: [{ translateX: offset * width * direction }],
      // A page fades a little as it leaves, which softens the hand-over.
      opacity: 1 - Math.min(1, Math.abs(offset)) * 0.5,
    };
  });
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      // Pages off to the side must not catch taps or be read out.
      pointerEvents="box-none"
      accessibilityElementsHidden={false}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
