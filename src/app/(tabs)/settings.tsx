import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { PhotoEditor } from '@/features/images/PhotoEditor';
import { useImageUpload } from '@/features/images/useImageUpload';
import { LANGUAGES, currentLanguage, setLanguage, willReload, type Language } from '@/i18n';
import { useTheme } from '@/theme';

export default function Settings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me);
  const saveLanguage = useMutation(api.users.setLanguage);

  const active = currentLanguage();
  // Set when the chosen language flips the layout and needs the user's go-ahead to reload.
  const [pending, setPending] = useState<Language | null>(null);
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

  async function apply(language: Language) {
    setBusy(true);
    try {
      // The server keeps the language so push notifications arrive in it.
      await saveLanguage({ language }).catch(() => {});
      await setLanguage(language);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function choose(language: Language) {
    if (language === active) return;
    if (willReload(language)) setPending(language);
    else void apply(language);
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

        {pending ? (
          <View
            style={{
              gap: theme.space[2],
              padding: theme.space[4],
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.brandSoft,
            }}>
            <AppText variant="bodyStrong">{t('settings.reloadTitle')}</AppText>
            <AppText>{t('settings.reloadBody')}</AppText>
            <Button label={t('settings.reload')} loading={busy} onPress={() => apply(pending)} />
            <Button label={t('common.cancel')} variant="neutral" onPress={() => setPending(null)} />
          </View>
        ) : null}
      </View>

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('settings.account')}</AppText>
        {me?.name ? <AppText color="inkMuted">{me.name}</AppText> : null}
        <Button label={t('settings.signOut')} variant="neutral" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}
