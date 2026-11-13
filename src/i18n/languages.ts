export const LANGUAGES = ['ar', 'fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Used when the device language is none of the three. */
export const FALLBACK_LANGUAGE: Language = 'fr';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isRtl(language: Language): boolean {
  return language === 'ar';
}

/**
 * The locale handed to Intl formatters. Arabic is pinned to Tunisia with
 * Western digits, whatever the device's own locale data says.
 */
export function formatLocale(language: Language): string {
  switch (language) {
    case 'ar':
      return 'ar-TN-u-nu-latn';
    case 'fr':
      return 'fr-TN';
    case 'en':
      return 'en-GB';
  }
}

/** Picks the first device language that the app supports. */
export function pickLanguage(deviceLanguageCodes: readonly (string | null)[]): Language {
  for (const code of deviceLanguageCodes) {
    if (isLanguage(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}
