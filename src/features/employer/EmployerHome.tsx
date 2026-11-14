import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Appear, Swap } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { currentLanguage } from '@/i18n';
import { formatPay } from '@/lib/format';
import { jobHref } from '@/lib/routes';
import { useTheme } from '@/theme';

const STATUS_KEY = { draft: 'employer.statusDraft', open: 'employer.statusOpen', closed: 'employer.statusClosed' } as const;

/** The employer's home: their jobs, each with its state and how many people applied. */
export function EmployerHome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const language = currentLanguage();
  const company = useQuery(api.companies.mine);
  const jobs = useQuery(api.jobs.mine);
  const publish = useMutation(api.jobs.publish);
  const close = useMutation(api.jobs.close);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  if (company === undefined || jobs === undefined) {
    return (
      <Screen scroll>
        <AppText variant="display">{t('employer.title')}</AppText>
        <ListSkeleton />
      </Screen>
    );
  }

  if (company === null) {
    return (
      <Screen>
        <EmptyState icon="briefcase" title={t('employer.noCompanyTitle')} body={t('employer.noCompanyBody')}>
          <Button label={t('employer.addCompany')} onPress={() => router.push('/setup/company')} />
        </EmptyState>
      </Screen>
    );
  }

  /** Runs one job action and always says how it ended. */
  async function run(id: string, action: () => Promise<unknown>, doneKey: string) {
    setBusyId(id);
    try {
      await action();
      toast.show(t(doneKey));
    } catch (error) {
      const code = error instanceof ConvexError ? (error.data as { code?: string }).code : undefined;
      toast.show(t(code === 'company_not_approved' ? 'errors.notApproved' : 'errors.generic'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen
      scroll
      footer={<Button label={t('employer.newJob')} onPress={() => router.push('/job/new')} />}>
      <AppText variant="display">{t('employer.title')}</AppText>

      <Button label={t('employer.business')} variant="neutral" onPress={() => router.push('/business')} />

      {company.approval !== 'approved' ? (
        <View
          style={{
            padding: theme.space[4],
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.brandSoft,
          }}>
          <AppText>{t(company.approval === 'pending' ? 'employer.pending' : 'employer.rejected')}</AppText>
        </View>
      ) : null}

      {jobs.length === 0 ? (
        <View style={{ minHeight: 280 }}>
          <EmptyState icon="plus" title={t('employer.noJobsTitle')} body={t('employer.noJobsBody')} />
        </View>
      ) : (
        jobs.map((job, index) => (
          <Appear
            key={job._id}
            index={index}
            style={{
              padding: theme.space[4],
              gap: theme.space[2],
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surfaceRaised,
            }}>
            <AppText variant="title">{job.title}</AppText>
            <AppText variant="bodyStrong" color="brand">
              {formatPay(job.payAmount, job.payPeriod, language, t)}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
              <Swap key={job.status}>
                <Chip label={t(STATUS_KEY[job.status])} />
              </Swap>
              {job.hidden ? <Chip icon="eye-off" label={t('employer.statusHidden')} /> : null}
              <Chip icon="user" label={t('employer.applicants', { count: job.applicantCount })} />
              <Chip label={t('images.count', { count: job.images.length, max: 4 })} />
            </View>
            <Button
              label={t('detail.preview')}
              variant="neutral"
              onPress={() => router.push(jobHref(job._id))}
            />
            <Button
              label={t('employer.photos')}
              variant="neutral"
              onPress={() => router.push({ pathname: '/job/[jobId]/photos', params: { jobId: job._id } })}
            />
            {job.status === 'draft' ? (
              <Button
                label={t('employer.publish')}
                loading={busyId === job._id}
                disabled={company.approval !== 'approved' || Boolean(job.hidden)}
                onPress={() => run(job._id, () => publish({ jobId: job._id }), 'toast.jobLive')}
              />
            ) : (
              <Button
                label={t('applicants.view')}
                variant="neutral"
                onPress={() => router.push({ pathname: '/job/[jobId]/applicants', params: { jobId: job._id } })}
              />
            )}
            {job.status === 'open' ? (
              <Button
                label={t('employer.close')}
                variant="danger"
                loading={busyId === job._id}
                onPress={() => run(job._id, () => close({ jobId: job._id }), 'toast.jobClosed')}
              />
            ) : null}
          </Appear>
        ))
      )}
    </Screen>
  );
}
