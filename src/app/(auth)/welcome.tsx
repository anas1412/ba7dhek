import { useSignInWithGoogle } from '@clerk/expo/google';
import { useConvexAuth } from 'convex/react';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (isAuthenticated) return <Redirect href="/" />;

  async function signInWithGoogle() {
    setBusy(true);
    setFailed(false);
    try {
      const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();
      // No session means the person closed the Google sheet; that is not an error.
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
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
