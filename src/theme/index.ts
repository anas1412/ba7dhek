import { useColorScheme } from 'react-native';

import { darkColors, lightColors, radius, space, textStyles, type ColorTokens } from './tokens';

export type Theme = {
  dark: boolean;
  colors: ColorTokens;
  space: typeof space;
  radius: typeof radius;
  text: typeof textStyles;
};

/** The active theme. Components read colours from here and never hold a literal colour. */
export function useTheme(): Theme {
  const dark = useColorScheme() === 'dark';
  return { dark, colors: dark ? darkColors : lightColors, space, radius, text: textStyles };
}

export { fontAssets } from './fonts';
export * from './tokens';
