import { useImperativeHandle, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { JobCard, type JobCardData } from './JobCard';

export type SwipeDirection = 'left' | 'right';

export type CardStackHandle = {
  /** Lets the buttons under the stack do what a swipe does. */
  swipe: (direction: SwipeDirection) => void;
};

type Props = {
  jobs: JobCardData[];
  /** Called once the card has left the screen. */
  onSwipe: (job: JobCardData, direction: SwipeDirection) => void;
  /** Opens the full description of a job. Without it the card has no details button. */
  onOpen?: (job: JobCardData) => void;
  now: number;
  ref?: Ref<CardStackHandle>;
};

const EXIT_MS = 220;
/** A flick this fast counts as a swipe even if the card has not travelled far. */
const FLICK_VELOCITY = 900;
// Slightly under-damped, so a card that springs back overshoots a touch and settles.
const SPRING = { damping: 13, stiffness: 190 };

/**
 * The job stack. Right means apply and left means pass in every language: a
 * swipe is a physical direction, so it does not mirror for Arabic.
 *
 * Shared values are read and written with get() and set(), which is the form
 * the React Compiler accepts.
 */
export function CardStack({ jobs, onSwipe, onOpen, now, ref }: Props) {
  // Cards the person has swiped are hidden at once, before the server confirms.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const visible = jobs.filter((job) => !dismissed.has(job._id));
  const top = visible[0];
  const next = visible[1];

  // How far the top card has been dragged; the card beneath grows as it leaves.
  const drag = useSharedValue(0);

  function handleSwiped(job: JobCardData, direction: SwipeDirection) {
    setDismissed((current) => new Set(current).add(job._id));
    drag.set(0);
    onSwipe(job, direction);
  }

  if (!top) return null;

  return (
    <View style={styles.fill}>
      {next ? <NextCard key={next._id} job={next} now={now} drag={drag} /> : null}
      <TopCard key={top._id} job={top} now={now} drag={drag} onSwiped={handleSwiped} onOpen={onOpen} ref={ref} />
    </View>
  );
}

function NextCard({ job, now, drag }: { job: JobCardData; now: number; drag: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  const style = useAnimatedStyle(() => {
    const progress = interpolate(Math.abs(drag.get()), [0, width * 0.5], [0, 1], Extrapolation.CLAMP);
    return {
      // At rest the next card peeks out under the top one, so the stack reads as a stack.
      transform: [{ translateY: 14 * (1 - progress) }, { scale: 0.94 + 0.06 * progress }],
      opacity: 0.7 + 0.3 * progress,
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <JobCard job={job} now={now} />
    </Animated.View>
  );
}

function TopCard({
  job,
  now,
  drag,
  onSwiped,
  onOpen,
  ref,
}: {
  job: JobCardData;
  now: number;
  drag: SharedValue<number>;
  onSwiped: (job: JobCardData, direction: SwipeDirection) => void;
  onOpen?: (job: JobCardData) => void;
  ref?: Ref<CardStackHandle>;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const y = useSharedValue(0);
  const leaving = useSharedValue(false);

  const threshold = width * 0.3;
  const offscreen = width * 1.4;

  function finish(direction: SwipeDirection) {
    // Applying is felt through its confirmation message; a pass gets a light tap of its own.
    if (direction === 'left') haptic.tap();
    onSwiped(job, direction);
  }

  /** Sends the card off the screen, then reports the swipe. Runs on either thread. */
  function leave(direction: SwipeDirection, duration: number) {
    'worklet';
    if (leaving.get()) return;
    leaving.set(true);
    drag.set(
      withTiming(direction === 'right' ? offscreen : -offscreen, { duration }, (done) => {
        if (done) scheduleOnRN(finish, direction);
      }),
    );
  }

  useImperativeHandle(ref, () => ({
    // A tap on a button moves the card a little slower than a flick, so the eye can follow it.
    swipe: (direction) => leave(direction, EXIT_MS + 80),
  }));

  const pan = usePanGesture({
    // Start only on a clearly horizontal drag, so vertical scrolling still works.
    activeOffsetX: [-12, 12],
    failOffsetY: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      if (leaving.get()) return;
      drag.set(event.translationX);
      y.set(event.translationY * 0.25);
    },
    onDeactivate: (event) => {
      'worklet';
      if (leaving.get()) return;
      const far = Math.abs(event.translationX) > threshold;
      const fast = Math.abs(event.velocityX) > FLICK_VELOCITY;
      if (!event.canceled && (far || fast)) {
        // A fast flick decides by its own direction, a slow drag by where the card is.
        const toRight = fast && !far ? event.velocityX > 0 : event.translationX > 0;
        leave(toRight ? 'right' : 'left', EXIT_MS);
      } else {
        drag.set(withSpring(0, SPRING));
        y.set(withSpring(0, SPRING));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag.get() },
      { translateY: y.get() },
      { rotate: `${interpolate(drag.get(), [-width, 0, width], [-10, 0, 10], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const applyStamp = useAnimatedStyle(() => ({
    opacity: interpolate(drag.get(), [16, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const passStamp = useAnimatedStyle(() => ({
    opacity: interpolate(drag.get(), [-threshold, -16], [1, 0], Extrapolation.CLAMP),
  }));

  // The stamp says in words and with an icon what letting go will do.
  // Physical sides on purpose: each stamp sits on the side the card is leaving from.
  const stampBase = {
    position: 'absolute' as const,
    top: theme.space[6],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.space[1],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
    borderRadius: theme.radius.full,
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, cardStyle]}>
        <JobCard job={job} now={now} onOpen={onOpen ? () => onOpen(job) : undefined} />
        <Animated.View
          pointerEvents="none"
          style={[stampBase, { right: theme.space[6], backgroundColor: theme.colors.brand }, applyStamp]}>
          <Icon name="check" size={20} color="onBrand" />
          <AppText variant="bodyStrong" color="onBrand">
            {t('jobs.apply')}
          </AppText>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            stampBase,
            {
              left: theme.space[6],
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            },
            passStamp,
          ]}>
          <Icon name="x" size={20} color="ink" />
          <AppText variant="bodyStrong">{t('jobs.pass')}</AppText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
