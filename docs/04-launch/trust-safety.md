# Trust and safety

Job platforms attract fraud aimed at people who need money. A single fake job that costs a candidate something would damage the app's name in a small market. The MVP's defences are manual and cheap.

## Threats
| Threat | Example |
|---|---|
| Fake employer | A "job" that asks candidates to pay a fee, buy equipment or send documents |
| Data harvesting | A post created to collect names, photos and contacts |
| Illegal or exploitative work | Unpaid "trials", pay below the legal minimum, work that is not what is described |
| Harassment in chat | Either side |
| Misleading posts | Wrong location or pay to attract applicants |
| Impersonation | Posting as a known business |

## Employer approval
Every company is approved by hand before its first job goes live.

**What is checked**
- The business hires for itself. Staffing and labour-hire intermediaries are refused: Law n° 2025-9 bans labour subcontracting, and the app must not become a channel for it.
- The business exists at the pinned address. For the pilot, this is known first-hand, because employers are recruited in person.
- For companies that sign up on their own: a search for the business, a look at the pin on a map, and if in doubt a phone call.
- The company name is not impersonating another business.

**How**
- New companies appear in a "pending" query in the Convex dashboard.
- Approval is an admin mutation. Rejection stores a reason.
- Target: a decision within a few hours during the pilot.

Asking for a business registration number is a later step. Whether Tunisia has a public registry that can be checked online is unverified.

## Job rules
Shown to employers before their first post, in three languages.

- Pay must be stated and real.
- No fees charged to candidates, for anything.
- The location must be where the work happens, and it must be in Tunisia. Jobs abroad are not accepted; placing workers abroad is a separately licensed activity.
- You must be the business that will employ the person.
- No discriminatory requirements. The Code du travail forbids discrimination between men and women (art. 5 bis).
- No requests for identity documents or bank details in the post or the chat.
- No requests for a criminal record extract, or for information about health, religion, origin, or political or union views. The data protection law forbids or restricts processing these.
- The form of the contract is your responsibility. Since Law n° 2025-9, a fixed-term contract is lawful only for seasonal work, a surge in activity, or replacing an absent employee.

Whether the law requires particular mentions in a job advertisement was not found either way.

## Reporting
- Candidates can report a job or a company from the job detail screen.
- Either side can report a user from the chat.
- Reasons are a fixed list: asks for money, fake or misleading, inappropriate, harassment, other.
- Reports land in a table reviewed in the dashboard.

**Automatic response.** A job with reports from 3 different candidates is hidden until reviewed.

## Blocking
- Either side can block the other from the chat menu.
- A blocked chat accepts no new messages from either side and sends no pushes.
- Both stores require reporting and blocking in apps with user-generated content (verified); see [store-readiness.md](store-readiness.md).

## Filtering
Apple requires "a method for filtering objectionable material from being posted". Two layers:

1. **Approval.** No company's jobs are visible until the company is approved by hand.
2. **A word filter.** Job posts and chat messages are checked on the server against a list of terms in Arabic, French and English. A match rejects the text with a message asking the user to rephrase. The list covers insults, sexual content, and the phrases of advance-fee scams ("pay to apply", "send money").

The list is short, kept in the Convex code, and extended from what reports show. It is a floor, not moderation; the reports queue is the real control.

## Response times
Stated on the store listings and kept:
- Reports reviewed within 24 hours during the pilot.
- A job hidden automatically after 3 reports from different users, pending review.

## Chat safety
- Text only in the MVP: no images, no files, no links rendered as tappable.
- A fixed notice at the top of every new chat: never pay for a job, never send identity documents here.

## Candidate privacy as a safety measure
- Employers never see where a candidate lives; see [privacy.md](privacy.md).
- Employers see a candidate only after that candidate swiped right on their job. There is no candidate search.

## Enforcement
| Action | When |
|---|---|
| Hide a job | Reported and found misleading |
| Suspend a company | Repeat or serious violation; all its jobs close |
| Ban a user | Harassment, fraud |

A ban is a flag on the user row that every function checks through `requireUser`. Banning by Google account is weak, since a new account is easy to make; it is enough for the pilot.

## What the MVP does not do
- No automated moderation beyond the word filter.
- No identity verification of candidates. Age is declared, not checked.
- No in-app handling of disputes about pay or conditions.

These are accepted gaps at pilot scale, where the developer knows the employers personally.

## Staying an advertising medium
The app publishes offers and lets people respond. It does not select, rank or recommend candidates, and takes no part in the hiring. This is a legal position as much as a product one; see [tunisia-constraints.md](tunisia-constraints.md).

## Contact
A support address on the `ba7dhek.tn` domain, shown in Settings, on the store listings and on the website. Apple requires published contact information for apps with user-generated content.
