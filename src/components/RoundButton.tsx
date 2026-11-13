import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  /** Shown under the icon, so the action is never told by position or colour alone. */
  label: string;
  /** primary: apply. neutral: pass. */
  variant: 'primary' | 'neutral';
  onPress: () => void;
  disabled?: boolean;
};

/** The two actions under the job stack, for people who would rather tap than swipe. */
export function RoundButton({ icon, label, variant, onPress, disabled }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={{ alignItems: 'center', gap: theme.space[1], opacity: disabled ? 0.4 : 1 }}>
      {({ pressed }) => (
        <>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: primary ? 0 : 1,
              borderColor: theme.colors.inkMuted,
              backgroundColor: primary ? theme.colors.brand : theme.colors.surfaceRaised,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            }}>
            <Icon name={icon} size={28} color={primary ? 'onBrand' : 'ink'} />
          </View>
          <AppText variant="label" color={primary ? 'brand' : 'inkMuted'}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
