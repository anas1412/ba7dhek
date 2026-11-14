import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  label: string;
  /**
   * soft: a fact about the job, as a Material 3 assist chip (outlined).
   * near: distance, and only distance. The amber is reserved for proximity.
   */
  variant?: 'soft' | 'near';
  icon?: IconName;
  /** The distance chip on a job card is larger than the fact chips beside it. */
  large?: boolean;
};

/** A Material 3 chip that states something and cannot be pressed: 32 high, corners of 8. */
export function Chip({ label, variant = 'soft', icon, large }: Props) {
  const theme = useTheme();
  const near = variant === 'near';
  const textColor = near ? 'onNear' : 'inkMuted';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.space[2],
        minHeight: large ? 40 : 32,
        paddingStart: icon ? theme.space[2] : theme.space[4],
        paddingEnd: theme.space[4],
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: near ? 'transparent' : theme.colors.line,
        backgroundColor: near ? theme.colors.near : 'transparent',
      }}>
      {icon ? <Icon name={icon} size={large ? 20 : 16} color={textColor} /> : null}
      <AppText variant={large ? 'bodyStrong' : 'label'} color={textColor}>
        {label}
      </AppText>
    </View>
  );
}
