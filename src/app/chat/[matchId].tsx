import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Component, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { Conversation } from '@/features/chat/Conversation';
import { jobHref } from '@/lib/routes';

/** A conversation the person is not part of, or that no longer exists, makes its query throw. */
class MissingBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { missing: boolean }> {
  state = { missing: false };
  static getDerivedStateFromError() {
    return { missing: true };
  }
  render() {
    return this.state.missing ? this.props.fallback : this.props.children;
  }
}

function useLeave() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function Missing() {
  const { t } = useTranslation();
  const leave = useLeave();
  return (
    <Screen>
      <EmptyState icon="message-circle" title={t('chat.missingTitle')} body={t('chat.missingBody')}>
        <Button label={t('common.back')} variant="neutral" onPress={leave} />
      </EmptyState>
    </Screen>
  );
}

function Loaded({ matchId }: { matchId: Id<'matches'> }) {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const leave = useLeave();
  const header = useQuery(api.matches.get, { matchId });
  const messages = useQuery(api.messages.list, { matchId });
  const send = useMutation(api.messages.send);
  const markRead = useMutation(api.matches.markRead);
  const block = useMutation(api.matches.block);
  const unblock = useMutation(api.matches.unblock);
  const report = useMutation(api.matches.report);

  // Seen as soon as it is on screen, and again each time a message arrives while it is open.
  const count = messages?.length;
  useEffect(() => {
    if (count === undefined) return;
    markRead({ matchId }).catch(() => {});
  }, [count, markRead, matchId]);

  if (!header || !messages) return <LoadingScreen />;

  /** Runs a menu action and always says how it ended. */
  async function act(action: () => Promise<unknown>, doneKey: string) {
    try {
      await action();
      toast.show(t(doneKey), 'info');
    } catch {
      toast.show(t('errors.generic'), 'error');
    }
  }

  const jobId = header.jobId;

  return (
    <Conversation
      header={header}
      messages={messages}
      onBack={leave}
      onOpenJob={jobId ? () => router.push(jobHref(jobId)) : undefined}
      onSend={async (body) => {
        try {
          await send({ matchId, body });
        } catch (error) {
          const code = error instanceof ConvexError ? (error.data as { code?: string }).code : undefined;
          const key =
            code === 'blocked_text'
              ? 'errors.blockedText'
              : code === 'too_fast'
                ? 'chat.tooFast'
                : code === 'blocked'
                  ? 'chat.closedLong'
                  : 'chat.sendFailed';
          // The conversation shows this sentence above the field and keeps the text typed.
          throw new Error(t(key));
        }
      }}
      onBlock={() => act(() => block({ matchId }), 'chat.blockedToast')}
      onUnblock={() => act(() => unblock({ matchId }), 'chat.unblockedToast')}
      onReport={(reason) => act(() => report({ matchId, reason }), 'chat.reportedToast')}
    />
  );
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return (
    <MissingBoundary fallback={<Missing />}>
      <Loaded matchId={matchId as Id<'matches'>} />
    </MissingBoundary>
  );
}
