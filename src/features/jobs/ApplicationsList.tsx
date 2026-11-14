import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Appear, Swap } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icon';
import { currentLanguage } from '@/i18n';
import { formatRelativeTime } from '@/lib/format';
import { useTheme, type ColorTokens } from '@/theme';

export type Application = {
  _id: string;
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

/** The jobs a candidate swiped right on, newest first, each with its answer. */
export function ApplicationsList({ applications, now }: { applications: Application[]; now: number }) {
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
        return (
          <Appear
            key={application._id}
            index={index}
            style={{
              padding: theme.space[4],
              gap: theme.space[1],
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surfaceRaised,
            }}>
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
          </Appear>
        );
      })}
    </View>
  );
}
