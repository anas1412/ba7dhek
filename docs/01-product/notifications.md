# Notifications

How they are sent is in [push.md](../02-architecture/push.md). This file covers what is sent and when.

## Events
| Event | Recipient | Sent when | Opens |
|---|---|---|---|
| New job nearby | Candidates whose radius covers the job | The job is published | Job detail |
| New match | Candidate | Employer accepts the application | Chat |
| New message | The other party | They are not currently in that chat | Chat |
| New applicants | Employer | Batched, see below | Applicants list |
| Company approved | Employer | An admin approves the company | My jobs |

Not sent: rejections, job closures, marketing.

## Caps and batching
The numbers are the decided starting values; see [decisions.md](../00-overview/decisions.md). They are tuned after the pilot.

One person receives pushes on one phone: the last device they signed in on.

- **New job nearby:** at most 5 per candidate per day. Beyond the cap, jobs still appear in the stack; only the push is skipped.
- **Quiet hours:** no new-job pushes between 22:00 and 07:00 local time. Jobs posted in that window are folded into one morning push: "3 new jobs near you".
- **New applicants:** the first applicant on a job pushes immediately. After that, at most one push per job per hour, with a count.
- **Messages:** one push per message, but collapsed per chat so a burst shows as one notification.

## Wording
Every push is written in Arabic, French and English and sent in the recipient's stored language. The structure, shown in English:

- **New job:** title is the job title and pay; body is the company and distance. Example: "Receptionist · 900 TND/month" / "Hotel X · 1.2 km from you".
- **New match:** "Hotel X wants to talk to you" / "Open the chat".
- **New message:** sender name / message preview.
- **New applicants:** "4 new applicants for Receptionist".

The distance in a new-job push is the whole point; never drop it for brevity.

## User controls
In Settings → Notifications:

- Toggle per event type.
- New-job frequency: all (up to the cap), one daily digest, or off.

## Permission timing
Ask for push permission after the user has seen value, not on first launch:

- Candidate: at the end of onboarding, after the radius screen has shown them real jobs in range.
- Employer: after drafting the first job.

Before the system prompt, show one screen explaining what will be sent. If the user declines there, do not trigger the system prompt, so it can be asked again later.

## Measured from day one
- Pushes sent, per event type.
- Pushes that led to an app open.
- Candidates who turned new-job pushes off.
