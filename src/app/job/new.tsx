import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { formErrorMessage } from '@/features/forms/formError';
import { JobForm } from '@/features/forms/JobForm';

/** Saves a job as a draft. Publishing is a separate step on the employer's home screen. */
export default function NewJob() {
  const { t } = useTranslation();
  const router = useRouter();
  const create = useMutation(api.jobs.create);

  return (
    <JobForm
      errorMessage={(error) => formErrorMessage(error, t, 'job.failed')}
      onSubmit={async (values) => {
        await create(values);
        router.back();
      }}
    />
  );
}
