import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  label: string;
  /**
   * soft: contract type, category and other facts.
   * near: distance, and only distance. The amber is reserved for proximity.
   */
  variant?: 'soft' | 'near';
  icon?: IconName;
  /** The distance chip on a job card is larger than the fact chips beside it. */
  large?: boolean;
};

export function Chip({ label, variant = 'soft', icon, large }: Props) {
  const theme = useTheme();
  const near = variant === 'near';
  const textColor = near ? 'onNear' : 'ink';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: theme.space[1],
        paddingHorizontal: large ? theme.space[4] : theme.space[2] + theme.space[1],
        paddingVertical: large ? theme.space[2] : theme.space[1],
        borderRadius: theme.radius.full,
        backgroundColor: near ? theme.colors.near : theme.colors.brandSoft,
      }}>
      {icon ? <Icon name={icon} size={large ? 20 : 16} color={textColor} /> : null}
      <AppText variant={large ? 'bodyStrong' : 'label'} color={textColor}>
        {label}
      </AppText>
    </View>
  );
}
