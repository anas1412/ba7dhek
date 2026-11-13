# Costs

What the project costs to run at pilot scale. Figures were read from the vendors' own pages on 2026-11-13; sources are in [verified-facts.md](../05-reference/verified-facts.md). Prices change; re-check before relying on one.

How these are paid from Tunisia is in [tunisia-constraints.md](tunisia-constraints.md).

## Summary
| Item | Pilot cost | Card needed |
|---|---|---|
| Convex | Free | No |
| Convex Auth | Free, open source, runs inside Convex | No |
| Expo and EAS | Free | No |
| Push (Expo, FCM) | Free | No |
| Maps (MapLibre, OpenFreeMap) | Free | No |
| Google Play developer account | 25 USD, once | Yes |
| `.tn` domain | About 10 TND, then 14 TND a year | Paid locally in dinars |
| Apple Developer Program (later) | 99 USD a year | Yes |
| Legal consultation | Not priced | Local |

**The Android pilot needs one foreign payment: 25 USD.** Everything else is free or paid in dinars.

## Convex
**Free plan**
- 1,000,000 function calls a month
- 0.5 GB database storage
- 1 GB file storage
- 1 GB data egress
- Up to 6 developers

**Beyond it**
- Pay-as-you-go: 2.20 USD per additional million calls, 0.22 USD per additional GB of storage.
- Professional: 25 USD per developer per month.

**Region.** Production runs in Ireland, for the reason in [data-protection.md](data-protection.md). Convex says EU regions are available on all plans including free, and that non-US regions are billed at 1.3 times the standard rate. It also says included usage on paid plans does not apply to EU deployments. How the free allowance works in the EU region is not clear from those statements: **confirm it in the dashboard when creating the production deployment.**

**What drives usage**
- Every live query re-runs when its data changes. Chat and applicant lists are the busiest.
- The fan-out is one run per published job, plus component calls.
- As an estimate only: 500 daily users making 100 calls each is 1.5 million calls a month, slightly past the free allowance.

## Sign-in
Convex Auth is open source and runs inside the Convex deployment, so it adds no cost of its own; its work counts toward Convex's function calls and storage.

Google sign-in needs a Google Cloud OAuth client. Creating one is not known to cost anything; whether the project needs billing enabled for it is not confirmed.

## Expo and EAS
**Free plan**
- Up to 15 Android and 15 iOS builds a month, at low queue priority.
- 1,000 monthly active users for over-the-air updates.
- Store submission included.
- Limits reset monthly, and a free account cannot incur overage charges.

**Consequence:** 15 builds a month is enough if native changes are batched. Most changes ship as updates, not builds. The 1,000-user update limit is the first ceiling the pilot could reach; past it, the choice is a paid plan or shipping fixes as store releases.

## Push
- Expo's push service: no cost; limit of 600 notifications a second per project.
- Firebase Cloud Messaging: no cost, no payment method needed.

## Maps
- MapLibre is an open-source library.
- OpenFreeMap's public tiles are free with no limit on requests, no key and no registration; commercial use is allowed with attribution. There is no service guarantee.

## Store accounts
- Google Play: 25 USD, one time.
- Apple: 99 USD a year, when iOS starts.

## Domain
- `.tn` at OVH Tunisia: 9.746 TND including tax for the first year, 14.280 TND a year after. Other registrars not compared.
- Static hosting for the privacy notice, the deletion page and a landing page: free on common static hosts. Which host, and whether it needs a card, is not decided.

## Legal
- A consultation on the data protection filing and the placement question. Not priced.
- Any fee for the filing itself is not confirmed.

## When costs start
| Trigger | Effect |
|---|---|
| Past 1 million Convex calls a month | Pay-as-you-go, which needs a card |
| Past 1,000 update users | A paid EAS plan, or fewer updates |
| Starting iOS | 99 USD a year |
| Adding phone sign-in | An SMS provider, priced per message |

**The first paid service will strain the tech card.** Its ceiling is 1,000 TND a year for an individual. One 25 USD monthly plan is 300 USD a year, which is most of it. Reaching that point is a reason to register a company, whose ceiling is 10,000 TND.

## Revenue
None. The app is free for candidates and employers.

If businesses are charged later, it is for advertising visibility, through local Tunisian payment methods. See [tunisia-constraints.md](tunisia-constraints.md) for why it must not be a fee per hire.
