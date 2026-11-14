import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { CompanyForm } from '@/features/forms/CompanyForm';
import { formErrorMessage } from '@/features/forms/formError';
import type { Category } from '@/features/forms/options';

/** The employer edits their business. Some changes send it back for a check. */
export default function BusinessEdit() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const company = useQuery(api.companies.mine);
  const update = useMutation(api.companies.update);

  if (!company) {
    return (
      <Screen underHeader>
        <Skeleton width="70%" height={36} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </Screen>
    );
  }

  return (
    <CompanyForm
      initial={{
        name: company.name,
        category: company.category as Category,
        address: company.address,
        location: company.location,
        kind: company.kind ?? 'business',
        taxId: company.taxId,
      }}
      errorMessage={(error) => formErrorMessage(error, t, 'company.saveFailed')}
      onSubmit={async (values) => {
        const { recheck } = await update(values);
        toast.show(t(recheck ? 'toast.businessRecheck' : 'toast.businessSaved'), recheck ? 'info' : 'success');
        router.back();
      }}
    />
  );
}
