# MVP scope

The MVP proves one loop: an employer posts a job, nearby candidates are notified, one swipes right, the employer accepts, and the two are chatting the same day.

## In scope

### Account
- Sign in with Google (through Clerk). On iOS, Sign in with Apple as well, because Apple requires a second option.
- A consent screen: privacy notice, terms of use, and a declaration of being 18 or over.
- Choose a role once: candidate or employer.
- Delete account from inside the app, and request a copy of your data.

### Languages
- Arabic, French and English, chosen from the device language and changeable in settings.
- Arabic is laid out right to left.
- Push notifications arrive in the recipient's language.

### Candidate
- Short profile: name, photo, a two-line "about me", optional experience tags.
- Home point: use current location once, or drop a pin on a map.
- Radius: a slider, in kilometres.
- Card stack of open jobs within the radius, nearest first.
- Swipe right to apply, left to pass.
- List of applications and their state (pending, accepted, rejected).

### Employer
- Company profile: name, category, address, map pin, logo.
- Post a job: title, category, contract type, pay, short description, location (defaults to the company pin).
- Close a job.
- Review the candidates who swiped right on a job; accept or reject each.

### Match and chat
- Accepting a candidate creates a match.
- One text chat per match, updating live.

### Push notifications
- New job inside the candidate's radius.
- Candidate accepted (new match).
- New chat message.
- Employer: a candidate applied (batched).

### Safety
- Employers are approved by hand before their first job goes live.
- Report a job, a company or a user.
- Block a user in chat.
- A word filter on job posts and messages.
- Jobs must be located in Tunisia and posted by the business that will employ the person.

## Out of scope
| Item | Why it waits |
|---|---|
| Email or phone sign-in | Phone codes need Clerk's paid plan, and support for Tunisian numbers is unpublished |
| Payments of any kind | The app is free. Local payment methods come later, if businesses are ever charged |
| Users under 18 | Tunisian law requires a judge's authorisation to process a minor's data |
| Scoring or recommending candidates | The app is an advertising medium, not a placement service |
| Address search on maps | A paid Google service; users drop a pin |
| iOS | After the Android pilot |
| Shift or one-day gig mode | A second product; needs its own flow |
| CV upload and parsing | Adds friction to the one-second apply |
| Ranking beyond distance and recency | No data to rank on yet |
| Commute-time radius | Needs a routing service |
| Background location and "you walked past a job" | Hardest part of any location app; the server-side design avoids it |
| Web dashboard for employers | The app covers posting and review |
| Heat map of hiring density | Needs volume first |
| Remote jobs | No location, no fit |

## Success criteria
These are targets I am proposing, not measurements.

- A new job reaches in-range candidates by push in under 30 seconds.
- A candidate can go from install to first swipe in under 2 minutes.
- An employer can post a job in under 1 minute.
- In the pilot area, a candidate opening the app sees at least 10 open jobs.
- At least half of the right swipes get an employer decision within 24 hours.

## Platform
One codebase for Android and iOS. **Android ships first**; it has 83% of the Tunisian mobile market. iOS follows the pilot. See [decisions.md](decisions.md).

## Gates before real users
1. The data protection filing is accepted and the transfer abroad is authorised. See [data-protection.md](../04-launch/data-protection.md).
2. Google's closed test: 12 testers for 14 days.
