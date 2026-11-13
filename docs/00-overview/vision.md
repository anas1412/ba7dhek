# Vision

## One line
Ba7dhek (بحذاك, "next to you") shows you jobs near where you live, lets you apply with one swipe, and tells you the moment a new one opens nearby.

## Where the idea came from
An HR person at a hotel needed workers and had no fast way to reach people who live close enough to take the job. The hotel is the anchor case, not the limit: the app carries every job type.

## The problem
- **For candidates:** job boards are sorted by date or keyword, not by distance. For many jobs the commute decides whether the job is worth taking, and the candidate finds that out last.
- **For employers:** a post reaches people across the whole country, and most applicants live too far away to show up reliably. Filling a role takes days of filtering.

## The angle
Two things together, not swiping:

1. **Proximity.** The feed is ranked by distance from the candidate's home point. Far jobs are not shown at all.
2. **Immediacy.** A new job inside your radius produces a push notification within seconds of being posted.

Swiping is only the input method. It keeps applying to a one-second action, which matters when the alternative is a CV upload and a form.

## Who it is for
- **Candidates:** anyone looking for work near home. All job types are accepted.
- **Employers:** any business with a physical location that hires people who must show up there: hotels, restaurants, shops, workshops, clinics, offices.

Remote jobs are out of scope. They have no location, so the product has nothing to offer them.

## Principles
- **Distance first.** Every ranking decision starts with distance. Other signals only break ties.
- **Pay is always visible.** A job card without pay cannot be swiped on honestly.
- **Employers pay, candidates never do.** Monetisation comes later and only from the employer side.
- **Location stays private.** An employer never sees a candidate's home point, only a distance bucket.
- **Few notifications, all relevant.** A muted app is a dead app.
- **Three languages from the first screen.** Arabic, French and English, with Arabic laid out right to left. See [i18n.md](../02-architecture/i18n.md).

## What success looks like for the MVP
See [mvp-scope.md](mvp-scope.md#success-criteria).
