# Screens

Route paths follow Expo Router's file-based layout; see [project-structure.md](../03-build/project-structure.md).

## Shared
| Screen | Route | Content |
|---|---|---|
| Welcome | `/(auth)/welcome` | Logo, one-line pitch, "Continue with Google"; on iOS also "Continue with Apple" |
| Consent | `/(auth)/consent` | Privacy notice and terms, 18-or-over declaration, accept button |
| Role choice | `/(auth)/role` | Two large buttons: looking for work, hiring |
| Matches | `/(tabs)/matches` | List of matches with last message and unread dot |
| Chat | `/chat/[matchId]` | Messages, input, menu with block and report |
| Settings | `/(tabs)/settings` | Profile, language, location (candidate), notifications, privacy (notice, request my data, delete account), support address, sign out |

## Candidate
| Screen | Route | Content |
|---|---|---|
| Onboarding: profile | `/(onboarding)/candidate/profile` | Name, photo, about |
| Onboarding: location | `/(onboarding)/candidate/location` | Use current location, or pick on map |
| Onboarding: radius | `/(onboarding)/candidate/radius` | Slider, live count of jobs in range |
| Job stack | `/(tabs)/jobs` | Card stack, pass and apply buttons under it |
| Job detail | `/job/[jobId]` | Full description, map, company info, report |
| Applications | `/(tabs)/applications` | Jobs swiped right, with state |

## Employer
| Screen | Route | Content |
|---|---|---|
| Onboarding: company | `/(onboarding)/employer/company` | Name, category, address, pin, logo |
| My jobs | `/(tabs)/my-jobs` | Open and closed jobs, applicant counts, approval banner |
| New job | `/job/new` | The posting form |
| Applicants | `/job/[jobId]/applicants` | Applicant rows with accept and reject |
| Applicant detail | `/applicant/[swipeId]` | Photo, about, tags, distance bucket |

The tab bar differs by role: candidates get Jobs, Applications, Matches, Settings; employers get My jobs, Matches, Settings.

## Job card spec
The card is the product. In order of visual weight:

1. **Distance** from the candidate's home point, e.g. "1.2 km". At the top on the leading edge (left in French and English, right in Arabic), largest text after the title.
2. **Job title.**
3. **Pay**, with period: per hour, per day or per month. Mandatory; a job cannot be published without it.
4. **Company name and logo**, with a verified mark.
5. **Contract type** chip: full-time, part-time, seasonal, temporary, internship.
6. **Category** chip.
7. **Posted** time, relative: "12 min ago".
8. First two lines of the description.

Not on the card: the exact address. It appears on the detail screen.

### Gestures
- Drag right past the threshold: apply. Drag left: pass.
- The two buttons under the stack do the same, for people who do not swipe.
- Tap: open detail.
- No undo in the MVP.

## Applicant row spec (employer side)
- Photo, name, first line of "about".
- **Distance bucket**, never the exact figure: under 1 km, 1 to 3 km, 3 to 5 km, 5 to 10 km, over 10 km.
- Time since they applied.

## Maps
Three screens show a map: the candidate's location picker, the company and job pin picker, and job detail. All use MapLibre with OpenFreeMap tiles.

- The picker is a map with a fixed pin at the centre; the user moves the map under it.
- There is no search box. A "use my current location" button centres the map.
- The candidate's picker draws the search radius as a circle, in the `brand-soft` colour.
- Every map shows the tile attribution line.
- The job stack itself has no map.

## Empty and error states to design
- Stack empty: "No more jobs within X km" with a widen-radius button.
- Company pending approval: banner on My jobs.
- No applicants yet: shows how many candidates were notified.
- Offline: cached stack stays visible; swipes are disabled until the connection returns.
- Location permission refused: fall through to the map picker.
