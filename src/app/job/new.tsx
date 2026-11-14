import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/Toast';
import { formErrorMessage } from '@/features/forms/formError';
import { JobForm } from '@/features/forms/JobForm';

/** Saves a job as a draft. Publishing is a separate step on the employer's home screen. */
export default function NewJob() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const create = useMutation(api.jobs.create);

  return (
    <JobForm
      errorMessage={(error) => formErrorMessage(error, t, 'job.failed')}
      onSubmit={async (values) => {
        const jobId = await create(values);
        toast.show(t('toast.draftSaved'));
        // Straight on to photos: they are optional, and this is the moment someone has them to hand.
        router.replace({ pathname: '/job/[jobId]/photos', params: { jobId } });
      }}
    />
  );
}
