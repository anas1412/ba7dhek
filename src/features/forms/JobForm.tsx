import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Swap } from '@/components/Appear';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChoiceChips, MultiChoiceChips } from '@/components/ChoiceChips';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { StepProgress } from '@/components/StepProgress';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { currentLanguage } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { LocationField, type Point } from '@/features/location/LocationField';
import { useTheme } from '@/theme';

import {
  BENEFITS,
  CATEGORIES,
  CONTRACTS,
  DAYS_PER_WEEK,
  EXPERIENCE_LEVELS,
  MAX_OPENINGS,
  PAY_PERIODS,
  SPOKEN_LANGUAGES,
  WORKING_TIMES,
  type Benefit,
  type Category,
  type Contract,
  type Experience,
  type PayPeriodOption,
  type SpokenLanguage,
  type WorkingTime,
} from './options';

export type JobValues = {
  title: string;
  description: string;
  category: Category;
  contractType: Contract;
  payAmount: number;
  payPeriod: PayPeriodOption;
  openings: number;
  startsNow: boolean;
  workingTimes: WorkingTime[];
  /** Left out when the employer did not say. */
  daysPerWeek?: number;
  benefits: Benefit[];
  experience?: Experience;
  languages: SpokenLanguage[];
  /** Left out when the work is at the business itself. */
  location?: Point;
};

type Props = {
  onSubmit: (values: JobValues) => Promise<void>;
  errorMessage: (error: unknown) => string;
};

const PERIOD_KEY = { hour: 'job.periodHour', day: 'job.periodDay', month: 'job.periodMonth' } as const;
const STEP_TITLE = ['job.stepJob', 'job.stepPay', 'job.stepPerson'] as const;
const LAST_STEP = STEP_TITLE.length - 1;

