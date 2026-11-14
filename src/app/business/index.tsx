import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useImageUpload } from '@/features/images/useImageUpload';
import { MapPreview } from '@/features/location/MapPreview';
import { useTheme, type ColorTokens } from '@/theme';

const STATUS: Record<'pending' | 'approved' | 'rejected', { icon: IconName; color: keyof ColorTokens; key: string }> = {
  pending: { icon: 'clock', color: 'ink', key: 'business.statusPending' },
  approved: { icon: 'check-circle', color: 'success', key: 'business.statusApproved' },
  rejected: { icon: 'x-circle', color: 'danger', key: 'business.statusRejected' },
};

/** The employer's business: where its check stands, what was given, and its logo. */
export default function Business() {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const router = useRouter();
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

  if (!company) {
    return (
      <Screen scroll underHeader>
        <Skeleton width="70%" height={36} />
        <Skeleton height={72} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  const status = STATUS[company.approval];
  const business = (company.kind ?? 'business') === 'business';
  const card = {
    gap: theme.space[4],
    padding: theme.space[4],
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  } as const;

  return (
    <Screen
      scroll
      underHeader
      footer={
        <Button
          label={t(company.approval === 'rejected' ? 'business.fixAndResend' : 'business.edit')}
          variant={company.approval === 'rejected' ? 'primary' : 'neutral'}
          onPress={() => router.push('/business/edit')}
        />
      }>
      <AppText variant="display">{company.name}</AppText>

      {/* Where the check stands, and for a rejection, why. */}
      <View style={[card, { flexDirection: 'row', alignItems: 'flex-start' }]}>
        <Icon name={status.icon} color={status.color} />
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <AppText variant="bodyStrong">{t(status.key)}</AppText>
          {company.approval === 'rejected' && company.rejectionReason ? (
            <AppText color="inkMuted">{t('business.reason', { reason: company.rejectionReason })}</AppText>
          ) : null}
          <AppText variant="caption" color="inkMuted">
            {t(`business.${company.approval}Body`)}
          </AppText>
        </View>
      </View>

      <View style={card}>
        <Detail label={t('company.kind')} value={t(business ? 'company.kindBusiness' : 'company.kindIndividual')} />
        {business ? <Detail label={t('company.taxId')} value={company.taxId ?? '—'} note={t('business.taxIdPrivate')} /> : null}
        <Detail label={t('business.category')} value={t(`categories.${company.category}`)} />
        <Detail label={t('company.address')} value={company.address} />
        <MapPreview point={company.location} height={160} />
      </View>

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('logo.title')}</AppText>
        <AppText color="inkMuted">{t('logo.body')}</AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.line,
            backgroundColor: theme.colors.surfaceRaised,
          }}>
          {company.logoUrl ? (
            <Image source={{ uri: company.logoUrl }} style={{ width: 96, height: 96 }} contentFit="cover" transition={200} />
          ) : (
            <Icon name="briefcase" size={28} color="inkMuted" />
          )}
        </View>
        <View style={{ flex: 1, gap: theme.space[2] }}>
          <Button
            label={t(company.logoUrl ? 'logo.change' : 'logo.add')}
            variant="neutral"
            loading={uploading}
            disabled={removing}
            onPress={pickAndUpload}
          />
          {company.logoUrl ? (
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

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="caption" color="inkMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
      {note ? (
        <AppText variant="caption" color="inkMuted">
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
