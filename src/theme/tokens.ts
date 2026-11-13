// Mirrors docs/06-design/tokens.json. Change the design system first, then this file.

export type ColorTokens = {
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkMuted: string;
  line: string;
  brand: string;
  onBrand: string;
  brandSoft: string;
  near: string;
  onNear: string;
  success: string;
  danger: string;
};

export const lightColors: ColorTokens = {
  surface: '#F7F9FC',
  surfaceRaised: '#FFFFFF',
  ink: '#14202E',
  inkMuted: '#51607A',
  line: '#D5DCE6',
  brand: '#1557B8',
  onBrand: '#FFFFFF',
  brandSoft: '#DCE8FA',
  near: '#FFD166',
  onNear: '#14202E',
  success: '#0E7A4B',
  danger: '#B3261E',
};

export const darkColors: ColorTokens = {
  surface: '#0F141B',
  surfaceRaised: '#18202B',
  ink: '#EEF2F7',
  inkMuted: '#A3B0C2',
  line: '#2A3545',
  brand: '#6EA8FF',
  onBrand: '#0B1626',
  brandSoft: '#1B2C47',
  near: '#FFD166',
  onNear: '#14202E',
  success: '#4FD197',
  danger: '#FF8A80',
};

export const space = { 1: 4, 2: 8, 4: 16, 6: 24 } as const;

export const radius = { sm: 8, lg: 24, full: 999 } as const;

// One family for Arabic and Latin script. The names are the keys the font
// files are registered under in src/theme/fonts.ts.
export const fontFamily = {
  regular: 'ReadexPro_400Regular',
  medium: 'ReadexPro_500Medium',
  semibold: 'ReadexPro_600SemiBold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label';

export const textStyles: Record<
  TextVariant,
  { fontFamily: string; fontSize: number; lineHeight: number }
> = {
  display: { fontFamily: fontFamily.semibold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 30 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 20 },
  label: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
};
