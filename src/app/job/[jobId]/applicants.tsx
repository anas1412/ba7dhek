import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { LoadingScreen, Screen } from '@/components/Screen';
import { ApplicantsList, type Applicant } from '@/features/employer/ApplicantsList';

/** Who applied to one of the employer's jobs. The list updates live as people apply. */
export default function Applicants() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const applicants = useQuery(api.swipes.forJob, { jobId: jobId as Id<'jobs'> });
  const decide = useMutation(api.swipes.decide);
  const [now] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (!applicants) return <LoadingScreen />;

  async function onDecide(applicant: Applicant, accept: boolean) {
    setBusyId(applicant._id);
    setFailed(false);
    try {
      await decide({ swipeId: applicant._id as Id<'swipes'>, accept });
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll>
      <AppText variant="display">{t('applicants.title')}</AppText>
      {failed ? <AppText color="danger">{t('applicants.failed')}</AppText> : null}
      <ApplicantsList applicants={applicants} now={now} busyId={busyId} onDecide={onDecide} />
    </Screen>
  );
}
