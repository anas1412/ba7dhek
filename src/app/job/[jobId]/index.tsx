import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Component, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { JobDetail } from '@/features/jobs/JobDetail';
import { useTheme } from '@/theme';

/**
 * A job that was closed or removed makes its query throw. That is an ordinary
 * outcome here, not a crash, so it gets its own quiet message.
 */
class GoneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { gone: boolean }> {
  state = { gone: false };
  static getDerivedStateFromError() {
    return { gone: true };
  }
  render() {
    return this.state.gone ? this.props.fallback : this.props.children;
  }
}

function Gone() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen underHeader>
      <EmptyState icon="briefcase" title={t('detail.goneTitle')} body={t('detail.goneBody')}>
        <Button
          label={t('common.back')}
          variant="neutral"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </EmptyState>
    </Screen>
  );
}

function Notice({ icon, text }: { icon: 'check' | 'x' | 'eye'; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space[2] }}>
      <Icon name={icon} size={20} color="inkMuted" />
      <AppText variant="bodyStrong" color="inkMuted">
        {text}
      </AppText>
    </View>
  );
}

function Loaded({ jobId }: { jobId: Id<'jobs'> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const job = useQuery(api.jobs.detail, { jobId });
  const record = useMutation(api.swipes.record);
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState<'left' | 'right' | null>(null);

  if (!job) {
    return (
      <Screen underHeader>
        <View style={{ flex: 1 }}>
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  async function decide(direction: 'left' | 'right') {
    setBusy(direction);
    try {
      await record({ jobId, direction });
      if (direction === 'right') toast.show(t('toast.applied'));
      // Back to the stack, where this job is now gone.
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch {
      toast.show(t('jobs.swipeFailed'), 'error');
      setBusy(null);
    }
  }

  let footer: ReactNode;
  if (job.isOwner) footer = <Notice icon="eye" text={t('detail.ownerNote')} />;
  else if (job.mySwipe === 'right') footer = <Notice icon="check" text={t('detail.applied')} />;
  else if (job.mySwipe === 'left') footer = <Notice icon="x" text={t('detail.passed')} />;
  else if (job.status === 'open') {
    footer = (
      <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
        <View style={{ flex: 1 }}>
          <Button
            label={t('jobs.pass')}
            variant="neutral"
            loading={busy === 'left'}
            disabled={busy !== null}
            onPress={() => decide('left')}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Button
            label={t('jobs.apply')}
            loading={busy === 'right'}
            disabled={busy !== null}
            onPress={() => decide('right')}
          />
        </View>
      </View>
    );
  }

  return (
    <Screen scroll underHeader footer={footer}>
      <JobDetail job={job} now={now} />
    </Screen>
  );
}

/** One job in full: opened from a card, an application, or the employer's own list. */
export default function JobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <GoneBoundary fallback={<Gone />}>
      <Loaded jobId={jobId as Id<'jobs'>} />
    </GoneBoundary>
  );
}
