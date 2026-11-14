import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { ImageGrid, type GridImage } from '@/features/images/ImageGrid';
import { useImageUpload } from '@/features/images/useImageUpload';
import { useTheme } from '@/theme';

const MAX_IMAGES = 4;

/** The employer's business: its photos today, its other details as they become editable. */
export default function Business() {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const company = useQuery(api.companies.mine);
  const addImage = useMutation(api.companies.addImage);
  const removeImage = useMutation(api.companies.removeImage);
  const setMainImage = useMutation(api.companies.setMainImage);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { busy: adding, pickAndUpload } = useImageUpload((storageId) => addImage({ storageId }));

  async function act(image: GridImage, action: () => Promise<unknown>, doneKey: string) {
    setBusyId(image.id);
    try {
      await action();
      toast.show(t(doneKey), 'info');
    } catch {
      toast.show(t('images.failed'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll underHeader>
      <AppText variant="display">{company?.name ?? t('employer.business')}</AppText>

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('images.title')}</AppText>
        <AppText color="inkMuted">{t('images.body')}</AppText>
      </View>

      {company ? (
        <ImageGrid
          images={company.images}
          max={MAX_IMAGES}
          adding={adding}
          busyId={busyId}
          onAdd={pickAndUpload}
          onRemove={(image) =>
            act(image, () => removeImage({ storageId: image.id as Id<'_storage'> }), 'images.removed')
          }
          onMakeMain={(image) =>
            act(image, () => setMainImage({ storageId: image.id as Id<'_storage'> }), 'images.mainChanged')
          }
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.space[4] }}>
          <Skeleton width="47%" height={150} />
          <Skeleton width="47%" height={150} />
        </View>
      )}

      <AppText variant="caption" color="inkMuted">
        {t('images.shrinkNote')}
      </AppText>
    </Screen>
  );
}
