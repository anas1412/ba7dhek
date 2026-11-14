import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { RoundButton } from '@/components/RoundButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { DEFAULT_RADIUS_M } from '@/features/forms/options';
import { currentLanguage } from '@/i18n';
import { formatDistance } from '@/lib/format';
import { useTheme } from '@/theme';

import { CardStack, type CardStackHandle, type SwipeDirection } from './CardStack';
import type { JobCardData } from './JobCard';

/** The candidate's home: the stack of nearby jobs. */
export function CandidateHome({ radiusM }: { radiusM: number | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const feed = useQuery(api.jobs.feed);
  const record = useMutation(api.swipes.record);
  const stack = useRef<CardStackHandle>(null);
  const [now] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  const toast = useToast();

  if (!feed) return <LoadingScreen />;

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
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.space[6] * 2 }}>
            <RoundButton icon="x" label={t('jobs.pass')} variant="neutral" onPress={() => stack.current?.swipe('left')} />
            <RoundButton icon="check" label={t('jobs.apply')} variant="primary" onPress={() => stack.current?.swipe('right')} />
          </View>
        </>
      }>
      <AppText variant="heading">{t('jobs.nearby', { count: feed.jobs.length })}</AppText>
      <View style={{ flex: 1 }}>
        <CardStack ref={stack} jobs={feed.jobs} now={now} onSwipe={onSwipe} />
      </View>
    </Screen>
  );
}
