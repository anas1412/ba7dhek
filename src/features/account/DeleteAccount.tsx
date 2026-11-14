import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

type Props = {
  role: 'candidate' | 'employer' | null;
  /** Deletes the account and signs out. Rejects when it could not be done. */
  onDelete: () => Promise<void>;
};

function Line({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
      <Icon name="x" size={20} color="danger" />
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

/**
 * Deleting an account cannot be undone, so it takes two deliberate presses:
 * the first opens a plain list of what will be lost, the second does it.
 */
export function DeleteAccount({ role, onDelete }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      await onDelete();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  if (!confirming) {
    return <Button label={t('account.delete')} variant="danger" onPress={() => setConfirming(true)} />;
  }

  return (
    <View
      accessibilityRole="alert"
      style={{
        gap: theme.space[4],
        padding: theme.space[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.danger,
      }}>
      <AppText variant="heading">{t('account.confirmTitle')}</AppText>
      <View style={{ gap: theme.space[2] }}>
        <Line text={t('account.loseProfile')} />
        {role === 'candidate' ? <Line text={t('account.loseApplications')} /> : null}
        {role === 'employer' ? <Line text={t('account.loseBusiness')} /> : null}
      </View>
      <AppText color="inkMuted">{t('account.keptNote')}</AppText>
      <AppText variant="bodyStrong">{t('account.noUndo')}</AppText>
      {failed ? (
        <AppText variant="caption" color="danger">
          {t('account.failed')}
        </AppText>
      ) : null}
      <View style={{ gap: theme.space[2] }}>
        <Button label={t('account.confirm')} variant="danger" loading={busy} onPress={confirm} />
        <Button label={t('account.keep')} disabled={busy} onPress={() => setConfirming(false)} />
      </View>
    </View>
  );
}
