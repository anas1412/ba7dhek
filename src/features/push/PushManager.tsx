import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { readPreference, writePreference } from '@/lib/storage';
import { useTheme } from '@/theme';

import { PUSH_SUPPORTED, askPermission, ensureChannels, getPushToken, readPermission, routeFor } from './setup';

const ASKED_KEY = 'ba7dhek.pushAsked';

type Props = {
  /** Decides which notifications the explanation lists. */
  role: 'candidate' | 'employer';
};

/**
 * Everything push needs while someone is signed in, mounted once inside the tabs:
 * - registers the phone on every launch, when permission was already given;
 * - explains what will be sent, once, before the phone's own question;
 * - opens the right screen when a notification is tapped.
 */
export function PushManager({ role }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const register = useMutation(api.push.register);
  const [explaining, setExplaining] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!PUSH_SUPPORTED) return;
    let cancelled = false;

    async function start() {
      await ensureChannels({
        jobs: t('push.channelJobs'),
        messages: t('push.channelMessages'),
        activity: t('push.channelActivity'),
      });
      const permission = await readPermission();
      if (cancelled) return;
      if (permission === 'granted') {
        const token = await getPushToken();
        if (token && !cancelled) register({ token }).catch(() => {});
      } else if (permission === 'undetermined' && (await readPreference(ASKED_KEY)) !== 'yes') {
        if (!cancelled) setExplaining(true);
      }
    }
    start().catch(() => {});

    // A notification that opened the app from closed, then every tap while it runs.
    const opened = Notifications.getLastNotificationResponse();
    const first = routeFor(opened?.notification.request.content.data);
    if (first) {
      Notifications.clearLastNotificationResponse();
      router.push(first);
    }
    const taps = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeFor(response.notification.request.content.data);
      if (route) router.push(route);
    });

    return () => {
      cancelled = true;
      taps.remove();
    };
    // Runs once per sign-in; the functions it uses are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(accept: boolean) {
    // Asked once. Later, the choice lives in Settings.
    await writePreference(ASKED_KEY, 'yes');
    if (!accept) {
      setExplaining(false);
      return;
    }
    setBusy(true);
    try {
      if ((await askPermission()) === 'granted') {
        const token = await getPushToken();
        if (token) await register({ token }).catch(() => {});
      }
    } finally {
      setBusy(false);
      setExplaining(false);
    }
  }

  if (!PUSH_SUPPORTED) return null;
  return (
    <Modal visible={explaining} animationType="slide" onRequestClose={() => decide(false)}>
      <PushExplanation role={role} busy={busy} onAccept={() => decide(true)} onDecline={() => decide(false)} />
    </Modal>
  );
}

function Line({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space[4], alignItems: 'flex-start' }}>
      <Icon name={icon} color="brand" />
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

type ExplanationProps = Props & { busy: boolean; onAccept: () => void; onDecline: () => void };

/** What will be sent and how often, said plainly before the phone asks its yes-or-no question. */
export function PushExplanation({ role, busy, onAccept, onDecline }: ExplanationProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.space[6], padding: theme.space[4] }}>
        <View style={{ gap: theme.space[2] }}>
          <AppText variant="display">{t('push.title')}</AppText>
          <AppText color="inkMuted">{t('push.body')}</AppText>
        </View>
        <View style={{ gap: theme.space[4] }}>
          {role === 'candidate' ? (
            <>
              <Line icon="map-pin" text={t('push.candidateJobs')} />
              <Line icon="check" text={t('push.candidateAccepted')} />
            </>
          ) : (
            <>
              <Line icon="users" text={t('push.employerApplicants')} />
              <Line icon="briefcase" text={t('push.employerApproved')} />
            </>
          )}
          <Line icon="message-circle" text={t('push.messages')} />
        </View>
        <AppText variant="caption" color="inkMuted">
          {t('push.promise')}
        </AppText>
      </View>
      <View style={{ gap: theme.space[2], padding: theme.space[4] }}>
        <Button label={t('push.accept')} loading={busy} onPress={onAccept} />
        <Button label={t('push.decline')} variant="neutral" disabled={busy} onPress={onDecline} />
      </View>
    </SafeAreaView>
  );
}
