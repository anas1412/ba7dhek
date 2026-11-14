import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { RoundButton } from '@/components/RoundButton';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { CardSkeleton, Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { DEFAULT_RADIUS_M } from '@/features/forms/options';
import { currentLanguage } from '@/i18n';
import { formatDistance } from '@/lib/format';
import { jobHref } from '@/lib/routes';
import { useTheme } from '@/theme';

import { CardStack, type CardStackHandle, type SwipeDirection } from './CardStack';
import { FeedFilters, FilterButton, NO_FILTERS, filterCount, type Filters } from './FeedFilters';
import type { JobCardData } from './JobCard';

/** The candidate's home: the stack of nearby jobs. */
export function CandidateHome({ radiusM }: { radiusM: number | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  // Kept for the session. A fresh start of the app shows everything again.
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [choosing, setChoosing] = useState(false);
  const feed = useQuery(api.jobs.feed, filters);
  const record = useMutation(api.swipes.record);
  const stack = useRef<CardStackHandle>(null);
  const [now] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  const toast = useToast();
  const router = useRouter();

  if (choosing) {
    return (
      <FeedFilters
        filters={filters}
        onCancel={() => setChoosing(false)}
        onApply={(next) => {
          setFilters(next);
          setChoosing(false);
        }}
      />
    );
  }

  const filtering = filterCount(filters) > 0;
  const header = (count: number | null) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
      <View style={{ flex: 1 }}>
        {count === null ? (
          <Skeleton width={170} height={26} />
        ) : (
          <AppText variant="heading">{t('jobs.nearby', { count })}</AppText>
        )}
      </View>
      <FilterButton filters={filters} onPress={() => setChoosing(true)} />
    </View>
  );

  if (!feed) {
    return (
      <Screen>
        {header(null)}
        <View style={{ flex: 1 }}>
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  // No starting point yet: the setup screen asks for one.
  if (feed.reason === 'no_home') return <Redirect href="/setup/candidate" />;

  async function onSwipe(job: JobCardData, direction: SwipeDirection) {
    setFailed(false);
    try {
      await record({ jobId: job._id as Id<'jobs'>, direction });
      // Applying is confirmed; passing is quiet.
      if (direction === 'right') toast.show(t('toast.applied'));
    } catch {
      // The card is already gone from the screen; say so rather than fail silently.
      setFailed(true);
      toast.show(t('jobs.swipeFailed'), 'error');
    }
  }

  if (feed.jobs.length === 0 && filtering) {
    // Nothing matches the filters: say so, and offer the way out, rather than blame the area.
    return (
      <Screen>
        {header(0)}
        <EmptyState icon="sliders" title={t('filters.emptyTitle')} body={t('filters.emptyBody')}>
          <Button label={t('filters.clear')} onPress={() => setFilters(NO_FILTERS)} />
        </EmptyState>
      </Screen>
    );
  }

  if (feed.jobs.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="map-pin"
          title={t('jobs.emptyTitle', {
            distance: formatDistance(radiusM ?? DEFAULT_RADIUS_M, language, t),
          })}
          body={t('jobs.emptyBody')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          {failed ? (
            <AppText variant="caption" color="danger" center>
              {t('jobs.swipeFailed')}
            </AppText>
          ) : null}
          {/* Pass on the left, apply on the right, in every language: the same sides as the swipe. */}
          <View style={{ flexDirection: 'row', direction: 'ltr', justifyContent: 'center', gap: theme.space[6] * 2 }}>
            <RoundButton icon="x" label={t('jobs.pass')} variant="neutral" onPress={() => stack.current?.swipe('left')} />
            <RoundButton icon="check" label={t('jobs.apply')} variant="primary" onPress={() => stack.current?.swipe('right')} />
          </View>
        </>
      }>
      {header(feed.jobs.length)}
      <View style={{ flex: 1 }}>
        <CardStack
          ref={stack}
          jobs={feed.jobs}
          now={now}
          onSwipe={onSwipe}
          onOpen={(job) => router.push(jobHref(job._id))}
        />
      </View>
    </Screen>
  );
}
