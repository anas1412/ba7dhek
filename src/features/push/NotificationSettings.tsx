import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/theme';

import { PUSH_SUPPORTED, askPermission, getPushToken, readPermission, type Permission } from './setup';

export type NewJobsMode = 'all' | 'digest' | 'off';
const MODES = ['all', 'digest', 'off'] as const;
const MODE_KEY = { all: 'push.modeAll', digest: 'push.modeDigest', off: 'push.modeOff' } as const;
const MODE_HINT = { all: 'push.modeAllHint', digest: 'push.modeDigestHint', off: 'push.modeOffHint' } as const;

type Props = {
  role: 'candidate' | 'employer';
  /** The candidate's saved choice for new-job notifications. */
  newJobs: NewJobsMode;
};

/** Whether this phone receives notifications, and how often a candidate hears about new jobs. */
export function NotificationSettings({ role, newJobs }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const setNewJobs = useMutation(api.push.setNewJobs);
  const register = useMutation(api.push.register);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    readPermission().then(setPermission, () => setPermission('denied'));
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      const answer = await askPermission();
      setPermission(answer);
      if (answer === 'granted') {
        const token = await getPushToken();
        if (token) await register({ token });
        toast.show(t('push.turnedOn'));
      }
    } catch {
      toast.show(t('errors.generic'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function choose(mode: NewJobsMode) {
    if (mode === newJobs) return;
    try {
      await setNewJobs({ mode });
      toast.show(t('toast.setupSaved'), 'info');
    } catch {
      toast.show(t('errors.generic'), 'error');
    }
  }

  return (
    <View style={{ gap: theme.space[4] }}>
      <AppText variant="heading">{t('push.settingsTitle')}</AppText>

      {!PUSH_SUPPORTED ? (
        <AppText color="inkMuted">{t('push.phoneOnly')}</AppText>
      ) : permission === 'undetermined' ? (
        <View style={{ gap: theme.space[2] }}>
          <AppText color="inkMuted">{t('push.isOff')}</AppText>
          <Button label={t('push.accept')} loading={busy} onPress={turnOn} />
        </View>
      ) : permission === 'denied' ? (
        <View style={{ gap: theme.space[2] }}>
          {/* The app cannot ask a second time; only the phone's own settings can change this. */}
          <AppText color="inkMuted">{t('push.isBlocked')}</AppText>
          <Button label={t('push.openSettings')} variant="neutral" onPress={() => Linking.openSettings()} />
        </View>
      ) : permission === 'granted' ? (
        <AppText color="inkMuted">{t('push.isOn')}</AppText>
      ) : null}

      {role === 'candidate' ? (
        <ChoiceChips
          label={t('push.newJobs')}
          hint={t(MODE_HINT[newJobs])}
          options={MODES.map((value) => ({ value, label: t(MODE_KEY[value]) }))}
          value={newJobs}
          onChange={choose}
        />
      ) : null}
    </View>
  );
}
