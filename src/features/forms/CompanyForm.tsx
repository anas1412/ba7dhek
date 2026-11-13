import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { LocationField, type Point } from '@/features/location/LocationField';
import { useTheme } from '@/theme';

import { CATEGORIES, type Category } from './options';

export type CompanyValues = { name: string; category: Category; address: string; location: Point };

type Props = {
  onSubmit: (values: CompanyValues) => Promise<void>;
  errorMessage: (error: unknown) => string;
};

/** An employer adds their business once. It is checked by hand before the first job goes live. */
export function CompanyForm({ onSubmit, errorMessage }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = name.trim().length >= 2 && category !== null && address.trim().length >= 3;

  async function submit() {
    if (!category) return;
    if (!location) {
      setError(t('company.needLocation'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, category, address, location });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const rules = ['company.rule1', 'company.rule2', 'company.rule3', 'company.rule4'] as const;

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
          <Button label={t('company.submit')} disabled={!complete} loading={busy} onPress={submit} />
        </>
      }>
      <AppText variant="display">{t('company.title')}</AppText>

      <TextField label={t('company.name')} value={name} onChangeText={setName} maxLength={80} />

      <ChoiceChips
        label={t('company.category')}
        options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
        value={category}
        onChange={setCategory}
      />

      <TextField
        label={t('company.address')}
        hint={t('company.addressHint')}
        value={address}
        onChangeText={setAddress}
        maxLength={200}
      />

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('company.locationTitle')}</AppText>
        <AppText color="inkMuted">{t('company.locationBody')}</AppText>
        <LocationField value={location} onChange={setLocation} />
      </View>

      <View
        style={{
          gap: theme.space[2],
          padding: theme.space[4],
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surfaceRaised,
        }}>
        <AppText variant="heading">{t('company.rulesTitle')}</AppText>
        {rules.map((rule) => (
          <View key={rule} style={{ flexDirection: 'row', gap: theme.space[2] }}>
            <Icon name="check" size={20} color="brand" />
            <AppText style={{ flex: 1 }}>{t(rule)}</AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}
