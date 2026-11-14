import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

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
  openings?: number;
  startsNow?: boolean;
  benefits?: string[];
};

/** How many benefits fit on the card before the rest are left to the detail screen. */
const CARD_BENEFITS = 2;

/**
 * The card is the product, so its order is fixed: distance, title, pay,
 * company, contract and category, time since posting, then the description.
 * See docs/06-design/design-system.md.
 */
export function JobCard({ job, now, onOpen }: { job: JobCardData; now: number; onOpen?: () => void }) {
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
        {job.startsNow ? <Chip icon="zap" label={t('detail.startsNow')} /> : null}
        {job.openings && job.openings > 1 ? (
          <Chip icon="users" label={t('detail.openings', { count: job.openings })} />
        ) : null}
        {/* A photo takes the room the benefits would use; they are on the detail screen either way. */}
        {(mainPhoto ? [] : (job.benefits ?? [])).slice(0, CARD_BENEFITS).map((value) => (
          <Chip key={value} label={t(`benefits.${value}`)} />
        ))}
      </View>

      {/* Takes the spare height, so the posting time always sits at the bottom of the card. */}
      {/* Clipped, so on a short screen the description gives way rather than running over the row below. */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {job.description ? (
          // Written by the employer, in whatever language they used; shown as written.
          <AppText color="inkMuted" numberOfLines={mainPhoto ? 2 : 3}>
            {job.description}
          </AppText>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1] }}>
        <Icon name="clock" size={16} color="inkMuted" />
        <AppText variant="caption" color="inkMuted" style={{ flex: 1 }}>
          {t('jobs.posted', { time: formatRelativeTime(job.publishedAt, now, language) })}
        </AppText>
        {onOpen ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={onOpen}
            style={({ pressed }) => ({
              minHeight: 36,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space[1],
              paddingHorizontal: theme.space[2] + theme.space[1],
              borderRadius: theme.radius.full,
              borderWidth: 1,
              borderColor: theme.colors.inkMuted,
              backgroundColor: pressed ? theme.colors.brandSoft : theme.colors.surfaceRaised,
            })}>
            <AppText variant="label">{t('detail.open')}</AppText>
            <Icon name="chevron-right" size={16} directional />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