/** Accepts "950", "4.5" and "4,5"; anything else is not a pay amount. */
function parsePay(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Posting a job, in three short steps: the job, pay and hours, the person.
 * Only the title, category, contract and pay are required; pay is mandatory
 * because a card without it cannot be swiped on honestly.
 */
export function JobForm({ onSubmit, errorMessage }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const language = currentLanguage();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [contractType, setContractType] = useState<Contract | null>(null);
  const [openings, setOpenings] = useState(1);
  const [startsNow, setStartsNow] = useState(true);

  const [pay, setPay] = useState('');
  const [payPeriod, setPayPeriod] = useState<PayPeriodOption>('month');
  const [workingTimes, setWorkingTimes] = useState<WorkingTime[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);

  const [experience, setExperience] = useState<Experience | null>(null);
  const [languages, setLanguages] = useState<SpokenLanguage[]>([]);
  const [description, setDescription] = useState('');
  const [elsewhere, setElsewhere] = useState(false);
  const [location, setLocation] = useState<Point | null>(null);

  const [busy, setBusy] = useState(false);
  // A step's errors stay hidden until the person has tried to leave it once.
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const payAmount = parsePay(pay);
  const errors = {
    title: title.trim().length < 3 ? t('errors.required') : undefined,
    category: category === null ? t('errors.choose') : undefined,
    contract: contractType === null ? t('errors.choose') : undefined,
    pay: payAmount === null ? t('job.needPay') : undefined,
  };
  // Choosing "somewhere else" without saying where is the one way the last step can be wrong.
  const placeError = elsewhere && location === null ? t('job.needPlace') : undefined;
  const stepValid = [!errors.title && !errors.category && !errors.contract, !errors.pay, !placeError];
  const tried = attempted.has(step);

  function goTo(next: number) {
    setError(null);
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function next() {
    setAttempted((current) => new Set(current).add(step));
    if (!stepValid[step]) {
      // The button stays pressable so it can say what is missing.
      toast.show(t('errors.fixFields'), 'error');
      return;
    }
    goTo(step + 1);
  }

  async function submit() {
    setError(null);
    setAttempted((current) => new Set(current).add(LAST_STEP));
    const firstBad = stepValid.findIndex((ok) => !ok);
    if (firstBad !== -1 || !category || !contractType || payAmount === null) {
      // Cannot happen through the buttons, but a step is never skipped silently.
      setAttempted(new Set([0, 1, 2]));
      toast.show(t('errors.fixFields'), 'error');
      if (firstBad !== -1) goTo(firstBad);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        title,
        description,
        category,
        contractType,
        payAmount,
        payPeriod,
        openings,
        startsNow,
        workingTimes,
        daysPerWeek: daysPerWeek ?? undefined,
        benefits,
        experience: experience ?? undefined,
        languages,
        location: elsewhere && location ? location : undefined,
      });
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.show(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  // A typed-in pay that cannot be read is flagged at once; an empty one waits for an attempt.
  const payError = pay.trim() !== '' && payAmount === null ? t('job.needPay') : tried ? errors.pay : undefined;
  const optional = (key: string) => `${t(key)} (${t('common.optional')})`;

  return (
    <Screen
      scroll
      underHeader
      scrollRef={scroll}
      footer={
        <>
          {error ? (
            <AppText variant="caption" color="danger" center>
              {error}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
            {step > 0 ? (
              <View style={{ flex: 1 }}>
                <Button label={t('common.back')} variant="neutral" disabled={busy} onPress={() => goTo(step - 1)} />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              {step < LAST_STEP ? (
                <Button label={t('common.next')} onPress={next} />
              ) : (
                <Button label={t('job.submit')} loading={busy} onPress={submit} />
              )}
            </View>
          </View>
        </>
      }>
      <AppText variant="display">{t('job.title')}</AppText>
      <StepProgress
        current={step + 1}
        total={STEP_TITLE.length}
        title={t(STEP_TITLE[step])}
        label={t('job.step', { current: step + 1, total: STEP_TITLE.length })}
      />

      {step === 0 ? (
        <Swap key="job" style={{ gap: theme.space[4] }}>
          <TextField
            label={t('job.jobTitle')}
            placeholder={t('job.jobTitlePlaceholder')}
            value={title}
            onChangeText={setTitle}
            error={tried ? errors.title : undefined}
            maxLength={80}
          />
          <ChoiceChips
            label={t('job.category')}
            options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
            value={category}
            onChange={setCategory}
            error={tried ? errors.category : undefined}
          />
          <ChoiceChips
            label={t('job.contract')}
            options={CONTRACTS.map((value) => ({ value, label: t(`contracts.${value}`) }))}
            value={contractType}
            onChange={setContractType}
            error={tried ? errors.contract : undefined}
          />
          <Stepper
            label={t('job.openings')}
            value={openings}
            min={1}
            max={MAX_OPENINGS}
            onChange={setOpenings}
            fewerLabel={t('job.fewer')}
            moreLabel={t('job.more')}
          />
          <ChoiceChips
            label={t('job.start')}
            options={[
              { value: 'now', label: t('job.startNow') },
              { value: 'later', label: t('job.startLater') },
            ]}
            value={startsNow ? 'now' : 'later'}
            onChange={(value) => setStartsNow(value === 'now')}
          />
        </Swap>
      ) : null}

      {step === 1 ? (
        <Swap key="pay" style={{ gap: theme.space[4] }}>
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
          <MultiChoiceChips
            label={optional('job.workingTimes')}
            hint={t('job.chooseAny')}
            options={WORKING_TIMES.map((value) => ({ value, label: t(`workingTimes.${value}`) }))}
            values={workingTimes}
            onChange={setWorkingTimes}
          />
          <ChoiceChips
            label={optional('job.daysPerWeek')}
            options={DAYS_PER_WEEK.map((value) => ({ value, label: formatNumber(value, language, 0) }))}
            value={daysPerWeek}
            // A second tap on the chosen number clears it again.
            onChange={(value) => setDaysPerWeek(value === daysPerWeek ? null : value)}
          />
          <MultiChoiceChips
            label={optional('job.benefits')}
            hint={t('job.chooseAny')}
            options={BENEFITS.map((value) => ({ value, label: t(`benefits.${value}`) }))}
            values={benefits}
            onChange={setBenefits}
          />
        </Swap>
      ) : null}

      {step === 2 ? (
        <Swap key="person" style={{ gap: theme.space[4] }}>
          <ChoiceChips
            label={optional('job.experience')}
            options={EXPERIENCE_LEVELS.map((value) => ({ value, label: t(`experience.${value}`) }))}
            value={experience}
            onChange={(value) => setExperience(value === experience ? null : value)}
          />
          <MultiChoiceChips
            label={optional('job.languages')}
            hint={t('job.chooseAny')}
            options={SPOKEN_LANGUAGES.map((value) => ({ value, label: t(`spoken.${value}`) }))}
            values={languages}
            onChange={setLanguages}
          />
          <TextField
            label={optional('job.description')}
            hint={t('job.descriptionHint')}
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
            multiline
          />
          <ChoiceChips
            label={t('job.place')}
            options={[
              { value: 'business', label: t('job.placeBusiness') },
              { value: 'elsewhere', label: t('job.placeElsewhere') },
            ]}
            value={elsewhere ? 'elsewhere' : 'business'}
            onChange={(value) => setElsewhere(value === 'elsewhere')}
          />
          {elsewhere ? (
            <>
              <LocationField value={location} onChange={setLocation} pickerTitle={t('job.place')} visibility="public" />
              {tried && placeError ? (
                <AppText variant="caption" color="danger">
                  {placeError}
                </AppText>
              ) : null}
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
              <Icon name="map-pin" size={20} color="inkMuted" />
              <AppText variant="caption" color="inkMuted" style={{ flex: 1 }}>
                {t('job.locationNote')}
              </AppText>
            </View>
          )}
        </Swap>
      ) : null}
    </Screen>
  );
}
