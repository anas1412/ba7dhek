import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

/** Placeholder home. The job stack and the employer's job list replace it in the next milestones. */
export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useQuery(api.users.me);

  if (!me) return <LoadingScreen />;
  const employer = me.role === 'employer';

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[2] }}>
        <AppText variant="display">
          {t(employer ? 'home.employerTitle' : 'home.candidateTitle')}
        </AppText>
        <AppText color="inkMuted">
          {t(employer ? 'home.employerBody' : 'home.candidateBody')}
        </AppText>
      </View>
    </Screen>
  );
}
