import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Appear, Swap } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icon';
import { currentLanguage } from '@/i18n';
import { formatRelativeTime } from '@/lib/format';
import { useTheme, type ColorTokens } from '@/theme';

export type Application = {
  _id: string;
  jobId?: string | null;
  matchId?: string | null;
  appliedAt: number;
  decision: 'pending' | 'accepted' | 'rejected';
  jobTitle: string | null;
  jobStatus: 'draft' | 'open' | 'closed';
  companyName: string | null;
};

type State = { key: string; icon: IconName; color: keyof ColorTokens };

/** One state per application, always shown with an icon and words, never colour alone. */
function stateOf(application: Application): State {
  if (application.decision === 'accepted') return { key: 'applications.accepted', icon: 'check', color: 'success' };
  if (application.decision === 'rejected') return { key: 'applications.rejected', icon: 'x', color: 'inkMuted' };
  if (application.jobStatus === 'closed') return { key: 'applications.closed', icon: 'x', color: 'inkMuted' };
  return { key: 'applications.pending', icon: 'clock', color: 'ink' };
}

type Props = {
  applications: Application[];
  now: number;
  /** Opens the job an application was made to. */
  onOpen?: (jobId: string) => void;
  /** Opens the conversation an acceptance started. */
  onOpenChat?: (matchId: string) => void;
};

/** The jobs a candidate swiped right on, newest first, each with its answer. */
export function ApplicationsList({ applications, now, onOpen, onOpenChat }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();

  if (applications.length === 0) {
    return (
      <View style={{ minHeight: 320 }}>
        <EmptyState icon="briefcase" title={t('applications.empty')} body={t('applications.emptyBody')} />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.space[4] }}>
      {applications.map((application, index) => {
        const state = stateOf(application);
        const { jobId, matchId } = application;
        return (
          <Appear key={application._id} index={index}>
            <Pressable
              accessibilityRole={onOpen && jobId ? 'button' : undefined}
              disabled={!onOpen || !jobId}
              onPress={() => (onOpen && jobId ? onOpen(jobId) : undefined)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                padding: theme.space[4],
                gap: theme.space[1],
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.line,
                backgroundColor: theme.colors.surfaceRaised,
              })}>
              <AppText variant="title" numberOfLines={2}>
                {application.jobTitle ?? '—'}
              </AppText>
              {application.companyName ? <AppText color="inkMuted">{application.companyName}</AppText> : null}
              <Swap
                key={state.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1], marginTop: theme.space[2] }}>
                <Icon name={state.icon} size={20} color={state.color} />
                <AppText variant="bodyStrong" color={state.color}>
                  {t(state.key)}
                </AppText>
              </Swap>
              <AppText variant="caption" color="inkMuted">
                {t('applications.applied', { time: formatRelativeTime(application.appliedAt, now, language) })}
              </AppText>
              {/* An acceptance is an invitation to talk, so the way in sits right on the card. */}
              {onOpenChat && matchId ? (
                <View style={{ marginTop: theme.space[2] }}>
                  <Button label={t('chat.open')} onPress={() => onOpenChat(matchId)} />
                </View>
              ) : null}
            </Pressable>
          </Appear>
        );
      })}
    </View>
  );
}
