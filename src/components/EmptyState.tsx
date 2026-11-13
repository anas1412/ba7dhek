import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  /** Buttons that let the person act on the empty state. */
  children?: ReactNode;
};

/** Says plainly what is missing and what the person can do about it. */
export function EmptyState({ icon, title, body, children }: Props) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[4] }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.brandSoft,
        }}>
        <Icon name={icon} size={28} color="brand" />
      </View>
      <View style={{ gap: theme.space[2] }}>
        <AppText variant="title">{title}</AppText>
        {body ? <AppText color="inkMuted">{body}</AppText> : null}
      </View>
      {children ? <View style={{ gap: theme.space[2] }}>{children}</View> : null}
    </View>
  );
}
