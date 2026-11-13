// Fails when the three locale files do not carry the same keys, or when a
// plural key is missing a form its language needs.
// Run with: npm run check:locales

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGUAGES = ['en', 'fr', 'ar'];
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');

function flatten(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    value !== null && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}

const errors = [];
const baseKeys = {};
const pluralForms = {};

for (const language of LANGUAGES) {
  const entries = flatten(JSON.parse(readFileSync(join(localesDir, `${language}.json`), 'utf8')));
  baseKeys[language] = new Set();
  pluralForms[language] = new Map();

  for (const [key, value] of entries) {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${language}: "${key}" is empty or not a string`);
    }
    const match = key.match(PLURAL_SUFFIX);
    const base = match ? key.slice(0, match.index) : key;
    baseKeys[language].add(base);
    if (match) {
      if (!pluralForms[language].has(base)) pluralForms[language].set(base, new Set());
      pluralForms[language].get(base).add(match[1]);
    }
  }
}

// Same keys everywhere, ignoring plural suffixes (languages differ in how many forms they have).
const reference = baseKeys.en;
for (const language of LANGUAGES) {
  for (const key of reference) {
    if (!baseKeys[language].has(key)) errors.push(`${language}: missing "${key}"`);
  }
  for (const key of baseKeys[language]) {
    if (!reference.has(key)) errors.push(`${language}: extra "${key}" (not in en)`);
  }
}

// Every plural key carries each form its language requires.
for (const language of LANGUAGES) {
  const required = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
  for (const [base, forms] of pluralForms[language]) {
    for (const category of required) {
      if (!forms.has(category)) errors.push(`${language}: "${base}" lacks the "${category}" form`);
    }
  }
}

// Interpolation placeholders must match the English ones.
const placeholders = (text) => [...String(text).matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();
const byLanguage = Object.fromEntries(
  LANGUAGES.map((language) => [
    language,
    new Map(flatten(JSON.parse(readFileSync(join(localesDir, `${language}.json`), 'utf8')))),
  ]),
);
for (const language of LANGUAGES.filter((l) => l !== 'en')) {
  for (const [key, value] of byLanguage[language]) {
    const base = key.replace(PLURAL_SUFFIX, '');
    const englishKey = byLanguage.en.has(key) ? key : `${base}_other`;
    if (!byLanguage.en.has(englishKey)) continue;
    const expected = placeholders(byLanguage.en.get(englishKey));
    const actual = placeholders(value);
    // A plural form may drop {{count}} when the word itself says the number ("two jobs").
    const missing = expected.filter((p) => !actual.includes(p) && !(p === 'count' && key !== base));
    const extra = actual.filter((p) => !expected.includes(p));
    if (missing.length || extra.length) {
      errors.push(`${language}: "${key}" placeholders differ from en (${[...missing.map((p) => `-${p}`), ...extra.map((p) => `+${p}`)].join(', ')})`);
    }
  }
}

if (errors.length) {
  console.error(`Locale check failed with ${errors.length} problem(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`Locale check passed: ${reference.size} keys in ${LANGUAGES.join(', ')}.`);
