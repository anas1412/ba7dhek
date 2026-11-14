import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { currentLanguage } from '@/i18n';
import { formatDistance, formatPay, formatRelativeTime, type PayPeriod } from '@/lib/format';
import { useTheme } from '@/theme';

export type JobCardData = {
  _id: string;
  title: string;
  description: string;
  category: string;
  contractType: string;
  payAmount: number;
  payPeriod: PayPeriod;
  publishedAt: number;
  distanceM: number;
  companyName: string;
  /** The business's logo, when it has one. */
  companyLogoUrl?: string | null;
  /** The job's photos, main one first. */
  imageUrls?: string[];
};

/**
 * The card is the product, so its order is fixed: distance, title, pay,
 * company, contract and category, time since posting, then the description.
 * See docs/06-design/design-system.md.
 */
export function JobCard({ job, now }: { job: JobCardData; now: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const mainPhoto = job.imageUrls?.[0];
  const photoCount = job.imageUrls?.length ?? 0;

  return (
    <View
      style={{
        flex: 1,
        padding: theme.space[6],
        gap: theme.space[4],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.surfaceRaised,
      }}>
      {mainPhoto ? (
        <View style={{ height: 132, borderRadius: theme.radius.sm, overflow: 'hidden', backgroundColor: theme.colors.line }}>
          <Image source={{ uri: mainPhoto }} style={{ flex: 1 }} contentFit="cover" transition={200} />
          {photoCount > 1 ? (
            <View
              style={{
                position: 'absolute',
                bottom: theme.space[2],
                end: theme.space[2],
                paddingHorizontal: theme.space[2],
                paddingVertical: theme.space[1],
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.surfaceRaised,
              }}>
              <AppText variant="label">{t('images.photosCount', { count: photoCount })}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      <Chip
        variant="near"
        large
        icon="map-pin"
        label={t('distance.fromYou', { distance: formatDistance(job.distanceM, language, t) })}
      />

      <View style={{ gap: theme.space[1] }}>
        <AppText variant={mainPhoto ? 'title' : 'display'} numberOfLines={mainPhoto ? 2 : 3}>
          {job.title}
        </AppText>
        <AppText variant="title" color="brand">
          {formatPay(job.payAmount, job.payPeriod, language, t)}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
        {job.companyLogoUrl ? (
          <Image
            source={{ uri: job.companyLogoUrl }}
            style={{ width: 40, height: 40, borderRadius: theme.radius.sm, backgroundColor: theme.colors.line }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Icon name="briefcase" size={20} color="inkMuted" />
        )}
        <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
          {job.companyName}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <Chip label={t(`contracts.${job.contractType}`)} />
        <Chip label={t(`categories.${job.category}`)} />
      </View>

      {/* Takes the spare height, so the posting time always sits at the bottom of the card. */}
      <View style={{ flex: 1 }}>
        {job.description ? (
          // Written by the employer, in whatever language they used; shown as written.
          <AppText color="inkMuted" numberOfLines={mainPhoto ? 2 : 3}>
            {job.description}
          </AppText>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1] }}>
        <Icon name="clock" size={16} color="inkMuted" />
        <AppText variant="caption" color="inkMuted">
          {t('jobs.posted', { time: formatRelativeTime(job.publishedAt, now, language) })}
        </AppText>
      </View>
    </View>
  );
}
