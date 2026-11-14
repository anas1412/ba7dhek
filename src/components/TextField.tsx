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

/**
 * A Material 3 outlined text field: 56 high, corners of 4, the label sitting
 * on the outline. The label stays there whether the field is empty or not, so
 * it never trades places with the placeholder; placeholders are only examples.
 */
export function TextField({ label, hint, error, multiline, ...rest }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const accent = error ? theme.colors.danger : focused ? theme.colors.brand : theme.colors.outline;

  return (
    <View style={{ gap: theme.space[1], paddingTop: theme.space[2] }}>
      <View>
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
              minHeight: multiline ? 112 : 56,
              paddingHorizontal: theme.space[4],
              paddingVertical: theme.space[4],
              borderRadius: theme.radius.xs,
              // The outline thickens on focus; the padding gives the pixel back so nothing shifts.
              borderWidth: focused || error ? 2 : 1,
              margin: focused || error ? 0 : 1,
              borderColor: accent,
              // Typed text follows its own language: Arabic right to left, French left to right.
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -8,
            start: theme.space[2] + theme.space[1],
            paddingHorizontal: theme.space[1],
            // The page colour behind the label is what interrupts the outline.
            backgroundColor: theme.colors.surface,
          }}>
          <AppText variant="caption" style={{ color: accent }}>
            {label}
          </AppText>
        </View>
      </View>
      {error ? (
        <AppText variant="caption" color="danger" style={{ paddingHorizontal: theme.space[4] }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="inkMuted" style={{ paddingHorizontal: theme.space[4] }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
