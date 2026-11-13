// Stored as stable keys, translated in the app. Must match convex/lib/validate.ts and convex/schema.ts.

export const CATEGORIES = [
  'hospitality',
  'restaurant',
  'retail',
  'logistics',
  'construction',
  'health',
  'office',
  'education',
  'agriculture',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONTRACTS = ['full_time', 'part_time', 'seasonal', 'temporary', 'internship'] as const;
export type Contract = (typeof CONTRACTS)[number];

export const PAY_PERIODS = ['hour', 'day', 'month'] as const;
export type PayPeriodOption = (typeof PAY_PERIODS)[number];

/** The radius choices, in metres. The backend accepts 1 to 30 km. */
export const RADII_M = [1000, 3000, 5000, 10000, 20000, 30000] as const;
export const DEFAULT_RADIUS_M = 5000;
