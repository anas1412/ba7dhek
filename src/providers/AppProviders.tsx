import { ConvexAuthProvider, type TokenStorage } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false }) : null;

// Session tokens are kept in the device's encrypted store, so a person stays
// signed in between launches. The web build falls back to the browser's storage.
const secureStorage: TokenStorage | undefined =
  Platform.OS === 'web'
    ? undefined
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      };

/** Convex holds the data and signs people in itself, through Convex Auth. */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!convex) return <SetupNeeded />;
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      {children}
    </ConvexAuthProvider>
  );
}

/** Shown instead of crashing when a build has no backend address. Seen by developers only. */
function SetupNeeded() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[4] }}>
        <AppText variant="title">{t('setup.title')}</AppText>
        <AppText color="inkMuted">{t('setup.body')}</AppText>
        <AppText color="danger">{t('setup.convex')}</AppText>
      </View>
    </Screen>
  );
}
