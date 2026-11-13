import type { TFunction } from 'i18next';

import { formatLocale, type Language } from '@/i18n/languages';

/**
 * Splits a distance into a number and a unit: metres under 1 km (rounded to
 * 10 m), kilometres with one decimal above.
 */
export function distanceParts(meters: number): { unit: 'm' | 'km'; value: number } {
  const safe = Math.max(0, meters);
  const roundedM = Math.round(safe / 10) * 10;
  if (roundedM < 1000) return { unit: 'm', value: roundedM };
  return { unit: 'km', value: Math.round(safe / 100) / 10 };
}

export function formatNumber(value: number, language: Language, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(formatLocale(language), { maximumFractionDigits }).format(value);
}

/** "650 m" or "1.2 km", in the reader's language and with Western digits. */
export function formatDistance(meters: number, language: Language, t: TFunction): string {
  const { unit, value } = distanceParts(meters);
  return t(`distance.${unit}`, { value: formatNumber(value, language) });
}

export type PayPeriod = 'hour' | 'day' | 'month';

/** Pay is always shown with its period: "45 TND per day". */
export function formatPay(
  amount: number,
  period: PayPeriod,
  language: Language,
  t: TFunction,
): string {
  return t(`pay.${period}`, { amount: formatNumber(amount, language, 3) });
}

const RELATIVE_STEPS: [limitSeconds: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86_400, 3600, 'hour'],
  [604_800, 86_400, 'day'],
];

/** "12 minutes ago" for the last week, a plain date after that. */
export function formatRelativeTime(timestamp: number, now: number, language: Language): string {
  const locale = formatLocale(language);
  const elapsed = Math.max(0, Math.round((now - timestamp) / 1000));
  for (const [limit, divisor, unit] of RELATIVE_STEPS) {
    if (elapsed < limit) {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        -Math.floor(elapsed / divisor),
        unit,
      );
    }
  }
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    timestamp,
  );
}
