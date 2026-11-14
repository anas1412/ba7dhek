import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { LocationField, type Point } from '@/features/location/LocationField';
import { currentLanguage } from '@/i18n';
import { formatDistance } from '@/lib/format';
import { useTheme } from '@/theme';

import { DEFAULT_RADIUS_M, RADII_M } from './options';

export type CandidateSetupValues = { about: string; home: Point; radiusM: number };

type Props = {
  /** Resolves when saved; rejects with the backend's error otherwise. */
  onSubmit: (values: CandidateSetupValues) => Promise<void>;
  errorMessage: (error: unknown) => string;
};

/** What a candidate fills in once: a short description, a starting point, and how far they will go. */
export function CandidateSetupForm({ onSubmit, errorMessage }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const [about, setAbout] = useState('');
  const [home, setHome] = useState<Point | null>(null);
  const [radiusM, setRadiusM] = useState<number>(DEFAULT_RADIUS_M);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function submit() {
    if (!home) {
      setError(t('setup.needLocation'));
      toast.show(t('setup.needLocation'), 'error');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ about, home, radiusM });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      scroll
      footer={
        <>
          {error ? (
            <AppText variant="caption" color="danger" center>
              {error}
            </AppText>
          ) : null}
          <Button label={t('setup.save')} loading={busy} onPress={submit} />
        </>
      }>
      <AppText variant="display">{t('setup.title')}</AppText>

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('setup.locationTitle')}</AppText>
        <AppText color="inkMuted">{t('setup.locationBody')}</AppText>
        <LocationField value={home} onChange={setHome} />
      </View>

      <ChoiceChips
        label={t('setup.radiusTitle')}
        options={RADII_M.map((value) => ({ value, label: formatDistance(value, language, t) }))}
        value={radiusM}
        onChange={setRadiusM}
      />

      <TextField
        label={`${t('setup.aboutLabel')} (${t('common.optional')})`}
        hint={t('setup.aboutHint')}
        placeholder={t('setup.aboutPlaceholder')}
        value={about}
        onChangeText={setAbout}
        maxLength={280}
        multiline
      />
    </Screen>
  );
}
