# Decisions

Every decision taken so far, with who took it and why. Decisions marked "Anas" were stated directly. Those marked "delegated" were made on 2026-11-13 after Anas asked for the open questions to be decided, with each one checked against sources first; the reasoning is given so any of them can be overturned.

## Product
| Decision | By | Why |
|---|---|---|
| Name: Ba7dhek | Anas | |
| All job types, ranked by distance | Anas | The idea came from a hotel, but is not limited to hotels |
| Arabic, French and English from the first screen | Anas | |
| Arabic copy in Tunisian dialect, Arabic script | Anas | Legal text is the exception: standard Arabic and French |
| No payments in the app; local methods later if businesses are charged | Anas | |
| A registered business must give its tax ID (matricule fiscal) for verification | Anas | |
| Default language is the device or browser language; English when the device language is not one of the three; changeable | Anas | Settled on 2026-11-14 after two earlier versions |
| Swipes keep the same direction in every language | Anas | A swipe is a physical gesture |
| Onboarding is swiped through, with a practice card that teaches the gesture | Anas | |
| Free for candidates, always | delegated | Product principle, and it keeps the app clear of placement rules |
| Adults only, 18 and over | delegated | Tunisian law requires a family judge's authorisation to process a minor's data |
| The app is an advertising medium, not a placement service | delegated | Code du travail art. 282 permits job advertisements; art. 285 abolishes private placement offices |
| No candidate scoring; applicants shown in order of application | delegated | Follows from the line above |
| Only the actual employer may post; no staffing agencies; jobs in Tunisia only | delegated | Law 2025-9 bans labour subcontracting; placement abroad is separately licensed |
| Swipe direction is the same in all languages | delegated | A gesture is a physical direction; buttons carry labels |

## Platform and stack
| Decision | By | Why |
|---|---|---|
| React Native, Expo, EAS | Anas | |
| Convex backend | Anas | More practical for one developer |
| Convex Auth for sign-in, on the 0.x line | Anas | He has used it before; it removes a US-only service. Version 2.0 does not support React Native yet |
| Google sign-in on Android and iOS | Anas | |
| Sign in with Apple beside Google, on iOS only | delegated | Apple guideline 4.8 rejects an app whose only login is a third-party one |
| Android first, iOS after the pilot | delegated | Android has 83% of the Tunisian market; iOS needs a paid account whose availability from Tunisia is unconfirmed |
| Personal Google Play account | delegated | An organisation account needs a registered company |
| Geo matching on the server; no background location | delegated | Simpler, private, and passes store review more easily |
| MapLibre with OpenFreeMap, not Google Maps | delegated | Google Maps needs a billing account, and Google refuses prepaid cards |
| No phone sign-in | delegated | Needs a paid SMS provider abroad |
| i18next with Intl polyfills | delegated | React Native's engine lacks parts of `Intl` that Arabic plurals need |
| One device per user for push | delegated | The push component stores one token per user |
| Convex production deployment in Ireland | delegated | The easiest destination to defend under the transfer-abroad rule |
| Domain `ba7dhek.tn`, package name `tn.ba7dhek.app` | delegated | Payable locally in dinars; availability not yet checked |
| Publish as an individual while the app is free | delegated | No requirement for a company was found |

## Numbers
All delegated. These are starting values, chosen to be reasonable and adjusted after the pilot.

| Setting | Value |
|---|---|
| Default search radius | 5 km |
| Radius range | 1 to 30 km |
| Largest radius used by the fan-out | 30 km |
| New-job pushes per candidate per day | 5 |
| Quiet hours | 22:00 to 07:00, Tunisian time |
| Job expiry | 30 days, renewable |
| Reports that hide a job pending review | 3, from different users |
| Reminder to an employer with waiting applicants | After 48 hours |
| Fallback language when the device language is not one of the three | English |
| Jobs in the pilot circle before inviting candidates | 30 within 3 km |

Retention periods are in [data-protection.md](../04-launch/data-protection.md).

## Launch
| Decision | By | Why |
|---|---|---|
| Pilot city: Hammamet | Anas | |
| One district first, dense before wide | delegated | The product only works within a few kilometres |
| Pilot area: the district around the hotel that prompted the idea | delegated | A willing first employer already exists there |
| The Google Play fee is paid by a friend abroad | Anas | Avoids the tech card question |
| iOS enrolment, payment and timing | Anas, deferred | He decides these later |
| Employers recruited in person and approved by hand | delegated | Solves the empty-feed problem and the fake-job problem together |
| Candidates recruited through Facebook | delegated | Facebook reaches 63% of the population |
| The Play closed test doubles as the pilot | delegated | 12 testers for 14 days are needed anyway |
| File with the data protection authority before anything else | delegated | Processing without the declaration is a criminal offence, and the answer takes a month |

## What was overturned on the way
| Earlier position | Now | Reason |
|---|---|---|
| Supabase | Convex | Anas's preference |
| Clerk | Convex Auth | Anas's decision, after the code was first wired for Clerk |
| Working name "Bahdhek" | Ba7dhek | Anas's choice |
| Google sign-in alone on iOS | Google and Apple on iOS | Apple guideline 4.8 |
| `react-native-maps` | MapLibre | Billing risk with Google from Tunisia |
| No age limit set | 18 and over | Art. 28 of the data protection law |
| Phone sign-in as the first addition after the MVP | Dropped | Paid plan, and Tunisian SMS support is unpublished |

## Still open
See [open-questions.md](open-questions.md). They are few, and each needs either an outside answer or a fact only Anas has.
