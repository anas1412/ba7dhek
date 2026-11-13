import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { useTheme, type ColorTokens } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type Props = {
  name: IconName;
  /** 24 for navigation and actions, 16 inside chips. */
  size?: 16 | 20 | 24 | 28;
  color?: keyof ColorTokens;
  /** Set for icons that imply a direction (arrows, chevrons, send) so they flip in Arabic. */
  directional?: boolean;
};

/** One outline icon set for the whole app. Icons take the colour of the text beside them. */
export function Icon({ name, size = 24, color = 'ink', directional }: Props) {
  const theme = useTheme();
  return (
    <Feather
      name={name}
      size={size}
      color={theme.colors[color]}
      style={directional && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
