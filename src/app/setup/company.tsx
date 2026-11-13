import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CompanyForm } from '@/features/forms/CompanyForm';
import { formErrorMessage } from '@/features/forms/formError';

/** An employer adds their business. It starts as pending and is approved by hand. */
export default function CompanySetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const create = useMutation(api.companies.create);

  return (
    <CompanyForm
      errorMessage={(error) => formErrorMessage(error, t, 'company.failed')}
      onSubmit={async (values) => {
        await create(values);
        router.replace('/');
      }}
    />
  );
}
