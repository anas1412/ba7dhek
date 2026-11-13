import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen, Screen } from '@/components/Screen';
import { currentLanguage } from '@/i18n';
import { formatPay } from '@/lib/format';
import { useTheme } from '@/theme';

const STATUS_KEY = { draft: 'employer.statusDraft', open: 'employer.statusOpen', closed: 'employer.statusClosed' } as const;

/**
 * The employer's home: their jobs, each with its state and how many people
 * applied. The forms for adding a business and posting a job come next; until
 * then this screen shows what the backend already holds.
 */
export function EmployerHome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const company = useQuery(api.companies.mine);
  const jobs = useQuery(api.jobs.mine);
  const publish = useMutation(api.jobs.publish);
  const close = useMutation(api.jobs.close);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (company === undefined || jobs === undefined) return <LoadingScreen />;

  if (company === null) {
    return (
      <Screen>
        <EmptyState icon="briefcase" title={t('employer.noCompanyTitle')} body={t('employer.noCompanyBody')} />
      </Screen>
    );
  }

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
    } catch {
      // Publishing fails while the business is still being checked; the banner says why.
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll>
      <AppText variant="display">{t('employer.title')}</AppText>

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
        jobs.map((job) => (
          <View
            key={job._id}
            style={{
              padding: theme.space[4],
              gap: theme.space[2],
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surfaceRaised,
            }}>
            <AppText variant="title">{job.title}</AppText>
            <AppText variant="bodyStrong" color="brand">
              {formatPay(job.payAmount, job.payPeriod, language, t)}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
              <Chip label={t(STATUS_KEY[job.status])} />
              <Chip icon="user" label={t('employer.applicants', { count: job.applicantCount })} />
            </View>
            {job.status === 'draft' ? (
              <Button
                label={t('employer.publish')}
                loading={busyId === job._id}
                disabled={company.approval !== 'approved'}
                onPress={() => run(job._id, () => publish({ jobId: job._id }))}
              />
            ) : null}
            {job.status === 'open' ? (
              <Button
                label={t('employer.close')}
                variant="danger"
                loading={busyId === job._id}
                onPress={() => run(job._id, () => close({ jobId: job._id }))}
              />
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}
