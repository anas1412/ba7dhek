import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { LANGUAGES, currentLanguage, setLanguage, type Language } from '@/i18n';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  /** Called after the language has changed, for anything the screen must also do (save it to the account). */
  onChanged?: (language: Language) => void;
};

/**
 * Three languages side by side, each named in its own language so it can be
 * found by someone who cannot read the current one. On a phone, switching to or
 * from Arabic reloads the app to flip the layout.
 */
export function LanguageSwitch({ onChanged }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const active = currentLanguage();
  const [busy, setBusy] = useState(false);

  async function choose(language: Language) {
    if (language === active || busy) return;
    setBusy(true);
    try {
      await setLanguage(language);
      onChanged?.(language);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        alignSelf: 'center',
        // A Material 3 segmented button: one outline around the set, a divider between segments.
        // It keeps the same left-to-right order in every language, like a row of flags would.
        direction: 'ltr',
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.outline,
        overflow: 'hidden',
      }}>
      {LANGUAGES.map((language, index) => {
        const selected = language === active;
        return (
          <Pressable
            key={language}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: busy }}
            onPress={() => choose(language)}
            style={({ pressed }) => ({
              minHeight: 40,
              justifyContent: 'center',
              paddingHorizontal: theme.space[4],
              borderStartWidth: index === 0 ? 0 : 1,
              borderStartColor: theme.colors.outline,
              backgroundColor: selected ? theme.colors.brandSoft : pressed ? theme.colors.surfaceContainerHigh : 'transparent',
            })}>
            <AppText variant="label" color={selected ? 'onBrandSoft' : 'ink'}>
              {t(`languages.${language}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
