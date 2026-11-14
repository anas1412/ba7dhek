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

export const WORKING_TIMES = ['morning', 'afternoon', 'evening', 'night', 'shifts'] as const;
export type WorkingTime = (typeof WORKING_TIMES)[number];

export const BENEFITS = ['transport', 'meals', 'housing', 'insurance', 'tips'] as const;
export type Benefit = (typeof BENEFITS)[number];

export const EXPERIENCE_LEVELS = ['none', 'some', 'experienced'] as const;
export type Experience = (typeof EXPERIENCE_LEVELS)[number];

export const SPOKEN_LANGUAGES = ['ar', 'fr', 'en', 'de', 'it'] as const;
export type SpokenLanguage = (typeof SPOKEN_LANGUAGES)[number];

export const DAYS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7] as const;
export const MAX_OPENINGS = 99;

/** The radius choices, in metres. The backend accepts 1 to 30 km. */
export const RADII_M = [1000, 3000, 5000, 10000, 20000, 30000] as const;
export const DEFAULT_RADIUS_M = 5000;
