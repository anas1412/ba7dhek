import { Pressable, View } from 'react-native';

import { currentLanguage } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Read out for the two buttons, which show only a sign. */
  fewerLabel: string;
  moreLabel: string;
};

function StepButton({
  icon,
  name,
  disabled,
  onPress,
}: {
  icon: IconName;
  name: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.outline,
        backgroundColor: pressed ? theme.colors.surfaceContainerHigh : 'transparent',
        opacity: disabled ? 0.38 : 1,
      })}>
      <Icon name={icon} size={20} color="inkMuted" />
    </Pressable>
  );
}

/** A small whole number, changed one at a time. Quicker than a keyboard for "2 or 3". */
export function Stepper({ label, value, min, max, onChange, fewerLabel, moreLabel }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[2] }}>
      <AppText variant="label">{label}</AppText>
      {/* Minus then plus in every language: a number line does not mirror. */}
      <View style={{ flexDirection: 'row', direction: 'ltr', alignSelf: 'flex-start', alignItems: 'center', gap: theme.space[4] }}>
        <StepButton icon="minus" name={fewerLabel} disabled={value <= min} onPress={() => onChange(value - 1)} />
        <View accessibilityLiveRegion="polite" style={{ minWidth: 40, alignItems: 'center' }}>
          <AppText variant="title">{formatNumber(value, currentLanguage(), 0)}</AppText>
        </View>
        <StepButton icon="plus" name={moreLabel} disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}
