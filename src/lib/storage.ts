import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Small preferences (language, whether the intro was seen). The phone keeps
// them in its encrypted store; the browser build, used in development, keeps
// them in the browser's own storage.

const isWeb = Platform.OS === 'web';

export async function readPreference(key: string): Promise<string | null> {
  try {
    return isWeb ? (globalThis.localStorage?.getItem(key) ?? null) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writePreference(key: string, value: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A preference that cannot be saved is not worth interrupting anyone for.
  }
}
