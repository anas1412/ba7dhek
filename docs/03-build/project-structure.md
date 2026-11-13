# Project structure

The planned layout of the repository. One repository holds the app and the Convex backend, which is how Convex projects are normally arranged.

**One difference from the tree below:** the Expo SDK 58 template puts routes in `src/app/`, not `app/` at the root, and the scaffold follows the template. Read `app/` below as `src/app/`. What exists so far is listed in [setup.md](setup.md).

```
ba7dhek/
├── README.md
├── docs/                         planning documents (this set)
├── app/                          Expo Router routes: screens only, thin
│   ├── _layout.tsx               providers: Clerk, Convex, i18n, theme
│   ├── index.tsx                 decides where to send the user
│   ├── (auth)/
│   │   ├── welcome.tsx
│   │   ├── consent.tsx           privacy notice, terms, 18+ declaration
│   │   └── role.tsx
│   ├── (onboarding)/
│   │   ├── candidate/            profile, location, radius
│   │   └── employer/             company
│   ├── (tabs)/
│   │   ├── _layout.tsx           tab bar, differs by role
│   │   ├── jobs.tsx              candidate: card stack
│   │   ├── applications.tsx      candidate
│   │   ├── my-jobs.tsx           employer
│   │   ├── matches.tsx
│   │   └── settings.tsx
│   ├── job/
│   │   ├── new.tsx
│   │   ├── [jobId].tsx
│   │   └── [jobId]/applicants.tsx
│   ├── applicant/[swipeId].tsx
│   └── chat/[matchId].tsx
├── src/
│   ├── components/               shared UI: Button, Chip, Avatar, TextField
│   ├── features/
│   │   ├── jobs/                 JobCard, CardStack, feed hooks
│   │   ├── employer/             job form, applicant row
│   │   ├── chat/
│   │   ├── location/             pin picker, radius slider, permission
│   │   └── notifications/        permission flow, token registration, tap routing
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/              ar.json, fr.json, en.json
│   ├── theme/                    tokens from the design system, light and dark
│   └── lib/                      formatters: distance, pay, relative time
├── convex/
│   ├── schema.ts
│   ├── convex.config.ts          registers the geospatial and push components
│   ├── auth.config.ts            Clerk issuer
│   ├── users.ts
│   ├── companies.ts
│   ├── jobs.ts                   feed, publish, close
│   ├── swipes.ts                 record, decide
│   ├── matches.ts
│   ├── messages.ts
│   ├── notify.ts                 fan-out and the other pushes
│   ├── reports.ts
│   ├── admin.ts                  company approval
│   ├── crons.ts                  morning digest, job expiry, retention
│   ├── privacy.ts                consent record, data request, account deletion
│   └── lib/
│       ├── auth.ts               requireUser, role checks
│       ├── geo.ts                index instances, sync helpers, haversine
│       ├── pushStrings.ts        ar, fr, en notification text
│       └── wordFilter.ts         blocked terms for posts and messages
├── scripts/
│   └── check-locales.mjs         fails if the three locale files differ in keys
├── assets/                       icon, splash, fonts
├── app.config.ts
├── eas.json
├── package.json
└── tsconfig.json
```

## Conventions
- **Routes are thin.** A file in `app/` composes components from `src/features` and calls Convex hooks. No business logic.
- **One Convex file per table or concern.** Functions are named for what they do: `jobs.publish`, not `jobs.update`.
- **All geo index writes go through `convex/lib/geo.ts`.** No other file touches the component directly.
- **All identity checks go through `convex/lib/auth.ts`.**
- **No literal user-facing strings** in `app/` or `src/`. A lint rule enforces it if one can be found that works with the setup; otherwise review does.
- **No literal colours or sizes** in components; they come from `src/theme`.
- **Logical layout properties only** (`start`, `end`), for right-to-left.

## Environments
| Environment | Convex deployment | Clerk instance | Build profile |
|---|---|---|---|
| Development | dev deployment (personal) | development | `development` |
| Testers | production deployment | production | `preview` |
| Stores | production deployment | production | `production` |

Testers and store builds share one backend in the MVP. A separate staging backend is not worth its cost for one developer before launch.

## What exists today
Only `docs/`, `README.md`, and the Convex and GitHub setup described in the README. The app folders above are created in Milestone 1.
