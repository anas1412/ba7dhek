import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { ApplicantsList, type Applicant } from '@/features/employer/ApplicantsList';
import { chatHref } from '@/lib/routes';

/** Who applied to one of the employer's jobs. The list updates live as people apply. */
export default function Applicants() {
  const { t } = useTranslation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const applicants = useQuery(api.swipes.forJob, { jobId: jobId as Id<'jobs'> });
  const decide = useMutation(api.swipes.decide);
  const [now] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const toast = useToast();
  const router = useRouter();

  if (!applicants) {
    return (
      <Screen scroll underHeader>
        <AppText variant="display">{t('applicants.title')}</AppText>
        <ListSkeleton />
      </Screen>
    );
  }

  async function onDecide(applicant: Applicant, accept: boolean) {
    setBusyId(applicant._id);
    setFailed(false);
    try {
      await decide({ swipeId: applicant._id as Id<'swipes'>, accept });
      toast.show(t(accept ? 'toast.accepted' : 'toast.rejected'), accept ? 'success' : 'info');
    } catch {
      setFailed(true);
      toast.show(t('applicants.failed'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll underHeader>
      <AppText variant="display">{t('applicants.title')}</AppText>
      {failed ? <AppText color="danger">{t('applicants.failed')}</AppText> : null}
      <ApplicantsList
        applicants={applicants}
        now={now}
        busyId={busyId}
        onDecide={onDecide}
        onOpenChat={(matchId) => router.push(chatHref(matchId))}
      />
    </Screen>
  );
}
