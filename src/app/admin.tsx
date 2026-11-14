import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { Activity, Businesses, Jobs, Overview, People, Reports } from '@/features/staff/sections';
import { useTheme } from '@/theme';

const SECTIONS = ['overview', 'reports', 'businesses', 'jobs', 'people', 'activity'] as const;
type Section = (typeof SECTIONS)[number];

/**
 * The back office, for moderators and admins. Hiding this screen from everyone
 * else is a courtesy, not the lock: every function behind it checks the
 * caller's role again on the server.
 */
export default function BackOffice() {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useQuery(api.users.me);
  const [section, setSection] = useState<Section>('overview');

  if (me === undefined) return null;
  const role = me?.staffRole ?? null;
  if (!role) return <Redirect href="/" />;

  // The activity log is the admin's alone.
  const sections = SECTIONS.filter((name) => name !== 'activity' || role === 'admin');

  return (
    <Screen scroll underHeader>
      <View style={{ gap: theme.space[2] }}>
        <AppText variant="display">{t('admin.title')}</AppText>
        <Chip icon="shield" label={t(role === 'admin' ? 'admin.roleAdmin' : 'admin.roleModerator')} />
      </View>

      <ChoiceChips
        label={t('admin.section')}
        options={sections.map((value) => ({ value, label: t(`admin.section_${value}`) }))}
        value={section}
        onChange={setSection}
      />

      {section === 'overview' ? <Overview /> : null}
      {section === 'reports' ? <Reports /> : null}
      {section === 'businesses' ? <Businesses /> : null}
      {section === 'jobs' ? <Jobs /> : null}
      {section === 'people' ? <People role={role} /> : null}
      {section === 'activity' && role === 'admin' ? <Activity /> : null}
    </Screen>
  );
}
