import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme';

type Role = 'candidate' | 'employer';

export default function RoleChoice() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const setRole = useMutation(api.users.setRole);

  const [choice, setChoice] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    if (!choice) return;
    setBusy(true);
    setFailed(false);
    try {
      await setRole({ role: choice });
      router.replace('/');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const options: { role: Role; title: string; hint: string }[] = [
    { role: 'candidate', title: t('role.candidate'), hint: t('role.candidateHint') },
    { role: 'employer', title: t('role.employer'), hint: t('role.employerHint') },
  ];

  return (
    <Screen
      footer={
        <>
          {failed ? (
            <AppText variant="caption" color="danger" center>
              {t('role.failed')}
            </AppText>
          ) : null}
          <AppText variant="caption" color="inkMuted" center>
            {t('role.note')}
          </AppText>
          <Button label={t('common.continue')} disabled={!choice} loading={busy} onPress={confirm} />
        </>
      }>
      <AppText variant="display">{t('role.title')}</AppText>
      <View style={{ gap: theme.space[4] }}>
        {options.map((option) => {
          const selected = choice === option.role;
          return (
            <Pressable
              key={option.role}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setChoice(option.role)}
              style={{
                padding: theme.space[6],
                gap: theme.space[1],
                borderRadius: theme.radius.md,
                borderWidth: 2,
                borderColor: selected ? theme.colors.brand : theme.colors.line,
                backgroundColor: selected ? theme.colors.brandSoft : theme.colors.surfaceRaised,
              }}>
              <AppText variant="title">{option.title}</AppText>
              <AppText color="inkMuted">{option.hint}</AppText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
