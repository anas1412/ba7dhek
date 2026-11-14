import { Pressable, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type Option<T> = { value: T; label: string };

type ChipProps = {
  label: string;
  selected: boolean;
  role: 'radio' | 'checkbox';
  /** Outlines the chip in the error colour while nothing is chosen. */
  flagged?: boolean;
  onPress: () => void;
};

function ChoiceChip({ label, selected, role, flagged, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[1],
        paddingHorizontal: theme.space[4],
        borderRadius: theme.radius.full,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.brand : flagged ? theme.colors.danger : theme.colors.inkMuted,
        backgroundColor: selected || pressed ? theme.colors.brandSoft : theme.colors.surfaceRaised,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      {/* A tick as well as the colour, so "several can be chosen" is visible. */}
      {role === 'checkbox' && selected ? <Icon name="check" size={16} color="brand" /> : null}
      <AppText variant={selected ? 'bodyStrong' : 'body'}>{label}</AppText>
    </Pressable>
  );
}

type GroupProps = {
  label: string;
  hint?: string;
  error?: string;
  role: 'radiogroup' | 'none';
  children: React.ReactNode;
};

function ChipGroup({ label, hint, error, role, children }: GroupProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[2] }}>
      <View style={{ gap: theme.space[1] }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="inkMuted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View accessibilityRole={role} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        {children}
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type Props<T extends string | number> = {
  label: string;
  hint?: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Shown under the chips when a choice is required and none was made. */
  error?: string;
};

/** Pick one from a short list. Used where a dropdown would hide the choices. */
export function ChoiceChips<T extends string | number>({ label, hint, options, value, onChange, error }: Props<T>) {
  return (
    <ChipGroup label={label} hint={hint} error={error} role="radiogroup">
      {options.map((option) => (
        <ChoiceChip
          key={String(option.value)}
          label={option.label}
          role="radio"
          selected={option.value === value}
          flagged={Boolean(error)}
          onPress={() => onChange(option.value)}
        />
      ))}
    </ChipGroup>
  );
}

type MultiProps<T extends string | number> = {
  label: string;
  hint?: string;
  options: readonly Option<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
};

/** Pick any number from a short list. A tap adds a choice, a second tap removes it. */
export function MultiChoiceChips<T extends string | number>({ label, hint, options, values, onChange }: MultiProps<T>) {
  return (
    <ChipGroup label={label} hint={hint} role="none">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <ChoiceChip
            key={String(option.value)}
            label={option.label}
            role="checkbox"
            selected={selected}
            onPress={() =>
              onChange(selected ? values.filter((value) => value !== option.value) : [...values, option.value])
            }
          />
        );
      })}
    </ChipGroup>
  );
}
