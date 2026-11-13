# Data protection under Tunisian law

This is the legal side of [privacy.md](privacy.md): what Tunisian law requires of this app, what the app does about each requirement, and what must be filed before real users arrive.

**Status of this document.** The articles below were read in the French text of the law and its decree on 2026-11-13; sources are in [verified-facts.md](../05-reference/verified-facts.md). This is a developer's reading, not legal advice. Two points need the authority's own answer or a lawyer, and they are marked.

## The law
- **Organic Law n° 2004-63 of 27 July 2004** on the protection of personal data. In force.
- **Decree n° 2007-3004 of 27 November 2007**, which sets the procedures for declarations and authorisations.
- **The authority:** the Instance Nationale de Protection des Données Personnelles (INPDP).
- A replacement law is in parliament: a 132-article draft, referred to committee in July 2025, still a draft in August 2026. Its status after that is unverified. Build to the 2004 law and re-check before launch.

The law applies to processing by natural persons as well as companies (art. 2 and art. 6). Being a solo developer does not exempt the app.

## What the law requires, and what the app does

### 1. Declare the processing before it starts (art. 7)
> "Toute opération de traitement des données à caractère personnel est soumise à une déclaration préalable déposée au siège de l'Instance"

- Filed at the INPDP against a receipt, by registered letter, or by any means that leaves a written trace.
- If the INPDP does not object within one month, the declaration is accepted.
- An individual can file; the form is signed by the controller personally (decree art. 3).
- The declaration states: identity of the controller, purposes, data collected, recipients, where and how long data is stored, security measures, and a statement of Tunisian nationality, residence and clean record (decree art. 8).
- **Penalty for processing without it: one year's imprisonment and a fine of 5,000 TND (art. 90).**

**App response:** file the declaration before any real user signs up. Allow at least one month. Development with the developer's own test accounts continues meanwhile.

Whether there is a fee and whether filing can be done online are unverified; the INPDP's websites could not be reached during research.

### 2. Get authorisation before sending data abroad (art. 52)
> "Dans tous les cas, l'obtention de l'autorisation de l'Instance pour effectuer le transfert des données à caractère personnel vers l'étranger est obligatoire."

- The INPDP decides within one month. **Here silence means refusal** (decree art. 12), the opposite of the declaration.
- The destination must offer "un niveau de protection adéquat" (art. 51).
- The same art. 90 penalty applies to transferring without authorisation.

**This is the hardest constraint in the whole project.** The app's data lives with Convex, outside Tunisia.

| Service | Where data is stored | Choice |
|---|---|---|
| Convex | US by default; Ireland, Sydney and Canada also offered | Ireland, for production |
| Google (sign-in) | The person signs in with their own Google account; Google sends back name, email and photo | Disclosed in the notice |
| Expo push, FCM, APNs | Outside Tunisia | Push tokens and notification text |

**App response**
- Request the art. 52 authorisation together with the declaration, naming each service and country.
- Use Convex's Ireland region for production, on the reasoning that an EU country is the easiest destination to defend as adequate. Whether the EU or the US is on the INPDP's list of adequate countries (Decision n° 3 of 2018) is unverified.
- Keep what goes abroad to the minimum the app needs.

**Second difficulty: art. 22.** The law requires the controller, the processor and their agents to be Tunisian nationals resident in Tunisia. A foreign cloud provider cannot meet that literally. How the INPDP applies it to cloud hosting is unverified. **Ask the INPDP this question in writing when filing**, or put it to a lawyer.

**If the authorisation is refused or never answered,** the app cannot lawfully keep user data on these services. The fallbacks, none of them verified as workable:
1. Tunisian hosting with a self-hosted backend. Convex publishes a self-hostable version; whether it runs the components this app uses is unverified.
2. A different authentication service that can be self-hosted.

This risk is why the request goes in early, in Milestone 0, before the build is far along.

### 3. Get express, written consent (art. 27)
> "avec le consentement exprès et écrit de la personne concernée"

- Consent is specific to a purpose (art. 30). Advertising needs its own separate consent.
- A service may not be made conditional on consent to unrelated processing (art. 17).
- Data may not be passed to third parties without express consent that leaves a written trace (art. 47).
- Consent can be withdrawn at any time.

**App response**
- A consent screen in onboarding, after sign-in and before any profile data is entered. It is not pre-ticked. Accepting it stores a record: user, date and time, and the version of the notice shown.
- The screen states plainly the one disclosure that matters under art. 47: **when you swipe right on a job, that employer sees your name, photo, "about" text and a distance range.** The right swipe is then the act that triggers a disclosure the user already consented to in writing.
- No advertising and no analytics SDK in the MVP, so no second consent is needed. If either is added, it gets its own switch, off by default.
- Withdrawal of consent is account deletion, available in Settings.

### 4. Tell users what happens to their data (art. 31)
The privacy notice must contain all of:

