import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/Skeleton';
import { ApplicationsList } from '@/features/jobs/ApplicationsList';

/** The candidate's applications and their answers. Hidden from the tab bar for employers. */
export default function Applications() {
  const { t } = useTranslation();
  const me = useQuery(api.users.me);
  const applications = useQuery(api.swipes.mine, me?.role === 'candidate' ? {} : 'skip');
  const [now] = useState(() => Date.now());

  if (!applications) {
    return (
      <Screen scroll>
        <AppText variant="display">{t('applications.title')}</AppText>
        <ListSkeleton />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppText variant="display">{t('applications.title')}</AppText>
      <ApplicationsList applications={applications} now={now} />
    </Screen>
  );
}
