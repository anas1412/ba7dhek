import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon, type IconName } from '@/components/Icon';
import { currentLanguage } from '@/i18n';
import { formatDistance, formatPay, formatRelativeTime, type PayPeriod } from '@/lib/format';
import { useTheme } from '@/theme';

export type JobDetailData = {
  title: string;
  description: string;
  category: string;
  contractType: string;
  payAmount: number;
  payPeriod: PayPeriod;
  status: 'draft' | 'open' | 'closed';
  publishedAt: number;
  openings: number;
  startsNow: boolean;
  workingTimes: string[];
  daysPerWeek: number | null;
  benefits: string[];
  experience: string | null;
  languages: string[];
  /** Where the work is. Public by nature: it is the employer's place. */
  location: { latitude: number; longitude: number };
  imageUrls: string[];
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string | null;
  /** From the reader's own starting point; null for the employer. */
  distanceM: number | null;
};

function Fact({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
      <View style={{ paddingTop: 2 }}>
        <Icon name={icon} size={20} color="inkMuted" />
      </View>
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <AppText variant="caption" color="inkMuted">
          {label}
        </AppText>
        {children}
      </View>
    </View>
  );
}

function Chips({ labels }: { labels: string[] }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
      {labels.map((label) => (
        <Chip key={label} label={label} />
      ))}
    </View>
  );
}

/**
 * Everything about one job, in the order a person decides by: how far, what,
 * how much, who, then the conditions and the full text.
 */
export function JobDetail({ job, now }: { job: JobDetailData; now: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const { latitude, longitude } = job.location;

  return (
    <View style={{ gap: theme.space[4] }}>
      {job.imageUrls.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Bleeds to the screen edges, so a second photo peeks in and invites a scroll.
          style={{ marginHorizontal: -theme.space[4] }}
          contentContainerStyle={{ paddingHorizontal: theme.space[4], gap: theme.space[2] }}>
          {job.imageUrls.map((url, index) => (
            <Image
              key={url}
              source={{ uri: url }}
              accessibilityLabel={t('detail.photo', { current: index + 1, total: job.imageUrls.length })}
              style={{
                width: job.imageUrls.length === 1 ? 328 : 280,
                height: 190,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.line,
              }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2] }}>
        {job.distanceM !== null ? (
          <Chip
            variant="near"
            large
            icon="map-pin"
            label={t('distance.fromYou', { distance: formatDistance(job.distanceM, language, t) })}
          />
        ) : null}
        {job.status === 'closed' ? <Chip icon="x" label={t('detail.closed')} /> : null}
        {job.status === 'draft' ? <Chip label={t('employer.statusDraft')} /> : null}
      </View>

      <View style={{ gap: theme.space[1] }}>
        <AppText variant="display">{job.title}</AppText>
        <AppText variant="title" color="brand">
          {formatPay(job.payAmount, job.payPeriod, language, t)}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <Chip label={t(`contracts.${job.contractType}`)} />
        <Chip label={t(`categories.${job.category}`)} />
        {job.startsNow ? <Chip icon="zap" label={t('detail.startsNow')} /> : null}
        <Chip icon="users" label={t('detail.openings', { count: job.openings })} />
      </View>

      <View
        style={{
          padding: theme.space[4],
          gap: theme.space[4],
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surfaceRaised,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
          {job.companyLogoUrl ? (
            <Image
              source={{ uri: job.companyLogoUrl }}
              style={{ width: 48, height: 48, borderRadius: theme.radius.sm, backgroundColor: theme.colors.line }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Icon name="briefcase" size={24} color="inkMuted" />
          )}
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {job.companyName}
          </AppText>
        </View>
        <Fact icon="map-pin" label={t('detail.place')}>
          <AppText>{job.companyAddress}</AppText>
        </Fact>
        <Button
          label={t('detail.showOnMap')}
          variant="neutral"
          // Opens the phone's own map on the job's place. Only the job's point is passed, never the reader's.
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)}
        />
      </View>

      {job.workingTimes.length > 0 || job.daysPerWeek !== null ? (
        <Fact icon="clock" label={t('job.workingTimes')}>
          {job.workingTimes.length > 0 ? (
            <Chips labels={job.workingTimes.map((value) => t(`workingTimes.${value}`))} />
          ) : null}
          {job.daysPerWeek !== null ? <AppText>{t('detail.daysPerWeek', { count: job.daysPerWeek })}</AppText> : null}
        </Fact>
      ) : null}

      {job.benefits.length > 0 ? (
        <Fact icon="gift" label={t('job.benefits')}>
          <Chips labels={job.benefits.map((value) => t(`benefits.${value}`))} />
        </Fact>
      ) : null}

      {job.experience ? (
        <Fact icon="award" label={t('job.experience')}>
          <AppText>{t(`experience.${job.experience}`)}</AppText>
        </Fact>
      ) : null}

      {job.languages.length > 0 ? (
        <Fact icon="message-circle" label={t('job.languages')}>
          <Chips labels={job.languages.map((value) => t(`spoken.${value}`))} />
        </Fact>
      ) : null}

      {job.description ? (
        <View style={{ gap: theme.space[2] }}>
          <AppText variant="heading">{t('detail.about')}</AppText>
          {/* Written by the employer, in whatever language they used; shown as written. */}
          <AppText>{job.description}</AppText>
        </View>
      ) : null}

      {job.status !== 'draft' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1] }}>
          <Icon name="clock" size={16} color="inkMuted" />
          <AppText variant="caption" color="inkMuted">
            {t('jobs.posted', { time: formatRelativeTime(job.publishedAt, now, language) })}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
