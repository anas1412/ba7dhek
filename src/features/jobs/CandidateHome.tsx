import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { RoundButton } from '@/components/RoundButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { currentLanguage } from '@/i18n';
import { formatDistance } from '@/lib/format';
import { useTheme } from '@/theme';

import { CardStack, type CardStackHandle, type SwipeDirection } from './CardStack';
import type { JobCardData } from './JobCard';

// Central Hammamet, used only by the development shortcut below.
const HAMMAMET = { latitude: 36.4, longitude: 10.6167 };
const DEFAULT_RADIUS_M = 5000;

/** The candidate's home: the stack of nearby jobs. */
export function CandidateHome({ radiusM }: { radiusM: number | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const feed = useQuery(api.jobs.feed);
  const record = useMutation(api.swipes.record);
  const setHome = useMutation(api.users.setHome);
  const stack = useRef<CardStackHandle>(null);
  const [now] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!feed) return <LoadingScreen />;

  async function onSwipe(job: JobCardData, direction: SwipeDirection) {
    setFailed(false);
    try {
      await record({ jobId: job._id as Id<'jobs'>, direction });
    } catch {
      // The card is already gone from the screen; say so rather than fail silently.
      setFailed(true);
    }
  }

  if (feed.reason === 'no_home') {
    return (
      <Screen>
        <EmptyState icon="navigation" title={t('jobs.noHomeTitle')} body={t('jobs.noHomeBody')}>
          {/* The map picker needs a native map library and a new build. Until it
              exists, development builds can set a fixed point to test the stack. */}
          {__DEV__ ? (
            <Button
              label={t('jobs.devHome')}
              variant="neutral"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await setHome({ home: HAMMAMET, radiusM: DEFAULT_RADIUS_M });
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
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
