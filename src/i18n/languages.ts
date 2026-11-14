export const LANGUAGES = ['ar', 'fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Used when the device is set to a language the app does not have. */
export const FALLBACK_LANGUAGE: Language = 'en';

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

/**
 * The language for a first launch: the device or browser language when it is
 * Arabic, French or English, and English otherwise. Where the device is plays
 * no part. A person's own choice, once made, overrides this.
 *
 * `languageCodes` is the device's list, most preferred first: "fr", "en".
 */
export function pickLanguage(languageCodes: readonly (string | null)[]): Language {
  for (const code of languageCodes) {
    if (isLanguage(code)) return code;
  }
  return FALLBACK_LANGUAGE;
}
