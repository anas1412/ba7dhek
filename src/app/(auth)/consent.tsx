import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

/**
 * Express consent, recorded before any profile data is entered. Nothing is
 * pre-ticked. See docs/04-launch/data-protection.md.
 */
export default function Consent() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const acceptConsent = useMutation(api.users.acceptConsent);

  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [declined, setDeclined] = useState(false);

  async function accept() {
    setBusy(true);
    setFailed(false);
    try {
      await acceptConsent({ adult });
      router.replace('/');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (declined) {
    return (
      <Screen
        footer={
          <>
            <Button label={t('consent.back')} onPress={() => setDeclined(false)} />
            <Button label={t('settings.signOut')} variant="neutral" onPress={() => signOut()} />
          </>
        }>
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[4] }}>
          <AppText variant="title">{t('consent.declinedTitle')}</AppText>
          <AppText color="inkMuted">{t('consent.declinedBody')}</AppText>
        </View>
      </Screen>
    );
  }

  const sections = [
    ['consent.collectTitle', 'consent.collect'],
    ['consent.shareTitle', 'consent.share'],
    ['consent.whereTitle', 'consent.where'],
    ['consent.rightsTitle', 'consent.rights'],
  ] as const;

  return (
    <Screen
      scroll
      footer={
        <>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: adult }}
            onPress={() => setAdult((value) => !value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space[2],
              paddingVertical: theme.space[2],
            }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: theme.radius.sm,
                borderWidth: 2,
                borderColor: adult ? theme.colors.brand : theme.colors.inkMuted,
                backgroundColor: adult ? theme.colors.brand : theme.colors.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {adult ? (
                <AppText variant="label" color="onBrand">
                  ✓
                </AppText>
              ) : null}
            </View>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {t('consent.adult')}
            </AppText>
          </Pressable>
          {failed ? (
            <AppText variant="caption" color="danger" center>
              {t('consent.failed')}
            </AppText>
          ) : null}
          <Button label={t('consent.accept')} disabled={!adult} loading={busy} onPress={accept} />
          <Button label={t('consent.decline')} variant="neutral" onPress={() => setDeclined(true)} />
        </>
      }>
      <AppText variant="display">{t('consent.title')}</AppText>
      <AppText color="inkMuted">{t('consent.intro')}</AppText>
      {sections.map(([title, body]) => (
        <View key={title} style={{ gap: theme.space[1] }}>
          <AppText variant="heading">{t(title)}</AppText>
          <AppText>{t(body)}</AppText>
        </View>
      ))}
    </Screen>
  );
}
