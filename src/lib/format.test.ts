import type { TFunction } from 'i18next';
import { describe, expect, test } from 'vitest';

import { pickLanguage } from '@/i18n/languages';

import { distanceParts, formatDistance, formatNumber, formatPay, formatRelativeTime } from './format';

// Stands in for i18next: returns the key with its values, so the test sees what was asked for.
const t = ((key: string, values?: Record<string, unknown>) =>
  `${key}:${JSON.stringify(values ?? {})}`) as unknown as TFunction;

describe('distanceParts', () => {
  test.each([
    [0, 'm', 0],
    [4, 'm', 0],
    [650, 'm', 650],
    [654, 'm', 650],
    [994, 'm', 990],
    [996, 'km', 1],
    [1_000, 'km', 1],
    [1_249, 'km', 1.2],
    [1_250, 'km', 1.3],
    [12_340, 'km', 12.3],
    [-5, 'm', 0],
  ] as const)('%i m becomes %s %d', (meters, unit, value) => {
    expect(distanceParts(meters)).toEqual({ unit, value });
  });
});

describe('formatNumber', () => {
  test('Arabic uses Western digits', () => {
    expect(formatNumber(1.2, 'ar')).toMatch(/^[0-9.,٫]+$/);
    expect(formatNumber(1.2, 'ar')).toContain('1');
    expect(formatNumber(1.2, 'ar')).not.toMatch(/[٠-٩]/);
  });

  test('French uses a decimal comma', () => {
    expect(formatNumber(1.2, 'fr')).toBe('1,2');
  });

  test('English uses a decimal point', () => {
    expect(formatNumber(1.2, 'en')).toBe('1.2');
  });
});

describe('formatDistance and formatPay', () => {
  test('pick the unit key and pass a formatted number', () => {
    expect(formatDistance(650, 'en', t)).toBe('distance.m:{"value":"650"}');
    expect(formatDistance(1_240, 'fr', t)).toBe('distance.km:{"value":"1,2"}');
  });

  test('pay carries its period', () => {
    expect(formatPay(45, 'day', 'en', t)).toBe('pay.day:{"amount":"45"}');
    expect(formatPay(900, 'month', 'en', t)).toBe('pay.month:{"amount":"900"}');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 10, 13, 12, 0, 0);

  test('minutes and hours ago', () => {
    expect(formatRelativeTime(now - 12 * 60_000, now, 'en')).toBe('12 minutes ago');
    expect(formatRelativeTime(now - 3 * 3_600_000, now, 'en')).toBe('3 hours ago');
  });

  test('yesterday reads naturally', () => {
    expect(formatRelativeTime(now - 26 * 3_600_000, now, 'en')).toBe('yesterday');
  });

  test('older than a week falls back to a date', () => {
    expect(formatRelativeTime(now - 10 * 86_400_000, now, 'en')).toContain('2026');
  });

  test('a time in the future is treated as now', () => {
    expect(formatRelativeTime(now + 5_000, now, 'en')).toBe('now');
  });
});

describe('pickLanguage', () => {
  test('uses the device language when the app has it', () => {
    expect(pickLanguage(['en'])).toBe('en');
    expect(pickLanguage(['fr'])).toBe('fr');
    expect(pickLanguage(['ar'])).toBe('ar');
  });

  test('takes the first supported language in the device list', () => {
    expect(pickLanguage(['de', 'ar', 'fr'])).toBe('ar');
    expect(pickLanguage(['it', 'fr'])).toBe('fr');
  });

  test('falls back to English for any other language', () => {
    expect(pickLanguage(['de'])).toBe('en');
    expect(pickLanguage(['it', null])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });
});
