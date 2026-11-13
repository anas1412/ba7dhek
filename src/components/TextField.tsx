import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the field. Use it to say what is wanted, not to repeat the label. */
  hint?: string;
  error?: string;
};

/** A labelled text input. The label is always visible; placeholders are only examples. */
export function TextField({ label, hint, error, multiline, ...rest }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: theme.space[1] }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={theme.colors.inkMuted}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        style={[
          theme.text.body,
          {
            color: theme.colors.ink,
            minHeight: multiline ? 112 : 52,
            paddingHorizontal: theme.space[4],
            paddingVertical: theme.space[2] + theme.space[1],
            borderRadius: theme.radius.sm,
            borderWidth: focused ? 2 : 1,
            borderColor: error ? theme.colors.danger : focused ? theme.colors.brand : theme.colors.inkMuted,
            backgroundColor: theme.colors.surfaceRaised,
            // Typed text follows its own language: Arabic right to left, French left to right.
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="inkMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
