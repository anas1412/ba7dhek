# Building this from Tunisia

Things that work differently, or do not work, because the developer and the users are in Tunisia. Each was checked on 2026-11-13; sources are in [verified-facts.md](../05-reference/verified-facts.md).

## Paying foreign services

### The international tech card
The only standard way for an individual resident to pay a foreign website is the Carte Technologique Internationale (CTI).

- Prepaid, internet-only, issued by banks and La Poste, valid for a calendar year.
- **Ceiling: 1,000 TND a year for an individual.** 10,000 TND for a company.
- Conditions: Tunisian national, resident, at least the baccalauréat; one card per person.
- Permitted uses include hosting of websites and mobile applications, subscriptions to foreign sites, development tools and software licences.
- A raise of the ceiling was announced in May 2025; no change to the rule was found.

### What this means
| Payment | Amount | Status |
|---|---|---|
| Google Play developer registration | 25 USD, once | Fits the card's purpose. **Risk:** Google's help says prepaid cards are not accepted for this fee, and the CTI is prepaid. No report found of a Tunisian developer succeeding or failing. |
| Apple Developer Program | 99 USD a year | Apple asks for a credit card in the developer's own name that can be charged in USD. Whether a CTI is accepted is not confirmed. Apple publishes no list of countries where enrolment is possible. |
| Both together | 124 USD in year one | Should fit within 1,000 TND, leaving little for anything else that year. The exchange rate was not checked. |
| Google Cloud billing (for Google Maps) | None if unused | Avoided entirely; see Maps below. |
| Convex, Expo | Zero on free plans | No card needed. |

**Decision: build on free tiers that need no card, and pay only the two store fees.**

**The Google Play fee is handled:** a friend abroad pays it (Anas, 2026-11-13). When registering, check that Google accepts a card in another person's name on an account verified in the developer's; that is unverified.

**iOS payments and enrolment** are deferred; Anas decides them later.

### Payments inside the app
**None.** The app is free for candidates and employers in the MVP.

If businesses are charged later, it will be through local Tunisian payment methods, chosen at that time. Two constraints are already known:
- Candidates are never charged.
- What is sold must be advertising visibility, not placement. See "Labour law" below.

## Stores

### Google Play
- Tunisia is a supported country for developer registration (verified).
- A personal account created after 13 November 2023 must run a closed test with **at least 12 testers opted in for 14 consecutive days** before applying for production access (verified).
- An organisation account needs a D-U-N-S number, which means a registered company.
- A personal account shows the developer's legal name and country publicly.

**Decision: a personal account.** The 12-tester, 14-day test is folded into the pilot: the first employers and candidates are the testers. See [cold-start.md](cold-start.md).

### App Store
- The App Store operates in Tunisia. Whether an individual in Tunisia can enrol in the developer programme is not confirmed.
- Every iOS build installed on a phone through EAS needs the paid account (verified).
- Sign in with Apple, which iOS requires beside Google, also needs it.

**Decision: Android first.** Android has 83% of the Tunisian mobile market against 17% for iOS (StatCounter, October 2026). iOS follows once the Android pilot works and the Apple enrolment question is answered by trying it.

## Maps
Google Maps on Android needs a Google Cloud billing account with a payment method, and Google's documentation says prepaid cards are not accepted.

**Decision: MapLibre with OpenFreeMap tiles.** No account, no key, no card. Details in [stack.md](../02-architecture/stack.md).

The cost: no address search. Users place a pin.

## Phone sign-in
- Convex Auth can send codes by SMS, but only through an SMS provider that the developer signs up for and pays.
- That means another foreign service, another payment from the tech card, and another entry in the data protection filing.
- No provider or price for Tunisian numbers has been checked.

**Decision: no phone sign-in.** Google accounts are near-universal on Android, which is the launch platform; that is an inference from Android's design, not a measured figure. Revisit only if the welcome screen shows people dropping off.

