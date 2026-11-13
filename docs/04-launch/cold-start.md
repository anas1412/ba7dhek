# Cold start

A two-sided marketplace is worthless until both sides are present. A candidate who opens an empty stack uninstalls; an employer whose post gets no applicants never posts again. This is the biggest risk to the project, larger than any technical one.

## Strategy: small and dense
Launch in one district of one city, and make that district feel full before going anywhere else. Density matters more than reach, because the product only works within a few kilometres.

**The pilot area is the district around the hotel that prompted the idea.** A willing first employer is already there. The name of the city is the one fact these documents do not hold; see [open-questions.md](../00-overview/open-questions.md).

## Before anyone is invited
Two gates come first, and both take weeks:

1. **The data protection filing.** No real user may sign up until the declaration's month has passed and the transfer authorisation is granted. See [data-protection.md](data-protection.md).
2. **Google's closed test.** At least 12 testers must stay opted in for 14 consecutive days before the app can go public. See [store-readiness.md](store-readiness.md).

**The closed test is the pilot.** The first employers and the first candidates are the 12 testers. Recruit more than 12, about 20: the rule asks for 12 testers opted in continuously, so a few people leaving must not drop the count below 12.

## Supply first
Employers are the scarce side. Jobs must exist before candidates are invited.

### The anchor: hotels
The idea came from a hotel HR manager, so that is the first door to knock on.

- Hotels hire across many roles and repeatedly, which keeps the stack fresh.
- One hotel can post several jobs on day one.
- Hotels cluster geographically, which gives density.

The app stays open to all job types. Hotels are where seeding starts, not a restriction.

### Then the street
Around the anchor hotels: cafés, restaurants, shops, pharmacies, workshops. Small businesses with a hiring sign in the window are the clearest prospects.

### How to recruit them
- In person. Walk in, show the app, and post the job with them on their phone.
- Offer to do the posting for them the first time.
- Free, stated plainly.
- Only businesses that hire for themselves. Staffing intermediaries are not accepted; see [tunisia-constraints.md](tunisia-constraints.md).

### Target before inviting candidates
A proposal, not a tested number: at least 30 open jobs within a 3 km circle. Below that, a candidate exhausts the stack in one sitting.

## Then demand
Candidates are easier to find but harder to keep.

- Local Facebook groups for jobs in the area. Facebook reaches about 7.8 million people in Tunisia, 63% of the population, and drives 85% of social media referrals (DataReportal 2026; StatCounter, October 2026). No figure was found for groups specifically.
- Posters with a QR code in the businesses that posted, and near universities and transport stops.
- Word of mouth through the employers' own staff.

The message is one line: jobs within walking distance, apply in one swipe.

## Keeping the stack alive
- **Job expiry.** Jobs auto-close after 30 days unless renewed, so the stack does not fill with dead posts.
- **Nudging slow employers.** If applicants wait more than 48 hours, remind the employer by push.
- **Honest empty state.** When the stack is empty, say so and offer to notify the candidate when something appears. That is the push feature doing its job.

## What to watch
Counted in Convex, reviewed weekly.

| Signal | Why it matters |
|---|---|
| Open jobs within the pilot circle | The stack's depth |
| Candidates with a home point inside the circle | Reach of a new post |
| Right swipes per job in the first 24 hours | Whether employers get value |
| Share of right swipes decided within 24 hours | Whether candidates get value |
| Matches that exchange at least one message each way | Whether the loop completes |
| Candidates who return in week two | Retention |

## When to expand
Only when the first district sustains itself: employers post without being asked, and most right swipes get a decision within a day. Then add the neighbouring district, not a new city.

## Risks particular to this stage
- **Employers post once and vanish.** Mitigation: the applicant push, and the personal relationship from in-person recruitment.
- **Candidates swipe right on everything.** Mitigation: watch the ratio; if it becomes a problem, add a daily right-swipe limit.
- **Google-only sign-in excludes people.** Mitigation: watch drop-off on the welcome screen. Phone sign-in is not a ready fix; see [tunisia-constraints.md](tunisia-constraints.md).
- **The update limit.** The free EAS plan serves over-the-air updates to 1,000 monthly users. A pilot district stays under it.
- **The developer becomes the bottleneck for approvals.** Mitigation: approve within hours during the pilot; the volume will be small.
