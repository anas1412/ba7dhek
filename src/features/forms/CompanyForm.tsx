import { normaliseTaxId } from '@convex/lib/taxId';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { LocationField, type Point } from '@/features/location/LocationField';
import { useTheme } from '@/theme';

import { CATEGORIES, type Category } from './options';

export type EmployerKind = 'business' | 'individual';

export type CompanyValues = {
  name: string;
  category: Category;
  address: string;
  location: Point;
  kind: EmployerKind;
  /** Present for a registered business only. */
  taxId?: string;
};

type Props = {
  onSubmit: (values: CompanyValues) => Promise<void>;
  errorMessage: (error: unknown) => string;
};

/**
 * An employer adds their business once. A registered business gives its tax ID
 * (matricule fiscal), which is what gets checked before the first job goes live.
 */
export function CompanyForm({ onSubmit, errorMessage }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const [kind, setKind] = useState<EmployerKind>('business');
  const [taxId, setTaxId] = useState('');
  const [taxIdTouched, setTaxIdTouched] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  // Field errors stay hidden until the person has tried to save once.
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const business = kind === 'business';
  const canonicalTaxId = normaliseTaxId(taxId);
  const errors = {
    taxId: business && !canonicalTaxId ? t('company.taxIdInvalid') : undefined,
    name: name.trim().length < 2 ? t('errors.required') : undefined,
    category: category === null ? t('errors.choose') : undefined,
    address: address.trim().length < 3 ? t('errors.required') : undefined,
    location: location === null ? t('company.needLocation') : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  async function submit() {
    setAttempted(true);
    setError(null);
    if (!valid || !category || !location) {
      // The button stays pressable so it can say what is missing.
      toast.show(t('errors.fixFields'), 'error');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name,
        category,
        address,
        location,
        kind,
        taxId: business ? (canonicalTaxId ?? undefined) : undefined,
      });
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.show(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const rules = ['company.rule1', 'company.rule2', 'company.rule3', 'company.rule4'] as const;
  // Shown once the person has left the field or tried to save, not while they are still typing.
  const showTaxIdError = (taxIdTouched && taxId.trim() !== '') || attempted;

  return (
    <Screen
      scroll
      underHeader
      footer={
        <>
          {error ? (
            <AppText variant="caption" color="danger" center>
              {error}
            </AppText>
          ) : null}
          <Button label={t('company.submit')} loading={busy} onPress={submit} />
        </>
      }>
      <AppText variant="display">{t('company.title')}</AppText>

      <ChoiceChips
        label={t('company.kind')}
        options={[
          { value: 'business', label: t('company.kindBusiness') },
          { value: 'individual', label: t('company.kindIndividual') },
        ]}
        value={kind}
        onChange={setKind}
      />

      {business ? (
        <TextField
          label={t('company.taxId')}
          hint={canonicalTaxId ? t('company.taxIdRead', { taxId: canonicalTaxId }) : t('company.taxIdHint')}
          error={showTaxIdError ? errors.taxId : undefined}
          placeholder="1234567A/A/M/000"
          value={taxId}
          onChangeText={setTaxId}
          onBlur={() => setTaxIdTouched(true)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={24}
        />
      ) : (
        <AppText variant="caption" color="inkMuted">
          {t('company.individualNote')}
        </AppText>
      )}

      <TextField
        label={t('company.name')}
        value={name}
        onChangeText={setName}
        error={attempted ? errors.name : undefined}
        maxLength={80}
      />

      <ChoiceChips
        label={t('company.category')}
        options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
        value={category}
        onChange={setCategory}
        error={attempted ? errors.category : undefined}
      />

      <TextField
        label={t('company.address')}
        hint={t('company.addressHint')}
        value={address}
        onChangeText={setAddress}
        error={attempted ? errors.address : undefined}
        maxLength={200}
      />

      <View style={{ gap: theme.space[2] }}>
        <AppText variant="heading">{t('company.locationTitle')}</AppText>
        <AppText color="inkMuted">{t('company.locationBody')}</AppText>
        <LocationField value={location} onChange={setLocation} />
        {attempted && errors.location ? (
          <AppText variant="caption" color="danger">
            {errors.location}
          </AppText>
        ) : null}
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
