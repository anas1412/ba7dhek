import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppHeader } from '@/components/AppHeader';
import { initI18n } from '@/i18n';
import { AppProviders } from '@/providers/AppProviders';
import { fontAssets, useTheme } from '@/theme';

// Expo Router shows this in place of any screen that throws.
export { CrashScreen as ErrorBoundary } from '@/components/CrashScreen';

SplashScreen.preventAutoHideAsync();

// Screens the person cannot leave by going back: the gate, the tabs, and the
// steps every new account must complete.
const noHeader = { headerShown: false } as const;
// Forms slide up as a sheet and are dismissed with a cross.
const sheet = { presentation: 'modal', header: () => <AppHeader kind="close" /> } as const;

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
    // Needed once at the root for swipe gestures to work anywhere in the app.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            // Every other screen gets a bar with a way back.
            header: () => <AppHeader kind="back" />,
            contentStyle: { backgroundColor: theme.colors.surface },
          }}>
          <Stack.Screen name="index" options={noHeader} />
          <Stack.Screen name="(tabs)" options={noHeader} />
          <Stack.Screen name="(auth)/welcome" options={noHeader} />
          <Stack.Screen name="(auth)/consent" options={noHeader} />
          <Stack.Screen name="(auth)/role" options={noHeader} />
          <Stack.Screen name="setup/candidate" options={noHeader} />
          <Stack.Screen name="setup/company" options={sheet} />
          <Stack.Screen name="job/new" options={sheet} />
          {/* A conversation draws its own bar: who it is with, and a menu. */}
          <Stack.Screen name="chat/[matchId]" options={noHeader} />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
