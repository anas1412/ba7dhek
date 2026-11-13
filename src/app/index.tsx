import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components/Screen';
import { currentLanguage } from '@/i18n';
import { api } from '@convex/_generated/api';

/**
 * The gate. Every launch passes through here and is sent to the first step
 * the user has not completed: sign in, consent, role, then home.
 */
export default function Gate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  const ensure = useMutation(api.users.ensure);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Creates the user row on first sign-in and marks the user as seen after that.
    ensure({ language: currentLanguage() }).catch(() => {});
  }, [isAuthenticated, ensure]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  // `me` is null for a moment on first sign-in, until `ensure` has created the row.
  if (!me) return <LoadingScreen />;
  if (!me.hasConsented || me.needsNewConsent) return <Redirect href="/consent" />;
  if (!me.role) return <Redirect href="/role" />;
  // A candidate needs a starting point before the job stack can show anything.
  if (me.role === 'candidate' && !me.home) return <Redirect href="/setup/candidate" />;
  return <Redirect href="/home" />;
}
