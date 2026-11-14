import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Pinned under the content, above the bottom safe area and above the keyboard. */
  footer?: ReactNode;
  scroll?: boolean;
  /**
   * Set on screens that sit under the app's header bar, which already clears
   * the top of the phone. Without it the top gap would be doubled.
   */
  underHeader?: boolean;
};

/** The frame every screen sits in: ground colour, safe areas, side padding and keyboard room. */
export function Screen({ children, footer, scroll, underHeader }: Props) {
  const theme = useTheme();
  const padding = { paddingHorizontal: theme.space[4], gap: theme.space[4] };
  const edges: Edge[] = underHeader ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right'];
  const top = underHeader ? theme.space[2] : theme.space[6];

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: theme.colors.surface }]}>
      {/* When the keyboard opens, the content shrinks so the focused field and the button stay in view. */}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.fill}
            // A tap on a button while the keyboard is open presses the button, not just the keyboard away.
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[padding, { paddingTop: top, paddingBottom: theme.space[6] }]}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, padding, { paddingTop: top, paddingBottom: theme.space[6] }]}>{children}</View>
        )}
        {footer ? (
          <View style={[padding, { paddingVertical: theme.space[4], gap: theme.space[2] }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
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
