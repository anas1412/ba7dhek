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
        padding: theme.space[1],
        gap: theme.space[1],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.surfaceRaised,
      }}>
      {LANGUAGES.map((language) => {
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
              borderRadius: theme.radius.full,
              backgroundColor: selected ? theme.colors.brand : 'transparent',
              opacity: pressed && !selected ? 0.6 : 1,
            })}>
            <AppText variant="bodyStrong" color={selected ? 'onBrand' : 'ink'}>
              {t(`languages.${language}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
