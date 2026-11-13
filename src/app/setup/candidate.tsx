import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CandidateSetupForm } from '@/features/forms/CandidateSetupForm';
import { formErrorMessage } from '@/features/forms/formError';

/** A candidate's one-time setup: starting point, radius and a short description. */
export default function CandidateSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const setHome = useMutation(api.users.setHome);
  const updateProfile = useMutation(api.users.updateProfile);

  return (
    <CandidateSetupForm
      errorMessage={(error) => formErrorMessage(error, t, 'setup.failed')}
      onSubmit={async ({ about, home, radiusM }) => {
        if (about.trim()) await updateProfile({ about });
        await setHome({ home, radiusM });
        router.replace('/');
      }}
    />
  );
}
