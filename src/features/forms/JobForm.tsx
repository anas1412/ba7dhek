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
import { useTheme } from '@/theme';

import { CATEGORIES, CONTRACTS, PAY_PERIODS, type Category, type Contract, type PayPeriodOption } from './options';

export type JobValues = {
  title: string;
  description: string;
  category: Category;
  contractType: Contract;
  payAmount: number;
  payPeriod: PayPeriodOption;
};

type Props = {
  onSubmit: (values: JobValues) => Promise<void>;
  errorMessage: (error: unknown) => string;
};

const PERIOD_KEY = { hour: 'job.periodHour', day: 'job.periodDay', month: 'job.periodMonth' } as const;

/** Accepts "950", "4.5" and "4,5"; anything else is not a pay amount. */
function parsePay(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Posting a job. Pay is mandatory: a card without pay cannot be swiped on honestly. */
export function JobForm({ onSubmit, errorMessage }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [contractType, setContractType] = useState<Contract | null>(null);
  const [pay, setPay] = useState('');
  const [payPeriod, setPayPeriod] = useState<PayPeriodOption>('month');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  // Field errors stay hidden until the person has tried to save once.
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payAmount = parsePay(pay);
  const errors = {
    title: title.trim().length < 3 ? t('errors.required') : undefined,
    pay: payAmount === null ? t('job.needPay') : undefined,
    contract: contractType === null ? t('errors.choose') : undefined,
    category: category === null ? t('errors.choose') : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  async function submit() {
    setAttempted(true);
    setError(null);
    if (!valid || !category || !contractType || payAmount === null) {
      // The button stays pressable so it can say what is missing.
      toast.show(t('errors.fixFields'), 'error');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ title, description, category, contractType, payAmount, payPeriod });
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.show(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // A typed-in pay that cannot be read is flagged at once; an empty one waits for a save attempt.
  const payError = pay.trim() !== '' && payAmount === null ? t('job.needPay') : attempted ? errors.pay : undefined;

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
          <Button label={t('job.submit')} loading={busy} onPress={submit} />
        </>
      }>
      <AppText variant="display">{t('job.title')}</AppText>

      <TextField
        label={t('job.jobTitle')}
        placeholder={t('job.jobTitlePlaceholder')}
        value={title}
        onChangeText={setTitle}
        error={attempted ? errors.title : undefined}
        maxLength={80}
      />

      <TextField
        label={t('job.pay')}
        value={pay}
        onChangeText={setPay}
        keyboardType="decimal-pad"
        error={payError}
        maxLength={10}
      />

      <ChoiceChips
        label={t('job.payPeriod')}
        options={PAY_PERIODS.map((value) => ({ value, label: t(PERIOD_KEY[value]) }))}
        value={payPeriod}
        onChange={setPayPeriod}
      />

      <ChoiceChips
        label={t('job.contract')}
        options={CONTRACTS.map((value) => ({ value, label: t(`contracts.${value}`) }))}
        value={contractType}
        onChange={setContractType}
        error={attempted ? errors.contract : undefined}
      />

      <ChoiceChips
        label={t('job.category')}
        options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
        value={category}
        onChange={setCategory}
        error={attempted ? errors.category : undefined}
      />

      <TextField
        label={`${t('job.description')} (${t('common.optional')})`}
        hint={t('job.descriptionHint')}
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
        <Icon name="map-pin" size={20} color="inkMuted" />
        <AppText variant="caption" color="inkMuted" style={{ flex: 1 }}>
          {t('job.locationNote')}
        </AppText>
      </View>
    </Screen>
  );
}
