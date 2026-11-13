import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Pinned under the content, above the bottom safe area. */
  footer?: ReactNode;
  scroll?: boolean;
};

/** The frame every screen sits in: ground colour, safe areas and side padding. */
export function Screen({ children, footer, scroll }: Props) {
  const theme = useTheme();
  const padding = { paddingHorizontal: theme.space[4], gap: theme.space[4] };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.surface }]}>
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[padding, { paddingVertical: theme.space[6] }]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, padding, { paddingVertical: theme.space[6] }]}>{children}</View>
      )}
      {footer ? (
        <View style={[padding, { paddingVertical: theme.space[4], gap: theme.space[2] }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export function LoadingScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: theme.colors.surface }]}>
      <ActivityIndicator color={theme.colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
