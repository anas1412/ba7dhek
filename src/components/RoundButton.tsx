import { Pressable, View } from 'react-native';

import { haptic } from '@/lib/haptics';
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

/**
 * The two actions under the job stack, as Material 3 floating action buttons:
 * 56 square with corners of 16. Apply is the primary one; pass is the quiet one.
 */
export function RoundButton({ icon, label, variant, onPress, disabled }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPressIn={() => haptic.tap()}
      onPress={onPress}
      style={{ alignItems: 'center', gap: theme.space[1], opacity: disabled ? 0.38 : 1 }}>
      {({ pressed }) => (
        <>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: primary ? theme.colors.brandContainer : theme.colors.surfaceContainerHigh,
              // Material's level 3 elevation, which is what lifts a floating button off the page.
              boxShadow: pressed
                ? '0 1px 2px rgba(0, 0, 0, 0.3)'
                : '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)',
              transform: [{ scale: pressed ? 0.96 : 1 }],
            }}>
            <Icon name={icon} size={24} color={primary ? 'onBrandContainer' : 'brand'} />
          </View>
          <AppText variant="caption" color="inkMuted">
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
