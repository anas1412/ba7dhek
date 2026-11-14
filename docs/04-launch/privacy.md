# Privacy

The app's core data is where people live. That makes privacy a design constraint, not a document to write at the end.

**This file describes the design.** What Tunisian law requires, article by article, and what must be filed, is in [data-protection.md](data-protection.md).

## What is collected
| Data | Source | Purpose |
|---|---|---|
| Name, photo, Google account identifier, email | Google sign-in, through Convex Auth | Account and profile |
| Role | User | Which side of the app they see |
| About text, experience tags | Candidate | Shown to employers they apply to |
| Home point (coordinates) | Candidate: GPS once, or a map pin | Feed and notifications |
| Search radius | Candidate | Feed and notifications |
| Company details and location | Employer | Shown on job posts |
| Job offer photos, up to 4 per offer, and one business logo | Employer | Shown on job posts. Stored in Convex file storage |
| Profile photo | Candidate: from Google, or uploaded, or none | Shown to employers the candidate applies to. A photo is never required |
| Tax ID (matricule fiscal) | Employer, when a registered business | Checking the business before approval. Never shown to candidates. For a sole trader this identifies a person, so it belongs in the data protection declaration |
| Job posts | Employer | The product |
| Swipes and decisions | Both | Applications and matching |
| Chat messages | Both | Communication |
| Push token | Device | Notifications |
| Language | Device or user | Interface and notification language |
| Consent record | User's acceptance | Proof of consent: time and notice version |

Not collected: continuous location, contacts, CVs, identity documents, payment details, date of birth (age is a declaration), and nothing about health, religion, origin, opinions or criminal record.

## Location: the rules
1. **One point, not a trail.** The app stores a single home point per candidate. It never tracks movement and never requests background location.
2. **Optional GPS.** A candidate can place the pin by hand and never grant location permission.
3. **Never shown to anyone.** No other user receives a candidate's coordinates. Employers get a distance bucket (for example "1 to 3 km"), computed on the server.
4. **Buckets, not figures.** An exact distance from a known point narrows a home to a circle, and two employers comparing notes could narrow it further. Buckets blunt that.
5. **It need not be the real home.** The interface says "your starting point" and suggests that a nearby landmark works as well.

Rule 5 is worth stating in onboarding: it costs nothing and removes the most sensitive datum for anyone who is cautious.

## Who sees what
| Data | Candidate sees | Employer sees |
|---|---|---|
| Candidate's name, photo, about | Their own | Only for candidates who swiped right on their job |
| Candidate's home point | Their own | Never |
| Candidate's distance | Exact, to each job | Bucket only |
| Candidate's left swipes | Their own | Never |
| Company and job details | All open jobs in range | Their own |
| Chat | Their own matches | Their own matches |

There is no way to browse or search candidates.

## Third parties
| Service | Receives | Where |
|---|---|---|
| Google | The sign-in itself; Google learns that the person uses the app | Outside Tunisia |
| Convex | All app data | Ireland for production (US, Sydney and Canada also offered) |
| Expo Push, then Google (FCM) and Apple (APNs) | Push tokens and notification content | Outside Tunisia |
| OpenFreeMap | Requests for map tiles of the areas viewed, with the device's IP address | Outside Tunisia; no account or identifier |

All of these are outside Tunisia, which Tunisian law permits only with the data protection authority's authorisation. See [data-protection.md](data-protection.md).

The map never sends a candidate's home point to the tile service. It sends which tiles are on screen, which is coarser, but a person centring the map on their home does reveal the area. This is disclosed in the notice.

**Notification content.** Pushes pass through Expo, Google and Apple. Message previews are therefore visible to those services. Keep previews short; do not put anything in a push that should not appear on a lock screen.

## Consent
- **The consent screen.** After sign-in and before any profile data is entered, the user sees the privacy notice and terms, declares they are 18 or over, and accepts. Nothing is pre-ticked. The acceptance is stored with its time and the notice version. Tunisian law requires consent to be express and written.
- The screen says in plain words that swiping right on a job shows that employer the candidate's name, photo, "about" text and a distance range.
- Location permission is requested only when the candidate taps "Use my current location", with a sentence explaining that it is read once.
- Push permission is requested after an explanation screen; see [notifications.md](../01-product/notifications.md).
- The privacy policy is linked from the welcome screen and from Settings, in three languages.

## Retention and deletion
- **Account deletion** is in the app and immediate: profile, home point, swipes and push tokens are removed; the employer's jobs are closed; the sign-in records are deleted with the rest.
- Messages a deleted user sent remain in the other person's chat, attributed to "Deleted user", until the chat's own retention period ends.
- Reports are kept after deletion of the reported account, without the profile data, to prevent re-registration abuse.
- **Retention periods** for everything else are in [data-protection.md](data-protection.md): accounts unused for 24 months, and swipes, chats and closed jobs after 12 months. A scheduled job enforces them, every night; what it does rule by rule is in data-protection.md.
- **Photos never attached:** a photo is uploaded first and attached second. If the second step never happens, the file is removed within about a day. The cleanup reads every user, business and job to know what is in use; if those tables outgrow what one function may read, it fails and deletes nothing, and must then be rebuilt to track uploads as they happen.
- **Request my data:** no button in the app (Anas's decision, 2026-11-14). The consent notice says a copy can be asked for; a request is answered by hand, within one month. This needs a contact address, which does not exist yet.
- **Who can read a chat:** its two people. Staff can read one only when one of them reports the other from inside it, only while that report is open, and each reading is recorded. The person reporting is told this before sending. This belongs in the privacy notice shown to users.
- **Delete my account:** built 2026-11-14. Settings, two presses, immediate. See `convex/account.ts` for what is removed and what is kept.

Apple requires in-app account deletion, and Google requires it plus a web page where deletion can be requested (verified); see [store-readiness.md](store-readiness.md).

## Security basics
- All access goes through Convex functions that check identity and ownership; see [auth.md](../02-architecture/auth.md).
- Session tokens are stored with `expo-secure-store`.
- Secrets live in Convex and EAS environment settings, never in the repository.
- The geo index of candidate home points is readable only by server functions.

## Legal
Covered in [data-protection.md](data-protection.md). In short:

- A declaration to the data protection authority is mandatory before processing starts.
- An authorisation is mandatory before data is hosted abroad.
- Consent must be express and written.
- The app is for adults only.
- Both filings are made in Milestone 0, and no real user signs up before they are cleared.
