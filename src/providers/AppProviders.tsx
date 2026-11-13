import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false }) : null;

/** Clerk proves who the user is; Convex holds everything else. */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!clerkKey || !convex) {
    return <SetupNeeded missingClerk={!clerkKey} missingConvex={!convex} />;
  }
  return (
    <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

/** Shown instead of crashing when a build has no keys. Seen by developers only. */
function SetupNeeded({ missingClerk, missingConvex }: { missingClerk: boolean; missingConvex: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[4] }}>
        <AppText variant="title">{t('setup.title')}</AppText>
        <AppText color="inkMuted">{t('setup.body')}</AppText>
        {missingClerk ? <AppText color="danger">{t('setup.clerk')}</AppText> : null}
        {missingConvex ? <AppText color="danger">{t('setup.convex')}</AppText> : null}
      </View>
    </Screen>
  );
}
