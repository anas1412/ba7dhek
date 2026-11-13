# Design system

The browsable version, with the brand book, live token swatches and the cover, is published here:

**https://claude.ai/artifact/3AGaUmF3s117jSo7AUHZrZ**

It is private to its owner until shared from the page's Share menu.

This file is the copy that lives with the code. [tokens.json](tokens.json) beside it holds the same values in machine-readable form and is the source for the app's theme file (`src/theme`).

**Status:** a small first version, made before any screen exists. Colour, type, spacing and radius only. No components, no icon set, no logo.

## The idea
One colour means "near". The amber `near` token appears only where the interface talks about distance: the distance chip on a job card and the dot that marks you on a map. Everything else is quiet, so distance is the first thing the eye finds on any screen.

## Colour
| Token | Light | Dark | Role |
|---|---|---|---|
| `surface` | `#F7F9FC` | `#0F141B` | App background |
| `surface-raised` | `#FFFFFF` | `#18202B` | Cards, sheets, inputs |
| `ink` | `#14202E` | `#EEF2F7` | Main text |
| `ink-muted` | `#51607A` | `#A3B0C2` | Secondary text, input borders |
| `line` | `#D5DCE6` | `#2A3545` | Dividers, card outlines |
| `brand` | `#1557B8` | `#6EA8FF` | Actions, links, apply |
| `on-brand` | `#FFFFFF` | `#0B1626` | Text on `brand` |
| `brand-soft` | `#DCE8FA` | `#1B2C47` | Chips, selected rows |
| `near` | `#FFD166` | `#FFD166` | Distance, and only distance |
| `on-near` | `#14202E` | `#14202E` | Text on `near` |
| `success` | `#0E7A4B` | `#4FD197` | Accepted, confirmed |
| `danger` | `#B3261E` | `#FF8A80` | Errors, destructive actions |

**Rules**
- `near` is reserved for proximity. Never a warning, badge or decoration.
- Apply is `brand`. Pass is neutral: `ink` on `surface-raised` with a `line` outline.
- `success` and `danger` always come with an icon or a word, never colour alone.
- Control borders use `ink-muted`; `line` is too faint for them.
- Text pairings were chosen to meet a 4.5:1 contrast ratio in both themes, by calculation. Confirm on real devices.

## Type
One family for Arabic, French and English: **Readex Pro**. It covers Arabic and Latin script in one design and is available on Google Fonts under the SIL Open Font License, with weights from 200 to 700 (checked 2026-11-13; see [verified-facts.md](../05-reference/verified-facts.md)).

The app bundles the font files rather than loading them at runtime.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 32 / 40 | 600 | Onboarding headlines |
| `title` | 22 / 30 | 600 | Job title on the card, screen titles |
| `heading` | 18 / 26 | 600 | Section headings, pay on the card |
| `body` | 16 / 24 | 400 | Descriptions, messages |
| `body-strong` | 16 / 24 | 600 | Names, emphasised values |
| `caption` | 13 / 20 | 400 | Timestamps, helper text |
| `label` | 12 / 16 | 500 | Chips, tab labels |

**Rules that come from having three languages**
- No all-capitals styling: Arabic has no capitals.
- No letter-spacing: it breaks Arabic's joined letters.
- Do not tighten line heights: Arabic needs the room.
- Nothing below 12.

## Spacing
| Token | Value | Use |
|---|---|---|
| `space-1` | 4 | Icon to label; inside chips |
| `space-2` | 8 | Between chips; between related lines |
| `space-4` | 16 | Screen sides, card padding, list gaps |
| `space-6` | 24 | Between sections; inside the job card |

## Radius
| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8 | Inputs, small buttons, chat bubbles |
| `radius-lg` | 24 | Job cards, bottom sheets |
| `radius-full` | 999 | Chips, avatars, the round apply and pass buttons |

## Using the tokens in React Native
- Values are in pixels here and are used as density-independent units with the same numbers.
- `src/theme` exports two objects, light and dark, with the same keys. Components read colours from the active theme and never contain a literal colour.
- Spacing and radius are the same in both themes.
- Layout uses start and end, never left and right; see [i18n.md](../02-architecture/i18n.md).

## The job card
The order is fixed, from most to least prominent:

1. Distance, in a `near` chip with `on-near` text, at the top on the leading edge.
2. Job title, in `title`.
3. Pay with its period, in `heading`.
4. Company name and logo, in `body-strong`.
5. Contract type and category, as `brand-soft` chips in `label`.
6. Time since posting, in `caption` and `ink-muted`.
7. Two lines of description, in `body`.

The content of each field is specified in [screens.md](../01-product/screens.md).

## Voice
Plain, short, on the reader's side. The reader may be using a second or third language.

| Use | Avoid |
|---|---|
| 1.2 km from you | Located in your vicinity |
| 900 TND per month | Competitive salary |
| No more jobs within 5 km. Widen your search? | Oops! Nothing here yet |

No exclamation marks and no emoji in interface text.

## Not defined yet
- Components: button, chip, text field, job card, chat bubble. They are added to the design system as the first screens are built.
- An icon set. One outline set, with mirrored forms of directional icons for Arabic.
- A logo. Until there is one, the name is set in Readex Pro at weight 600: "Ba7dhek" and "بحذاك".
- Shadow and motion values.

## Changing the system
Change it in the published design system first, then copy `tokens.json` here and update `src/theme`. The three must not drift.