- the nature of the data collected
- the purposes
- whether each item is mandatory, and what happens if it is not given
- who receives the data
- the controller's name and address
- the rights of access, withdrawal of consent and objection
- how long data is kept
- a summary of the security measures
- **the country data is transferred to**

**App response:** one notice, in French and standard Arabic, with an English version, shown on the consent screen and linked from Settings and the store listings. It lists the services and countries from the table above. The law speaks of notifying a month before processing; in practice the notice is presented before consent, and this timing is a point to confirm with the INPDP.

### 5. Honour access, correction, erasure and objection (arts. 32 to 42)
- Access and a copy within one month. These rights cannot be waived.
- An electronic channel for correction and erasure requests is mandatory (art. 37).
- An objection suspends processing immediately (art. 42).

**App response**
- **Correction:** every profile field is editable in the app.
- **Erasure:** account deletion in Settings, immediate.
- **Access and copy:** a "Request my data" action in Settings that sends a request to the support address; answered within one month with an export. Automating the export can wait.
- **Objection:** treated as deletion, since the app has no processing beyond the service itself.
- A support email address is published in the app, on the store listings and on the website.

### 6. Protect minors: the app is for adults only (art. 28)
A child's data may be processed only with the guardian's consent **and** the authorisation of the family judge. A child is a person under 18 (Child Protection Code, as summarised in secondary sources).

The minimum working age is 16 (Code du travail art. 53), so 16 and 17 year olds may work, but the app cannot practically obtain a judge's authorisation for each.

**Decision: 18 and over.** The consent screen includes a declaration of age. An account found to belong to a minor is deleted.

### 7. Do not collect sensitive data (arts. 13 to 15)
- Art. 13 forbids processing data about criminal records.
- Art. 14 covers racial or genetic origin, religious beliefs, political, philosophical or union opinions, and health. Processing these needs INPDP authorisation.
- Location, name, email and photo are not on the list.

**App response**
- No profile field asks for any of this.
- The employer rules forbid asking candidates for a criminal record extract, health information or religion, in a post or in chat.
- The "about" text and chat are free text and could contain such details. The input hint says not to include them, and reports can flag them.

### 8. Keep data only as long as declared (art. 45)
Data must be destroyed at the end of the declared period or when the purpose is achieved.

**Retention periods to declare.** These are the developer's proposals; the declaration fixes them.

| Data | Kept for |
|---|---|
| Account and profile | Until deletion, or 24 months without signing in, after a warning |
| Home point | Same as the account; replaced when the user changes it |
| Swipes and applications | 12 months after the job closes |
| Chat messages | 12 months after the last message in the match |
| Closed job posts | 12 months after closing |
| Reports | 24 months |
| Consent records | For the life of the account plus 24 months, as proof |

A scheduled job in Convex enforces these. The law also describes a formal destruction procedure with a bailiff's report; how that applies to automatic deletion in an app is a question for the INPDP.

### 9. Secure the data (arts. 18 and 19)
Access control, traceability and backups are required. Penalty for failing: three months and 1,000 TND (art. 94).

**App response:** see [privacy.md](privacy.md) and [auth.md](../02-architecture/auth.md). Every function checks identity and ownership; home points are readable only by server code; secrets stay out of the repository.

## Penalties, in one table
| Breach | Article | Penalty |
|---|---|---|
| Processing without the declaration | 90 | 1 year and 5,000 TND |
| Transfer abroad without authorisation | 90 | 1 year and 5,000 TND |
| Missing consent, missing notice, minors' data | 87 | 2 years and 10,000 TND |
| Security or destruction failures | 94 | 3 months and 1,000 TND |

The INPDP is reported to have referred about thirty cases to prosecutors since July 2023 for failing to declare.

## What to file, in order
1. **Declaration of processing (art. 7).** Purposes, data, recipients, storage places, retention periods and security measures, taken from this document and [privacy.md](privacy.md).
2. **Request for authorisation to transfer abroad (art. 52).** One entry per service and country, with a signed undertaking.
3. **A written question on art. 22** and foreign processors.

File all three together, at the start of Milestone 0. Do not invite a single real user before the declaration's month has passed and the transfer authorisation has been granted.

## What changes in the app because of this
- A consent screen with a stored consent record. See [user-flows.md](../01-product/user-flows.md).
- An age declaration, 18 and over.
- A "Request my data" action.
- A retention job.
- A privacy notice with all the art. 31 items.
- Convex production deployment in Ireland.

## Still to confirm
- The INPDP's current forms, any fee, and whether filing is possible online.
- Which countries are on the adequacy list.
- How art. 22 is applied to cloud providers.
- The status of the draft replacement law.
- Whether "one month before processing" in art. 31 is satisfied by notice at sign-up.

A one-hour consultation with a Tunisian lawyer who files INPDP declarations would settle most of these and is worth its cost.
