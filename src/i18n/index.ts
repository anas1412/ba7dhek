import './polyfills';

import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
// `use` is renamed because the hooks lint rule treats any call named `use` as a React hook.
import i18n, { changeLanguage, use as registerPlugin } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager } from 'react-native';

import { isLanguage, isRtl, pickLanguage, type Language } from './languages';
import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const STORAGE_KEY = 'ba7dhek.language';

async function readStoredLanguage(): Promise<Language | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Loads the saved language (or the device's), starts i18next, and makes sure
 * the layout direction matches. Resolves to `false` when the app is about to
 * reload to apply a direction change, in which case the caller renders nothing.
 */
export async function initI18n(): Promise<boolean> {
  const stored = await readStoredLanguage();
  const language = stored ?? pickLanguage(getLocales().map((locale) => locale.languageCode));

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

  return await applyDirection(language);
}

/**
 * A direction change only takes effect after a restart, so the app reloads.
 * Returns `true` when no reload was needed.
 */
async function applyDirection(language: Language): Promise<boolean> {
  const wantRtl = isRtl(language);
  if (I18nManager.isRTL === wantRtl) return true;

  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates cannot reload a development build; fall back to the dev reload.
    if (__DEV__) DevSettings.reload();
  }
  return false;
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

/**
 * Switches language and remembers the choice. Switching to or from Arabic
 * reloads the app; `willReload` says so before it happens.
 */
export function willReload(next: Language): boolean {
  return isRtl(next) !== I18nManager.isRTL;
}

export async function setLanguage(next: Language): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, next);
  await changeLanguage(next);
  await applyDirection(next);
}

export default i18n;
export * from './languages';
