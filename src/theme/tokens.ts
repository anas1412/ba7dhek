// Material 3 tokens. Mirrors docs/06-design/tokens.json; change the design system first, then this file.
//
// The colours are the Material 3 scheme generated from the brand blue #1557B8
// with Google's material-color-utilities 0.4.0 (2026-11-14). The amber is a
// "custom colour" harmonised with that scheme. The names on the left are the
// app's own; the comment beside each gives the Material role it holds.

export type ColorTokens = {
  /** surface: the page. */
  surface: string;
  /** surface container low: cards and fields that sit on the page. */
  surfaceRaised: string;
  /** surface container: the navigation bar and bars that stay in place. */
  surfaceContainer: string;
  /** surface container high: a quieter filled control, such as the other side's chat bubble. */
  surfaceContainerHigh: string;
  /** on surface: main text. */
  ink: string;
  /** on surface variant: secondary text and icons. */
  inkMuted: string;
  /** outline: the border of a control. */
  outline: string;
  /** outline variant: dividers and the border of a card or an unselected chip. */
  line: string;
  /** primary. */
  brand: string;
  /** on primary. */
  onBrand: string;
  /** secondary container: a selected chip, the active tab, a soft panel. */
  brandSoft: string;
  /** on secondary container. */
  onBrandSoft: string;
  /** primary container: the main floating action. */
  brandContainer: string;
  /** on primary container. */
  onBrandContainer: string;
  /** The amber, as a container. Distance, and only distance. */
  near: string;
  onNear: string;
  /** Not a Material role: Material has no "success". Kept for accepted and saved states. */
  success: string;
  /** error. */
  danger: string;
  /** Chart marks. Not a Material role: Material's dark primary is too grey for a data mark. */
  chart: string;
  /** inverse surface and inverse on surface: the snackbar. */
  inverseSurface: string;
  onInverseSurface: string;
};

export const lightColors: ColorTokens = {
  surface: '#FAF8FD',
  surfaceRaised: '#F5F3F7',
  surfaceContainer: '#EFEDF1',
  surfaceContainerHigh: '#E9E7EC',
  ink: '#1B1B1F',
  inkMuted: '#44474F',
  outline: '#757780',
  line: '#C5C6D0',
  brand: '#1C5BBC',
  onBrand: '#FFFFFF',
  brandSoft: '#DBE2F9',
  onBrandSoft: '#141B2C',
  brandContainer: '#D8E2FF',
  onBrandContainer: '#001A43',
  near: '#FFDDB5',
  onNear: '#2A1800',
  success: '#0E7A4B',
  danger: '#BA1A1A',
  chart: '#1C5BBC',
  inverseSurface: '#303034',
  onInverseSurface: '#F2F0F4',
};

export const darkColors: ColorTokens = {
  surface: '#121316',
  surfaceRaised: '#1B1B1F',
  surfaceContainer: '#1F1F23',
  surfaceContainerHigh: '#292A2D',
  ink: '#E3E2E6',
  inkMuted: '#C5C6D0',
  outline: '#8E9099',
  line: '#44474F',
  brand: '#AEC6FF',
  onBrand: '#002E6B',
  brandSoft: '#3F4759',
  onBrandSoft: '#DBE2F9',
  brandContainer: '#004397',
  onBrandContainer: '#D8E2FF',
  near: '#643F00',
  onNear: '#FFDDB5',
  success: '#4FD197',
  danger: '#FFB4AB',
  chart: '#5590F5',
  inverseSurface: '#E3E2E6',
  onInverseSurface: '#303034',
};

export const space = { 1: 4, 2: 8, 4: 16, 6: 24 } as const;

// Material 3 shape scale: extra small, small, medium, large, extra large, full.
// xs: text fields. sm: chips. md: cards. lg: floating action buttons. xl: sheets and the photo carousel.
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 999 } as const;

// One family for Arabic and Latin script, which Roboto is not. Material allows a
// brand typeface; the sizes, line heights and weights below are Material's own.
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
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }
> = {
  // headline medium
  display: { fontFamily: fontFamily.regular, fontSize: 28, lineHeight: 36 },
  // title large
  title: { fontFamily: fontFamily.regular, fontSize: 22, lineHeight: 28 },
  // title medium
  heading: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  // body large
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  // body large, emphasised
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24 },
  // body small
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  // label large
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
};
