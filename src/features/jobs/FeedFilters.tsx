import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { MultiChoiceChips } from '@/components/ChoiceChips';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { CATEGORIES, CONTRACTS, type Category, type Contract } from '@/features/forms/options';
import { currentLanguage } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme';

export type Filters = {
  categories: Category[];
  contractTypes: Contract[];
  startsNow: boolean;
};

export const NO_FILTERS: Filters = { categories: [], contractTypes: [], startsNow: false };

/** How many filters are on, for the badge on the button. */
export function filterCount(filters: Filters): number {
  return filters.categories.length + filters.contractTypes.length + (filters.startsNow ? 1 : 0);
}

/** The button above the stack. It shows how many filters are on, so a short stack is never a mystery. */
export function FilterButton({ filters, onPress }: { filters: Filters; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const count = filterCount(filters);
  const active = count > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? t('filters.buttonActive', { count }) : t('filters.button')}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space[2],
        paddingStart: theme.space[2],
        paddingEnd: theme.space[4],
        borderRadius: theme.radius.sm,
        borderWidth: 1,
        borderColor: active ? 'transparent' : theme.colors.line,
        backgroundColor: active ? theme.colors.brandSoft : pressed ? theme.colors.surfaceContainerHigh : 'transparent',
      })}>
      <Icon name="sliders" size={16} color={active ? 'onBrandSoft' : 'inkMuted'} />
      <AppText variant="label" color={active ? 'onBrandSoft' : 'inkMuted'}>
        {t('filters.button')}
      </AppText>
      {active ? (
        <AppText variant="label" color="onBrandSoft">
          {formatNumber(count, currentLanguage(), 0)}
        </AppText>
      ) : null}
    </Pressable>
  );
}

type Props = {
  filters: Filters;
  /** Called with the new choice when the person confirms. */
  onApply: (filters: Filters) => void;
  onCancel: () => void;
};

/**
 * Narrows the stack by kind of work. Distance is not a filter here: it is the
 * candidate's radius, set once in their profile, and it always decides the order.
 */
export function FeedFilters({ filters, onApply, onCancel }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  // Edited as a draft, so backing out leaves the stack as it was.
  const [draft, setDraft] = useState(filters);

  return (
    <Screen
      scroll
      footer={
        <View style={{ flexDirection: 'row', gap: theme.space[2] }}>
          <View style={{ flex: 1 }}>
            <Button
              label={t('filters.clear')}
              variant="neutral"
              disabled={filterCount(draft) === 0}
              onPress={() => setDraft(NO_FILTERS)}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Button label={t('filters.apply')} onPress={() => onApply(draft)} />
          </View>
        </View>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
        <AppText variant="display" style={{ flex: 1 }}>
          {t('filters.title')}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={8}
          onPress={onCancel}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.full,
            backgroundColor: pressed ? theme.colors.brandSoft : 'transparent',
          })}>
          <Icon name="x" />
        </Pressable>
      </View>
      <AppText color="inkMuted">{t('filters.body')}</AppText>

      <MultiChoiceChips
        label={t('job.start')}
        options={[{ value: 'now', label: t('detail.startsNow') }]}
        values={draft.startsNow ? ['now'] : []}
        onChange={(values) => setDraft({ ...draft, startsNow: values.length > 0 })}
      />
      <MultiChoiceChips
        label={t('job.contract')}
        hint={t('filters.anyHint')}
        options={CONTRACTS.map((value) => ({ value, label: t(`contracts.${value}`) }))}
        values={draft.contractTypes}
        onChange={(contractTypes) => setDraft({ ...draft, contractTypes })}
      />
      <MultiChoiceChips
        label={t('job.category')}
        hint={t('filters.anyHint')}
        options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
        values={draft.categories}
        onChange={(categories) => setDraft({ ...draft, categories })}
      />
    </Screen>
  );
}
