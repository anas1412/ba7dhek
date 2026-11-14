import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { DeleteAccount } from '@/features/account/DeleteAccount';
import { PhotoEditor } from '@/features/images/PhotoEditor';
import { NotificationSettings } from '@/features/push/NotificationSettings';
import { useImageUpload } from '@/features/images/useImageUpload';
import { LANGUAGES, currentLanguage, setLanguage, type Language } from '@/i18n';
import { useTheme } from '@/theme';

export default function Settings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const me = useQuery(api.users.me);
  const saveLanguage = useMutation(api.users.setLanguage);
  const unregisterPush = useMutation(api.push.unregister);
  const deleteAccount = useMutation(api.account.remove);

  const active = currentLanguage();
  const [busy, setBusy] = useState(false);

  const toast = useToast();
  const setPhoto = useMutation(api.users.setPhoto);
  const removePhoto = useMutation(api.users.removePhoto);
  const restoreAccountPhoto = useMutation(api.users.useAccountPhoto);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { busy: uploading, pickAndUpload } = useImageUpload((storageId) => setPhoto({ storageId }), {
    square: true,
    doneKey: 'photo.changed',
  });

  async function changePhoto(action: () => Promise<unknown>, doneKey: string) {
    setPhotoBusy(true);
    try {
      await action();
      toast.show(t(doneKey), 'info');
    } catch {
      toast.show(t('images.failed'), 'error');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function choose(language: Language) {
    if (language === active) return;
    setBusy(true);
    try {
      // The server keeps the language so push notifications arrive in it.
      await saveLanguage({ language }).catch(() => {});
      await setLanguage(language);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <AppText variant="display">{t('settings.title')}</AppText>

      {me?.role === 'candidate' ? (
        <View style={{ gap: theme.space[2] }}>
          <AppText variant="heading">{t('photo.title')}</AppText>
          <PhotoEditor
            photoUrl={me.photoUrl}
            hasOwnPhoto={me.hasOwnPhoto}
            busy={photoBusy || uploading}
            onChange={pickAndUpload}
            onRemove={() => changePhoto(() => removePhoto(), 'photo.removed')}
            onUseAccountPhoto={() => changePhoto(() => restoreAccountPhoto(), 'photo.restored')}
          />
        </View>
      ) : null}

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('settings.language')}</AppText>
        <View
          accessibilityRole="radiogroup"
          style={{
            borderRadius: theme.radius.sm,
            borderWidth: 1,
            borderColor: theme.colors.line,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          {LANGUAGES.map((language, index) => {
            const selected = language === active;
            return (
              <Pressable
                key={language}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: busy }}
                disabled={busy}
                onPress={() => choose(language)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: theme.space[4],
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: theme.colors.line,
                  backgroundColor: selected ? theme.colors.brandSoft : 'transparent',
                }}>
                <AppText variant={selected ? 'bodyStrong' : 'body'}>
                  {t(`languages.${language}`)}
                </AppText>
                {selected ? (
                  <AppText variant="bodyStrong" color="brand">
                    ✓
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {me?.staffRole ? <Button label={t('admin.title')} variant="neutral" onPress={() => router.push('/admin')} /> : null}

      {me?.role ? <NotificationSettings role={me.role} newJobs={me.notifyNewJobs ?? 'all'} /> : null}

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('settings.account')}</AppText>
        {me?.name ? <AppText color="inkMuted">{me.name}</AppText> : null}
        <Button
          label={t('settings.signOut')}
          variant="neutral"
          onPress={async () => {
            // First, so this phone stops receiving this person's notifications. Signing out goes ahead either way.
            await unregisterPush().catch(() => {});
            await signOut();
          }}
        />
        <DeleteAccount
          role={me?.role ?? null}
          onDelete={async () => {
            await deleteAccount();
            // The account is gone, so its session is too; this clears what the phone still holds.
            await signOut().catch(() => {});
          }}
        />
      </View>
    </Screen>
  );
}
