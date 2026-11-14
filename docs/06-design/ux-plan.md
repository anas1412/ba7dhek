# UX plan

Written on 2026-11-14 after the first look at the app in a browser. The screens work but feel like forms on a page: no way back, little feedback, no motion, and the wrong language for someone in Tunisia.

This plan fixes that. It is ordered so the app feels right early, and so the changes that need a new phone build are grouped into one.

## What is wrong today
| Problem | State today |
|---|---|
| No back button | Headers are hidden everywhere; a form can only be left by saving |
| Loading | Buttons show a spinner and screens show one spinner; no placeholders, nothing while a list loads |
| Errors | One red line above the button. No message per field, no offline state, no recovery from a crash |
| No feedback | Saving a job just changes the screen. Nothing says "saved", nothing responds to a press beyond a fade |
| No motion | Screens swap instantly; lists and states appear without transition |
| Language | Follows the device language, so a phone or browser set to English shows English in Tunisia |
| Location | Read once from GPS only. No map, no exact pin, no way to give a job its own location |
| Job form | Six fields. No hours, start date, openings, requirements or benefits |

## 1. Default language
**Rule on first launch**
1. If the person has already chosen a language, use it.
2. Otherwise, use the browser or device language if it is Arabic, French or English.
3. Otherwise, English.

Where the device is plays no part. An earlier version of this plan made someone in Tunisia default to Arabic; that was dropped on 2026-11-14.

**Swipes never mirror.** In Arabic the layout runs right to left, but a swipe keeps its direction: right applies and left passes on a job card, and a swipe left goes to the next onboarding page. The page dots run left to right in every language to match.

**Changing it**
- A language switch on the welcome screen, visible before sign-in. Today the switch is only in Settings, behind sign-in.
- The same switch stays in Settings.
- The choice is remembered and overrides the rule from then on.

## 2. Navigation
- **A header on every screen that is not a tab:** back arrow on the leading side (it flips for Arabic), the screen title, and a trailing action where one applies.
- **Forms open as sheets** that slide up, with "Cancel" in the header. Leaving a form with unsaved text asks first.
- **Tabs keep their place:** returning to a tab shows it as it was left.
- **Android back button** and the back gesture do what the header's back arrow does.
- **Keyboard:** the screen scrolls so the focused field stays visible, "Next" moves between fields, and the submit button stays above the keyboard.

## 3. Feedback
Every action gets an answer within a tenth of a second, and a result within a second or two.

| Moment | Feedback |
|---|---|
| Press any button | It dips in scale and darkens; on the phone, a light tap of vibration |
| Swipe right | The card leaves, a short "Applied" confirmation rises from the bottom, a firmer vibration |
| Swipe left | The card leaves quietly; no message |
| Save a draft, publish, close a job | A message at the bottom: "Draft saved", "Job is live", "Job closed", with Undo where it is safe |
| Employer accepts an applicant | The row changes to "Accepted" in place, then offers "Open chat" |
| A candidate is accepted | The application's row changes state with a brief highlight |
| Something fails | The same bottom message in the danger style, saying what to do, with "Try again" |
| No connection | A thin band under the header: "No connection". Actions that need the network are disabled and say why |

**Bottom messages** are one component used everywhere, announced to screen readers, and never the only place an error appears on a form.

**Disabled buttons explain themselves.** Today "Save as draft" is greyed out with no reason. It will stay pressable-looking until tapped, then point at the first missing field.

## 4. Loading
- **Placeholders shaped like the content:** grey card shapes for the job stack, rows for lists. A spinner only for actions.
- **Nothing blank:** each screen shows its frame and title at once and fills in.
- **Instant on return:** data already seen is shown immediately while it refreshes.
- **Slow network:** after a few seconds a placeholder adds "Still loading"; after longer, "Try again".

## 5. Errors
- **Per field:** a message under the field that is wrong, shown when the person leaves the field or presses submit, not while typing.
- **Scroll to the first error** on submit and focus it.
- **Backend refusals** (blocked words, outside Tunisia, business not approved) are attached to the field they concern.
- **A crash screen** in place of a white page: what happened, "Reload", and nothing lost that was saved.
- **Sign-in failures** say which kind: cancelled, no connection, or refused.

## 6. Motion
Short and purposeful. Everything under 300 ms, and all of it off when the phone asks for reduced motion.

- **Between screens:** the platform's own push and sheet transitions.
- **Lists:** rows fade and rise in on first load; a removed row collapses.
- **State changes:** a chip or status changes with a cross-fade, not a jump.
- **The job stack:** the next card rises as the top one leaves (built); add a slight overshoot when a card springs back, and stamps that scale in.
- **Choice chips:** the selected one fills from the centre.
- **Success moments:** applying and being accepted get a check mark that draws itself. Nothing else is celebrated.

## 7. Location, with a map
Today a point can only come from the phone's GPS. That is wrong for an employer posting from home, and it gives no way to check the point.

**A map picker**, used in three places: the candidate's starting point, the business location, and a job's own location.
- A full-screen map with a fixed pin in the centre; the person moves the map under it.
- "Use my current location" jumps the map to the phone's position.
- The address field and the pin sit together, so the text and the point can be compared.
- A search box for places and streets, if a free search service proves usable; see open questions.

