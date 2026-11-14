import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  /** 1-based. */
  current: number;
  total: number;
  /** "Step 1 of 3", already translated. */
  label: string;
  /** The name of the current step. */
  title: string;
};

function Segment({ filled }: { filled: boolean }) {
  const theme = useTheme();
  const fill = useAnimatedStyle(() => ({ opacity: withTiming(filled ? 1 : 0, { duration: 220 }) }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: theme.radius.full, overflow: 'hidden', backgroundColor: theme.colors.brandSoft }}>
      <Animated.View style={[{ flex: 1, backgroundColor: theme.colors.brand }, fill]} />
    </View>
  );
}

/** Where the person is in a form that spans several steps. */
export function StepProgress({ current, total, label, title }: Props) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: total, now: current }}
      style={{ gap: theme.space[2] }}>
      <View style={{ flexDirection: 'row', gap: theme.space[1] }}>
        {Array.from({ length: total }, (_, index) => (
          <Segment key={index} filled={index < current} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space[2] }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" color="inkMuted">
          {label}
        </AppText>
      </View>
    </View>
  );
}
