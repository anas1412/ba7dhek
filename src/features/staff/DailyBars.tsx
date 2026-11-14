import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { currentLanguage } from '@/i18n';
import { formatLocale } from '@/i18n/languages';
import { formatNumber } from '@/lib/format';
import { useTheme } from '@/theme';

type Point = { day: string; count: number };

type Props = {
  title: string;
  /** One entry per day, oldest first. */
  data: Point[];
};

const PLOT_HEIGHT = 96;
// A column never fills its slot: capped, so the leftover of the band stays air.
const MAX_BAR = 24;

function dayLabel(day: string, locale: string): string {
  // The day is a calendar date ("2026-11-14"); noon keeps it the same date in every time zone.
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00Z`));
}

/**
 * One measure over the last days, as thin columns from a single baseline.
 * The total is the headline; the columns show the shape. Pressing or hovering
 * a column names its day and value. One series, so no legend: the title names it.
 * Time runs left to right in every language, as on any chart.
 */
export function DailyBars({ title, data }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = currentLanguage();
  const locale = formatLocale(language);
  const [active, setActive] = useState<number | null>(null);

  const total = data.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(1, ...data.map((point) => point.count));
  const shown = active !== null ? data[active] : null;
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <View
      // Read out as one sentence, then the figures day by day: the table behind the picture.
      accessibilityRole="image"
      accessibilityLabel={`${title}: ${formatNumber(total, language, 0)}. ${data
        .map((point) => `${dayLabel(point.day, locale)} ${point.count}`)
        .join(', ')}`}
      style={{
        gap: theme.space[2],
        padding: theme.space[4],
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceRaised,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.space[2] }}>
        <AppText variant="label" style={{ flex: 1 }}>
          {title}
        </AppText>
        <AppText variant="title">{formatNumber(total, language, 0)}</AppText>
      </View>

      {/* The line under the title: the pressed day's figure, or what the total covers. */}
      <AppText variant="caption" color="inkMuted">
        {shown
          ? `${dayLabel(shown.day, locale)} · ${formatNumber(shown.count, language, 0)}`
          : t('admin.chartPeriod', { count: data.length })}
      </AppText>

      <View style={{ direction: 'ltr' }}>
        <View
          style={{
            height: PLOT_HEIGHT,
            flexDirection: 'row',
            alignItems: 'flex-end',
            // The baseline: one quiet rule the columns stand on.
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.line,
          }}>
          {data.map((point, index) => {
            const height = point.count === 0 ? 0 : Math.max(3, Math.round((point.count / max) * (PLOT_HEIGHT - 8)));
            return (
              <Pressable
                key={point.day}
                accessible={false}
                // The whole slot is the target, much larger than the column itself.
                onPressIn={() => setActive(index)}
                onHoverIn={() => setActive(index)}
                onHoverOut={() => setActive((current) => (current === index ? null : current))}
                style={{ flex: 1, height: PLOT_HEIGHT, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 1 }}>
                <View
                  style={{
                    width: '100%',
                    maxWidth: MAX_BAR,
                    height,
                    // Rounded at the data end, square where it meets the baseline.
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    backgroundColor: theme.colors.chart,
                    opacity: active === null || active === index ? 1 : 0.45,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.space[1] }}>
          <AppText variant="caption" color="inkMuted">
            {first ? dayLabel(first.day, locale) : ''}
          </AppText>
          <AppText variant="caption" color="inkMuted">
            {t('admin.chartPeak', { value: formatNumber(max === 1 && total === 0 ? 0 : max, language, 0) })}
          </AppText>
          <AppText variant="caption" color="inkMuted">
            {last ? dayLabel(last.day, locale) : ''}
          </AppText>
        </View>
      </View>
    </View>
  );
}