**Exact location for jobs**
- A job shows its exact place: the address and a map with the pin, on the job detail screen. A job's location is public by nature.
- Each job can have its own location, defaulting to the business's. A hotel with a second site, or a delivery job starting elsewhere, sets a different pin.
- The card keeps "650 m from you" as the headline; the detail screen adds the map and "Open in Maps".

**What stays private:** a candidate's starting point. It is still never shown to anyone, and employers still see a distance range only. This is a rule from the privacy design and from Tunisian data protection law, and this plan does not change it.

## 8. A fuller job form
Three short steps with a progress bar, in place of one long page. Each step can be left and returned to; the draft saves as it goes.

**Step 1, the job**
- Title, category, contract type
- Number of openings
- Start: immediately, or a date

**Step 2, the terms**
- Pay and period (mandatory), with an optional range
- Working time: morning, afternoon, evening, night, shifts; days per week
- Benefits, as chips: transport, meals, housing, insurance, tips. Housing and meals matter for hotel work.

**Step 3, the person and the place**
- Experience: none needed, some, experienced
- Languages needed
- Description
- Location: the business, or another pin

**The card and detail screen** gain the fields that help a decision: working time and benefits as chips, "3 openings", "Starts now".

**More for the others**
- **Business:** logo, a short description, a phone number shown only to accepted applicants.
- **Candidate:** experience tags, languages, availability; photo from Google or replaced.
- **Filters on the stack:** category, contract type and working time, remembered between sessions.
- **Settings:** radius, notification choices, theme (system, light, dark).

## 9. Visual polish
- **App icon and logo:** the placeholder icon goes; the design system's blue and amber mark comes in.
- **Sections as cards** on long forms, each with an icon and a title, so the page has rhythm.
- **Icons inside fields** where they help: pin on address, briefcase on title.
- **Illustrated empty states:** simple line drawings in the brand colours for the three main empty screens.
- **Consistent spacing and touch targets:** nothing tappable smaller than 44 points.

## 10. Accessibility
- Every control has a label a screen reader can read, in the active language.
- Text scales with the phone's font size setting without breaking layouts.
- Colour is never the only signal; this is already a design-system rule.
- Focus order follows reading order, including right to left.

## Order of work
| Phase | What | Needs a new phone build |
|---|---|---|
| A | Language follows place; language switch on the welcome screen | No |
| B | Headers and back, forms as sheets, keyboard handling | No |
| C | Bottom messages, press feedback, per-field errors, disabled-button explanations, offline band, crash screen | No |
| D | Placeholders, list and state motion, stack polish | No |
| E | Job form in three steps with the new fields; job detail screen; filters | No, but the backend schema grows |
| F | Map picker, exact job location, vibration | **Yes: maps and vibration are native** |
| G | Icon, logo, illustrations | Yes, for the icon |

Phases A to E can be seen in the browser as they land. F and G are grouped so one new build covers both, along with the location package already waiting for a rebuild.

Chat, push notifications, report and block, and account deletion are still owed for the MVP. They come after phase D, built with these patterns from the start.

## Progress
| Phase | State | Checked how |
|---|---|---|
| A. Default language | Built 2026-11-14 | A browser set to English opens in English; the switch changes it and the choice is kept. Any other device language falls back to English |
| Swipe onboarding | Built 2026-11-14 | Swiped between pages and on the practice card in the browser. Swipe left goes forward in English and in Arabic |
| B. Headers, back, sheets, keyboard | Built 2026-11-14 | Back and forward between screens in the browser. Sheet presentation and keyboard behaviour need a phone |
| C. Feedback, field errors, offline, crash screen | Built 2026-11-14 | Empty job form marks its fields and shows a message. The offline band and crash screen were not triggered |
| Tax ID for businesses | Built 2026-11-14 | Backend tests, and the form in the browser |
| Images: profile photo, business logo, up to 4 photos per job offer | Built 2026-11-14 | Backend limits by tests; the grid and the card in the browser with sample tiles. Picking, shrinking and sending a real photo has not been run anywhere |
| D. Placeholders and motion | Built 2026-11-14 | Placeholders seen in the browser preview; rows fade in and a decision swaps in place. Chip fill, the drawn check mark and "still loading" after a delay are not built |
| E. Fuller job form, job detail, filters | Built | Three-step form with openings, start, working time, days per week, benefits, experience and languages. Filters on the stack by category, contract and immediate start, kept for the session only. Detail screen opens from the card, an application, or the employer's list. Checked in the browser preview only; the signed-in detail screen is covered by backend tests, not yet seen with real data |
| F. Map picker, vibration | Not started | |
| G. Icon, logo, illustrations | Not started | |

Not built from phases B and C: the warning before leaving a form with unsaved text, "Undo" on result messages, and scrolling to the first field in error.

## Open questions
- **Place search on the map.** It needs a geocoding service. Google's is paid and needs a billing account, which is the problem that ruled out Google Maps. Free services built on OpenStreetMap exist; their terms, limits and coverage of Tunisian streets are unverified. If none fits, the map ships without search.
- **Pay range.** Showing "900 to 1,100" is more honest for some jobs and vaguer for others. The plan allows it as an option; it could be left out.
- **Phone number for businesses.** Useful, and one more piece of personal data to declare. It could wait.
- **"Exact location, not proximity."** This plan reads it as: jobs and businesses show and set an exact place on a map. It does not read it as showing where candidates live.
