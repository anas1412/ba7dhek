# Data model

Convex tables. Field types are written loosely here; the real definitions go in `convex/schema.ts` with Convex validators. Every table also has Convex's automatic `_id` and `_creationTime`.

## users
One row per signed-in person.

| Field | Type | Notes |
|---|---|---|
| `name`, `image`, `email` | string, optional | Written by Convex Auth at sign-in, from Google |
| `role` | `"candidate"` \| `"employer"` \| unset | Chosen once after first sign-in |
| `name` | string | Prefilled from Google |
| `photoUrl` | string, optional | |
| `about` | string, optional | Candidate's two-line text |
| `tags` | string[], optional | Candidate experience tags |
| `language` | `"ar"` \| `"fr"` \| `"en"` | Used to localise pushes |
| `home` | `{ latitude, longitude }`, optional | Candidates only. Never returned to other users. |
| `radiusM` | number, optional | Search radius in metres |
| `notifyNewJobs` | `"all"` \| `"digest"` \| `"off"` | |
| `isAdmin` | boolean, optional | Set by hand in the dashboard |
| `banned` | boolean, optional | Checked by `requireUser` |
| `consentAt` | number, optional | When the consent screen was accepted. No profile field may be written while this is unset. |
| `consentVersion` | string, optional | Which version of the notice and terms was accepted |
| `adultDeclared` | boolean, optional | The 18-or-over declaration |
| `lastSeenAt` | number | Updated on sign-in; drives the 24-month retention rule |
| `onboardedAt` | number, optional | |

No date of birth is stored; age is a declaration. The email from Google is stored on the row and never returned to any client.

The row is created by Convex Auth at first sign-in, so every field the app adds is optional. Convex Auth also adds its own tables for accounts, sessions and tokens.

Indexes: `email` and `phone`, which Convex Auth requires. Users are looked up by id, taken from the session.

## companies
| Field | Type | Notes |
|---|---|---|
| `ownerId` | id of users | |
| `name` | string | |
| `category` | string | From a fixed list |
| `address` | string | Free text, as written |
| `location` | `{ latitude, longitude }` | |
| `logoId` | storage id, optional | Convex file storage |
| `kind` | `"business"` \| `"individual"`, optional | A registered business, or a person hiring for themselves |
| `taxId` | string, optional | The matricule fiscal in canonical form. Required for a business. Owner and admins only |
| `taxIdBase` | string, optional | Its first eight characters, shared by all establishments of one taxpayer |
| `approval` | `"pending"` \| `"approved"` \| `"rejected"` | |

Indexes: `by_owner` on `ownerId`; `by_approval` on `approval`; `by_tax_id` on `taxId`, used to refuse a duplicate.

One company per employer in the MVP.

## jobs
| Field | Type | Notes |
|---|---|---|
| `companyId` | id of companies | |
| `title` | string | As written by the employer, in whatever language |
| `description` | string | |
| `category` | string | From a fixed list |
| `contractType` | `"full_time"` \| `"part_time"` \| `"seasonal"` \| `"temporary"` \| `"internship"` | |
| `payAmount` | number | Mandatory |
| `payPeriod` | `"hour"` \| `"day"` \| `"month"` | |
| `location` | `{ latitude, longitude }` | Defaults to the company's |
| `status` | `"draft"` \| `"open"` \| `"closed"` | |
| `publishedAt` | number, optional | |
| `expiresAt` | number, optional | 30 days after publishing; renewable |
| `closedAt` | number, optional | |
| `notifiedCount` | number | Candidates pushed at publish time |
| `hidden` | boolean, optional | Set automatically after 3 reports, pending review |
| `isDemo` | boolean, optional | Seeded jobs for store reviewers; shown only to reviewer accounts |

Indexes: `by_company_status` on `companyId, status`.

Currency is Tunisian dinar throughout; no currency field in the MVP.

## swipes
One row per candidate per job. A right swipe is the application.

| Field | Type | Notes |
|---|---|---|
| `candidateId` | id of users | |
| `jobId` | id of jobs | |
| `direction` | `"left"` \| `"right"` | |
| `decision` | `"pending"` \| `"accepted"` \| `"rejected"`, optional | Set only on right swipes |
| `distanceM` | number | Distance at swipe time, for the employer's bucket |
| `decidedAt` | number, optional | For response-time stats |

Indexes: `by_candidate_job` on `candidateId, jobId` (uniqueness is enforced in the mutation); `by_job_direction` on `jobId, direction`; `by_candidate_direction` on `candidateId, direction`.

## matches
| Field | Type | Notes |
|---|---|---|
| `jobId` | id of jobs | |
| `companyId` | id of companies | |
| `candidateId` | id of users | |
| `employerId` | id of users | Denormalised from the company owner |
| `lastMessageAt` | number, optional | Sort key for the matches list |
| `lastMessagePreview` | string, optional | |
| `blockedBy` | id of users, optional | Set when either side blocks |

Indexes: `by_candidate` on `candidateId, lastMessageAt`; `by_employer` on `employerId, lastMessageAt`.

## messages
| Field | Type | Notes |
|---|---|---|
| `matchId` | id of matches | |
| `senderId` | id of users | |
| `body` | string | Text only |

Indexes: `by_match` on `matchId` (ordered by creation time).

## reports
| Field | Type | Notes |
|---|---|---|
| `reporterId` | id of users | |
| `targetType` | `"job"` \| `"company"` \| `"user"` | |
| `targetId` | string | |
| `reason` | string | From a fixed list, plus optional text |
| `status` | `"open"` \| `"resolved"` | |

Indexes: `by_status` on `status`.

## pushCounters
Enforces the daily cap on new-job pushes.

| Field | Type | Notes |
|---|---|---|
| `userId` | id of users | |
| `day` | string | `YYYY-MM-DD` in Tunisian local time |
| `count` | number | |

Indexes: `by_user_day` on `userId, day`.

## Outside the tables
- **Geo index:** held by the geospatial component, in two instances: one for open jobs, one for candidate home points. Keys are the document ids. See [geo-matching.md](geo-matching.md).
- **Push tokens:** held by the Expo push component, keyed by user id, one token per user. See [push.md](push.md).

## Retention
A daily cron job deletes what has passed its declared period: accounts unused for 24 months (after a warning), and swipes, messages and closed jobs after 12 months. The periods and their legal basis are in [data-protection.md](../04-launch/data-protection.md).

## Rules that keep the data consistent
- A job enters the geo index when it becomes `open` and leaves when it becomes `closed`, expires or is hidden. Both happen in the same mutation as the status change.
- A job's location must fall inside Tunisia. The publish mutation checks the coordinates against a bounding box of the country; a rough check, enough to stop jobs abroad.
- Job posts and messages pass the word filter before they are stored.
- A candidate's geo entry is rewritten whenever `home` changes.
- Deleting an account removes the user, their swipes, their geo entry and their push tokens, and closes their jobs.
- Fixed lists (job categories, company categories, report reasons) are stored as stable keys such as `hospitality`, and translated in the app. They are never stored as display text.
