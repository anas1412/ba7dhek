import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initI18n } from '@/i18n';
import { AppProviders } from '@/providers/AppProviders';
import { fontAssets, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // null: still starting. false: the app is reloading to flip the layout direction.
  const [i18nReady, setI18nReady] = useState<boolean | null>(null);

  useEffect(() => {
    initI18n().then(setI18nReady, () => setI18nReady(true));
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && i18nReady === true;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <AppProviders>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.surface },
        }}
      />
    </AppProviders>
  );
}
