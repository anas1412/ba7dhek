import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { openAuthSessionAsync } from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

// Where Google's sign-in hands control back to the app: "ba7dhek://".
// convex/auth.ts only accepts addresses that start with the app's scheme.
const redirectTo = Linking.createURL('/');

export default function Welcome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (isAuthenticated) return <Redirect href="/" />;

  async function signInWithGoogle() {
    setBusy(true);
    setFailed(false);
    try {
      if (Platform.OS === 'web') {
        // In a browser the whole page goes to Google and comes back; the auth
        // provider finishes the sign-in when the page reloads. Development only:
        // the backend refuses this address unless DEV_WEB_ORIGIN allows it.
        await signIn('google', { redirectTo: window.location.origin });
        return;
      }

      // Step 1: ask the backend where to send the person to sign in.
      const { redirect } = await signIn('google', { redirectTo });
      if (!redirect) throw new Error('No sign-in address returned');

      // Step 2: open Google in an in-app browser and wait for it to come back.
      const result = await openAuthSessionAsync(redirect.toString(), redirectTo);
      // Anything but "success" means the person closed the browser; that is not an error.
      if (result.type !== 'success') return;

      // Step 3: trade the one-time code for a session.
      const code = Linking.parse(result.url).queryParams?.code;
      if (typeof code !== 'string') throw new Error('No code in the sign-in result');
      await signIn('google', { code });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // iOS will also need "Continue with Apple" here before it can ship:
  // see docs/02-architecture/auth.md.
  return (
    <Screen
      footer={
        <>
          {failed ? (
            <AppText variant="caption" color="danger" center>
              {t('welcome.failed')}
            </AppText>
          ) : null}
          <Button label={t('welcome.google')} loading={busy} onPress={signInWithGoogle} />
        </>
      }>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[2] }}>
        <AppText variant="display">{t('common.appName')}</AppText>
        <AppText variant="title" color="brand">
          {t('welcome.tagline')}
        </AppText>
        <AppText color="inkMuted">{t('welcome.pitch')}</AppText>
      </View>
    </Screen>
  );
}
