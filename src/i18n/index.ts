import './polyfills';

import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
// `use` is renamed because the hooks lint rule treats any call named `use` as a React hook.
import i18n, { changeLanguage, use as registerPlugin } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { DevSettings, I18nManager, Platform } from 'react-native';

import { readPreference, writePreference } from '@/lib/storage';

import { isLanguage, isRtl, pickLanguage, type Language } from './languages';
import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const STORAGE_KEY = 'ba7dhek.language';
const isWeb = Platform.OS === 'web';

/** The language this device would get with no saved choice. */
function languageFromDevice(): Language {
  return pickLanguage(getLocales().map((locale) => locale.languageCode));
}

/**
 * Loads the saved language (or works one out from the device), starts i18next,
 * and sets the page direction on the web. Resolves to `false` when the app is
 * about to restart once to leave the phone's own right-to-left mode, in which
 * case the caller renders nothing.
 */
export async function initI18n(): Promise<boolean> {
  const stored = await readPreference(STORAGE_KEY);
  const language = isLanguage(stored) ? stored : languageFromDevice();

  await registerPlugin(initReactI18next).init({
    resources: {
      ar: { translation: ar },
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  setDocumentDirection(language);
  return await leaveNativeRtl();
}

/*
 * The layout direction follows the chosen language and changes while the app
 * runs: the root layout sets `direction` on the view that holds every screen,
 * and Expo Router's LocaleProvider turns headers, transitions and gestures.
 * The phone's own right-to-left switch is never used, because it only takes
 * effect after a restart; app.json turns it off (`supportsRTL: false`).
 */

/**
 * Builds made before the live switch may still have the phone's own switch on,
 * which would mirror the layout a second time. Turns it off and restarts once.
 * Returns `true` when no restart was needed.
 */
async function leaveNativeRtl(): Promise<boolean> {
  if (isWeb || !I18nManager.isRTL) return true;
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates cannot reload a development build; fall back to the dev reload.
    if (__DEV__) DevSettings.reload();
  }
  return false;
}

/** A browser page takes its direction and language from the document. */
function setDocumentDirection(language: Language) {
  if (!isWeb) return;
  const root = globalThis.document?.documentElement;
  if (root) {
    root.dir = isRtl(language) ? 'rtl' : 'ltr';
    root.lang = language;
  }
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

/** Whether the layout currently runs right to left. Outside React; components use `useLayoutDirection`. */
export function isLayoutRtl(): boolean {
  return isRtl(currentLanguage());
}

/** The layout direction for the current language, re-rendering when the language changes. */
export function useLayoutDirection(): 'rtl' | 'ltr' {
  const { i18n: instance } = useTranslation();
  return isLanguage(instance.language) && isRtl(instance.language) ? 'rtl' : 'ltr';
}

/** Switches language and remembers the choice, which then overrides the device rule. */
export async function setLanguage(next: Language): Promise<void> {
  await writePreference(STORAGE_KEY, next);
  await changeLanguage(next);
  setDocumentDirection(next);
}

export default i18n;
export * from './languages';
