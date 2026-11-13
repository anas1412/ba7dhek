import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
};

/** Pick one from a short list. Used where a dropdown would hide the choices. */
export function ChoiceChips<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[2] }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: theme.space[4],
                borderRadius: theme.radius.full,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? theme.colors.brand : theme.colors.inkMuted,
                backgroundColor: selected ? theme.colors.brandSoft : theme.colors.surfaceRaised,
              }}>
              <AppText variant={selected ? 'bodyStrong' : 'body'}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