## Domain
- A `.tn` domain can be registered by an adult individual who is Tunisian or officially resident (per OVH Tunisia; the registry's own FAQ mentions only companies and looks out of date, so confirm with the registrar).
- Price at OVH Tunisia: about 9.7 TND for the first year, 14.3 TND a year after. Paid locally in dinars, so the CTI is not needed.
- Registrars are listed at registre.tn.

**Decision: register `ba7dhek.tn`**, if it is free; availability was not checked. It is needed for the privacy notice, the account deletion page Google requires, and the support email. The Android package name follows: `tn.ba7dhek.app`.

## Hosting data abroad
Tunisian law requires an authorisation from the data protection authority before personal data is sent abroad. All of this app's hosting is abroad.

This is the largest legal constraint in the project and has its own document: [data-protection.md](data-protection.md).

## Labour law: what the app may be
The Code du travail (2010 consolidated text; later amendments to these articles were not found but not ruled out):

- **Art. 285:** private placement offices, free or paid, are abolished.
- **Art. 280:** workers are recruited through public placement offices or directly.
- **Art. 282:** "Les annonces des offres et des demandes d'emploi par la voie des moyens d'information sont autorisées."

So publishing job advertisements is lawful, and acting as a placement agency is not. Where exactly the line falls for an app has not been ruled on, as far as the research found.

**Decision: the app is an advertising medium, and is designed to stay one.**

| The app does | The app does not |
|---|---|
| Publish offers that employers write | Select or screen candidates for employers |
| Show them to people nearby | Recommend a candidate to an employer |
| Let a candidate signal interest | Negotiate, or take part in the hiring |
| Open a chat between the two | Charge per hire or per application |
| | Charge candidates anything |

Three product consequences:
1. **Ranking is by distance only, and is the same for everyone.** The app does not score candidates. Employers see applicants in the order they applied.
2. **The employer decides.** "Match" in the interface means the employer chose to open a conversation.
3. **Future revenue is advertising.** A paid boost for a job post is advertising. A fee per successful hire would look like placement.

**Two more rules from the same research**
- **No labour-hire.** Law n° 2025-9 of 21 May 2025 bans labour subcontracting. Only the business that will itself employ the person may post. Staffing intermediaries are refused at company approval.
- **No jobs abroad.** Placing Tunisians abroad is a separately licensed activity. Every job must have a location in Tunisia.

The same law made the permanent contract the default and limits fixed-term contracts to seasonal work, surges in activity and replacing an absent employee. The app's contract type list stays as a description of the job; the legal form of the contract is the employer's responsibility, and the posting rules say so.

**Before adding any feature that selects, ranks or scores candidates, or any fee tied to hiring, ask a Tunisian labour lawyer about art. 285.**

## Publishing as an individual
- No source was found that requires a company to publish a free app.
- Once there is revenue, the auto-entrepreneur regime (Decree-law n° 2020-33) may apply; this comes from press summaries and is not confirmed for this activity.

**Decision: publish as an individual while the app is free.** Sort out the business form before charging anyone.

## Where users are
- Facebook reaches about 7.8 million people in Tunisia, 63% of the population, and accounts for 85% of social media referrals (DataReportal 2026; StatCounter, October 2026).
- Internet users: 10.4 million, 84% of the population.

Facebook is where candidates are recruited. See [cold-start.md](cold-start.md).

## Summary of what Tunisia rules out or changes
| Area | Effect |
|---|---|
| Card payments abroad | 1,000 TND a year, prepaid; only the store fees are paid |
| Google Maps | Dropped for MapLibre and OpenFreeMap |
| Phone sign-in | Dropped |
| In-app payments | None; local methods later if needed |
| iOS | After Android |
| Foreign hosting | Needs INPDP authorisation first |
| Candidate scoring, per-hire fees | Avoided, to stay an advertising medium |
| Users under 18 | Excluded |
| Staffing agencies, jobs abroad | Excluded |
