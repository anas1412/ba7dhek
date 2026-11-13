# User flows

Screen names refer to [screens.md](screens.md).

## 1. First launch (both roles)
1. Welcome screen → "Continue with Google". On iOS, "Continue with Apple" is offered too.
2. Google opens in an in-app browser; sign-in completes through Convex Auth.
3. **Consent screen.** The privacy notice and terms of use, a declaration of being 18 or over, and an explicit accept button. Nothing is pre-ticked. It states that swiping right on a job shows that employer your name, photo, "about" text and a distance range. Accepting stores the time and the notice version.
4. Role choice: "I'm looking for work" or "I'm hiring". Stored once on the user record.
5. Branch to candidate onboarding or employer onboarding.

Declining consent stores nothing further and offers to delete the account. A person under 18 cannot continue.

A returning user skips straight to their home tab.

## 2. Candidate onboarding
1. **Profile:** name and photo are prefilled from Google; add a short "about me".
2. **Home point:** two buttons.
   - "Use my current location" asks for foreground location permission, once.
   - "Pick on map" needs no permission.
3. **Radius:** slider with a live count of open jobs in range.
4. **Notifications:** explain what will be sent, then ask for push permission.
5. Land on the job stack.

If permission for location or push is refused, onboarding still completes. The map pin covers location; push can be enabled later from settings.

## 3. Employer onboarding
1. **Company:** name, category, address typed as text, a pin dropped on the map, logo. There is no address search.
2. **Posting rules**, accepted once: you are the employer, the job is in Tunisia, pay is real, candidates are never charged. See [trust-safety.md](../04-launch/trust-safety.md).
3. Company is saved as "pending approval".
4. The employer can draft a job immediately. It goes live when the company is approved.
5. Push permission is requested after the first job is drafted.

## 4. Post a job
1. Tap "New job".
2. Fill title, category, contract type, pay and period, description.
3. Location defaults to the company pin; it can be moved for a different site.
4. Publish.
5. Server side: the job is stored, added to the geo index, and in-range candidates are notified. See [geo-matching.md](../02-architecture/geo-matching.md).

## 5. Swipe
1. The stack shows the nearest open jobs the candidate has not swiped on.
2. Tap a card to expand the description and see the map.
3. Swipe left: recorded, the job never returns.
4. Swipe right: recorded as an application with employer decision "pending".
5. When the stack runs low, the app fetches the next set.
6. When nothing is left: an empty state that offers to widen the radius.

## 6. Review applicants (employer)
1. Open a job → list of applicants in the order they applied, each with photo, name, about text and distance bucket. The app does not rank or recommend applicants.
2. Accept → a match is created, the candidate is notified.
3. Reject → the candidate's application shows "not selected". No push is sent for a rejection.

## 7. Chat
1. Either side opens the match from the Matches tab.
2. Messages appear live.
3. The recipient gets a push if they are not in that chat.
4. Either side can block and report from the chat menu.

## 8. Close a job
1. Employer taps "Close job".
2. The job leaves the geo index and every candidate stack.
3. Pending applications show "position closed". Existing matches and chats stay.

## 9. Change home point or radius
1. Settings → Location.
2. Saving updates the user record and the geo index entry for that candidate.
3. The stack reloads.

## 10. Request my data
1. Settings → Privacy → "Request my data".
2. The request is recorded and sent to the support address.
3. A copy is sent within one month.

## 11. Delete account
1. Settings → Delete account → confirm.
2. Server removes the user's profile, swipes, geo entry and push tokens, closes their jobs if they are an employer, and removes the sign-in records.
3. Messages they sent remain in the other party's chat, attributed to "Deleted user".
