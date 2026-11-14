export const LANGUAGES = ['ar', 'fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Used when nothing about the device points to one of the three languages. */
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

export type DeviceHints = {
  /** The device's languages, most preferred first: "fr", "en". */
  languageCodes: readonly (string | null)[];
  /** The device's regions: "TN", "FR". */
  regionCodes: readonly (string | null)[];
  /** The device's time zone: "Africa/Tunis". */
  timeZone: string | null;
};

/** Tunisia by region setting or by clock. Needs no location permission. */
export function isInTunisia(hints: DeviceHints): boolean {
  return hints.regionCodes.includes('TN') || hints.timeZone === 'Africa/Tunis';
}

/**
 * The language for a first launch.
 *
 * 1. The device or browser language, when it is one of the three.
 * 2. Otherwise Arabic (Tunisian dialect) for a device in Tunisia.
 * 3. Otherwise French.
 *
 * A person's own choice, once made, overrides all of this.
 */
export function pickLanguage(hints: DeviceHints): Language {
  for (const code of hints.languageCodes) {
    if (isLanguage(code)) return code;
  }
  return isInTunisia(hints) ? 'ar' : FALLBACK_LANGUAGE;
}
