import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useImageUpload } from '@/features/images/useImageUpload';
import { useTheme } from '@/theme';

/** The employer's business: its logo today, its other details as they become editable. */
export default function Business() {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const company = useQuery(api.companies.mine);
  const setLogo = useMutation(api.companies.setLogo);
  const removeLogo = useMutation(api.companies.removeLogo);
  const [removing, setRemoving] = useState(false);
  const { busy: uploading, pickAndUpload } = useImageUpload((storageId) => setLogo({ storageId }), {
    square: true,
    doneKey: 'logo.changed',
  });

  async function remove() {
    setRemoving(true);
    try {
      await removeLogo();
      toast.show(t('logo.removed'), 'info');
    } catch {
      toast.show(t('images.failed'), 'error');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Screen scroll underHeader>
      {company ? <AppText variant="display">{company.name}</AppText> : <Skeleton width="70%" height={36} />}

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('logo.title')}</AppText>
        <AppText color="inkMuted">{t('logo.body')}</AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: theme.radius.lg,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.line,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          {company?.logoUrl ? (
            <Image source={{ uri: company.logoUrl }} style={{ width: 96, height: 96 }} contentFit="cover" transition={200} />
          ) : (
            <Icon name="briefcase" size={28} color="inkMuted" />
          )}
        </View>
        <View style={{ flex: 1, gap: theme.space[2] }}>
          <Button
            label={t(company?.logoUrl ? 'logo.change' : 'logo.add')}
            variant="neutral"
            loading={uploading}
            disabled={!company || removing}
            onPress={pickAndUpload}
          />
          {company?.logoUrl ? (
            <Button label={t('logo.remove')} variant="danger" loading={removing} disabled={uploading} onPress={remove} />
          ) : null}
        </View>
      </View>

      <AppText variant="caption" color="inkMuted">
        {t('images.shrinkNote')}
      </AppText>
    </Screen>
  );
}
