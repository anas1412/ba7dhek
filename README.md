# Ba7dhek

**بحذاك · "next to you"**

A mobile app for Tunisia that shows people the jobs closest to where they live, lets them apply with one swipe, and notifies them the moment a new job opens nearby.

**Status:** building. The foundation is in place: app scaffold, theme, three languages, Convex schema, and the sign-in, consent and role screens. It has not run on a phone yet; see [setup.md](docs/03-build/setup.md) for what is built and the account steps still needed.

## Decisions made
| Topic | Decision |
|---|---|
| Platform | React Native with Expo; builds and releases through EAS |
| Backend | Convex, with its geospatial component |
| Sign-in | Convex Auth (0.x line). Google on Android and iOS; Apple as well on iOS, which Apple requires |
| Languages | Arabic (Tunisian dialect), French and English from the first screen; Arabic right to left |
| Geo matching | On the server. One stored home point per candidate; no background location |
| Maps | MapLibre with OpenFreeMap; no Google Maps |
| Job types | All, ranked by distance |
| Release order | Android first, iOS after the pilot |
| Pilot city | Hammamet |
| Payments | None. Local methods later if businesses are ever charged |
| Users | Adults only |
| Team | One developer |

The full list, with the reason for each, is in [decisions.md](docs/00-overview/decisions.md).

## Before any real user
Two things under Tunisian law come before everything else, and both take about a month:

1. A declaration of processing filed with the data protection authority.
2. An authorisation to host personal data abroad.

See [data-protection.md](docs/04-launch/data-protection.md).

## What is set up
| Thing | Where |
|---|---|
| GitHub repository (private) | https://github.com/anas1412/ba7dhek |
| Convex project | https://dashboard.convex.dev/t/anas-b/ba7dhek |
| Convex dev deployment | `patient-mouse-884`, cloud. Its name and URLs are in `.env.local`, which is not committed. |
| Design system | https://claude.ai/artifact/3AGaUmF3s117jSo7AUHZrZ (private until shared) |

To reconnect on another machine, run `npx convex dev` and pick the existing `ba7dhek` project.

## Read in this order
1. [Vision](docs/00-overview/vision.md): what it is and why.
2. [Decisions](docs/00-overview/decisions.md): what has been decided, and why.
3. [MVP scope](docs/00-overview/mvp-scope.md): what is in and out.
4. [Tunisia constraints](docs/04-launch/tunisia-constraints.md): what the country rules out or changes.
5. [Data protection](docs/04-launch/data-protection.md): the legal filings.
6. [Architecture overview](docs/02-architecture/overview.md): how it fits together.
7. [Roadmap](docs/03-build/roadmap.md): the milestones, starting with the gates.
8. [Open questions](docs/00-overview/open-questions.md): what still needs an outside answer.

## All documents

### 00 Overview
- [vision.md](docs/00-overview/vision.md): the problem, the angle, the principles
- [decisions.md](docs/00-overview/decisions.md): every decision, who made it and why
- [mvp-scope.md](docs/00-overview/mvp-scope.md): in scope, out of scope, success criteria
- [open-questions.md](docs/00-overview/open-questions.md): what still needs an outside answer or a real-world attempt

### 01 Product
- [personas.md](docs/01-product/personas.md): who uses it
- [user-flows.md](docs/01-product/user-flows.md): step-by-step flows
- [screens.md](docs/01-product/screens.md): screen list and the job card spec
- [notifications.md](docs/01-product/notifications.md): what is sent, caps, wording

### 02 Architecture
- [overview.md](docs/02-architecture/overview.md): components and request paths
- [stack.md](docs/02-architecture/stack.md): each tool and why
- [data-model.md](docs/02-architecture/data-model.md): tables, fields, indexes
- [geo-matching.md](docs/02-architecture/geo-matching.md): the feed, the fan-out, index sync
- [auth.md](docs/02-architecture/auth.md): Convex Auth, Google sign-in, roles, authorisation
- [push.md](docs/02-architecture/push.md): notification delivery
- [i18n.md](docs/02-architecture/i18n.md): three languages and right-to-left

### 03 Build
- [setup.md](docs/03-build/setup.md): what is built, how to run it, and the account steps
- [spikes.md](docs/03-build/spikes.md): proofs to run first
- [roadmap.md](docs/03-build/roadmap.md): milestones with done checks
- [project-structure.md](docs/03-build/project-structure.md): planned repository layout
- [eas.md](docs/03-build/eas.md): build profiles, updates, submission
- [testing.md](docs/03-build/testing.md): automated tests and the manual pass

### 04 Launch
- [cold-start.md](docs/04-launch/cold-start.md): getting both sides of the marketplace
- [trust-safety.md](docs/04-launch/trust-safety.md): approval, reports, blocking
- [privacy.md](docs/04-launch/privacy.md): what is collected and who sees it
- [data-protection.md](docs/04-launch/data-protection.md): Tunisian law article by article, and what to file
- [tunisia-constraints.md](docs/04-launch/tunisia-constraints.md): payments, stores, maps and labour law from Tunisia
- [store-readiness.md](docs/04-launch/store-readiness.md): submission checklist
- [costs.md](docs/04-launch/costs.md): what it costs to run

### 05 Reference
- [verified-facts.md](docs/05-reference/verified-facts.md): every checked claim with its source, and the list of unverified ones

### 06 Design
- [ux-plan.md](docs/06-design/ux-plan.md): navigation, feedback, loading, errors, motion, maps and the fuller job form
- [design-system.md](docs/06-design/design-system.md): colour, type, spacing, radius, voice
- [logo.md](docs/06-design/logo.md): the mark, its rules, and the files generated from it
- [tokens.json](docs/06-design/tokens.json): the same values, machine-readable

## How to read the documents
- A claim about a third-party product is either listed in [verified-facts.md](docs/05-reference/verified-facts.md) with its source, or marked "unverified" where it appears.
- Numbers described as proposals or estimates are starting points, not measurements.
- Decisions made on the developer's behalf are marked "delegated" in [decisions.md](docs/00-overview/decisions.md), with the reason, so each can be overturned.
- What could not be decided at a desk is in [open-questions.md](docs/00-overview/open-questions.md).
- The legal documents are a developer's reading of the law, not legal advice.
