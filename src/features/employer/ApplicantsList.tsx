import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Appear, Swap } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { currentLanguage } from '@/i18n';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/theme';

export type Applicant = {
  _id: string;
  appliedAt: number;
  decision: 'pending' | 'accepted' | 'rejected';
  name: string;
  photoUrl: string | null;
  about: string | null;
  /** A range, never the distance itself: the employer does not learn where a candidate lives. */
  distanceBucket: 'lt1' | '1to3' | '3to5' | '5to10' | 'gt10';
};

type Props = {
  applicants: Applicant[];
  now: number;
  busyId: string | null;
  onDecide: (applicant: Applicant, accept: boolean) => void;
};

/**
 * People who applied to one job, in the order they applied. The app does not
 * rank or recommend anyone; the employer decides.
 */
export function ApplicantsList({ applicants, now, busyId, onDecide }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();

  if (applicants.length === 0) {
    return (
      <View style={{ minHeight: 320 }}>
        <EmptyState icon="user" title={t('applicants.empty')} body={t('applicants.emptyBody')} />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.space[4] }}>
      {applicants.map((applicant, index) => (
        <Appear
          key={applicant._id}
          index={index}
          style={{
            padding: theme.space[4],
            gap: theme.space[2] + theme.space[1],
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.line,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] + theme.space[1] }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.radius.full,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.brandSoft,
              }}>
              {applicant.photoUrl ? (
                <Image source={{ uri: applicant.photoUrl }} style={{ width: 48, height: 48 }} contentFit="cover" />
              ) : (
                <Icon name="user" color="brand" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {applicant.name}
              </AppText>
              <AppText variant="caption" color="inkMuted">
                {t('applicants.applied', { time: formatRelativeTime(applicant.appliedAt, now, language) })}
              </AppText>
            </View>
          </View>

          <Chip variant="near" icon="map-pin" label={t(`applicants.bucket_${applicant.distanceBucket}`)} />

          <AppText color={applicant.about ? 'ink' : 'inkMuted'}>{applicant.about ?? t('applicants.noAbout')}</AppText>

          {applicant.decision === 'pending' ? (
            <View style={{ gap: theme.space[2] }}>
              <Button
                label={t('applicants.accept')}
                loading={busyId === applicant._id}
                onPress={() => onDecide(applicant, true)}
              />
              <Button
                label={t('applicants.reject')}
                variant="neutral"
                disabled={busyId === applicant._id}
                onPress={() => onDecide(applicant, false)}
              />
            </View>
          ) : (
            <Swap key={applicant.decision} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1] }}>
              <Icon
                name={applicant.decision === 'accepted' ? 'check' : 'x'}
                size={20}
                color={applicant.decision === 'accepted' ? 'success' : 'inkMuted'}
              />
              <AppText variant="bodyStrong" color={applicant.decision === 'accepted' ? 'success' : 'inkMuted'}>
                {t(applicant.decision === 'accepted' ? 'applicants.accepted' : 'applicants.rejected')}
              </AppText>
            </Swap>
          )}
        </Appear>
      ))}
    </View>
  );
}
