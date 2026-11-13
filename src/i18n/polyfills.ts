// React Native's JavaScript engine (Hermes) does not fully implement Intl.
// i18next needs Intl.PluralRules for Arabic's six plural forms, and the
// relative-time formatter needs Intl.RelativeTimeFormat.
// This file must be imported before i18next is initialised.
// See docs/02-architecture/i18n.md.

import '@formatjs/intl-locale/polyfill.js';

import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/ar.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';

import '@formatjs/intl-relativetimeformat/polyfill.js';
import '@formatjs/intl-relativetimeformat/locale-data/ar.js';
import '@formatjs/intl-relativetimeformat/locale-data/fr.js';
import '@formatjs/intl-relativetimeformat/locale-data/en.js';
