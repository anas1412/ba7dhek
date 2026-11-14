import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { ImageGrid, type GridImage } from '@/features/images/ImageGrid';
import { useImageUpload } from '@/features/images/useImageUpload';
import { useTheme } from '@/theme';

const MAX_IMAGES = 4;

/** The photos of one job offer: up to four, the first at the top of the card. */
export default function JobPhotos() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { jobId: jobIdParam } = useLocalSearchParams<{ jobId: string }>();
  const jobId = jobIdParam as Id<'jobs'>;
  const job = useQuery(api.jobs.mineOne, { jobId });
  const addImage = useMutation(api.jobs.addImage);
  const removeImage = useMutation(api.jobs.removeImage);
  const setMainImage = useMutation(api.jobs.setMainImage);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { busy: adding, pickAndUpload } = useImageUpload((storageId) => addImage({ jobId, storageId }));

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
    <Screen
      scroll
      underHeader
      footer={<Button label={t('images.done')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}>
      <View style={{ gap: theme.space[1] }}>
        <AppText variant="display">{t('images.title')}</AppText>
        {job ? <AppText variant="bodyStrong">{job.title}</AppText> : <Skeleton width="60%" height={22} />}
      </View>
      <AppText color="inkMuted">{t('images.body')}</AppText>

      {job ? (
        <ImageGrid
          images={job.images}
          max={MAX_IMAGES}
          adding={adding}
          busyId={busyId}
          onAdd={pickAndUpload}
          onRemove={(image) =>
            act(image, () => removeImage({ jobId, storageId: image.id as Id<'_storage'> }), 'images.removed')
          }
          onMakeMain={(image) =>
            act(image, () => setMainImage({ jobId, storageId: image.id as Id<'_storage'> }), 'images.mainChanged')
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
