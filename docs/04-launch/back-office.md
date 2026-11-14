# Back office

**Status:** built 2026-11-14. The server side is covered by tests. The screens have not been seen with a signed-in member of staff: nobody has opened them yet.

The back office is a screen inside the app, reached from Settings by anyone who is staff. It works on a phone and in a browser, since it is the same app.

## Two roles

| | Moderator | Admin |
|---|---|---|
| See the overview numbers | Yes | Yes |
| Approve or reject a business | Yes | Yes |
| Decide on reports | Yes | Yes |
| Hide, bring back or remove a job | Yes | Yes |
| Ban a person | Yes | Yes |
| Lift a ban | No | Yes |
| See e-mail addresses | No | Yes |
| Make or remove a moderator | No | Yes |
| Read the activity log | No | Yes |
| Make or remove an admin | No | Not from the app |

**Admins are made from a terminal only**, by someone with access to the Convex project:

```bash
npx convex run adminTools:setAdmin '{"email":"you@example.com","admin":true}'
```

Add `--prod` for the production deployment. The person must have signed in once on that deployment, since signing in is what creates their account. The reason for keeping this out of the app: a stolen admin session should not be able to create more admins.

## Sections

- **Overview:** reports waiting, businesses waiting, jobs live and hidden, people, chats, bans.
- **Reports:** open reports on jobs and on people, oldest first. Each gets one of two decisions: nothing wrong, or remove the job / ban the person.
- **Businesses:** waiting, approved, rejected. Approve or reject, with an optional reason kept with the business.
- **Jobs:** live, hidden, closed, drafts, with a search on the title or the business name. Hide, bring back, remove.
- **People:** everyone, banned, staff, with a search on the name (admins can also search e-mail addresses). Ban, lift a ban, make or remove a moderator.
- **Activity (admin only):** who did what, newest first.

## Rules the server enforces

- Every function checks the caller's role itself. Hiding the screen from non-staff is a courtesy, not the lock.
- Every action that changes something writes a row to the `staffActions` table in the same transaction, so an action without its record cannot exist. The app never edits or deletes these rows.
- Staff cannot be banned from the back office. An admin removes a moderator from the team first.
- A removed job is closed and stays hidden, so its owner cannot publish it again.
- A ban refuses the person in every function, stops their notifications and closes their open jobs. Lifting it does not reopen those jobs; the owner publishes again.

## Limits

- Lists show the newest 100 and the overview counts up to 5,000 rows per table. That is ample for one town and needs paging beyond it.
- No bulk actions, no export, no charts.
- The reporter is not told what was decided.
- No back-office screen for a single person's history (their jobs, their reports, their chats). Chat contents are deliberately not readable from the back office; a report names the conversation, and reading it means the Convex dashboard.
- Code: `convex/staff.ts`, `convex/reports.ts`, `convex/companies.ts`, `convex/lib/staffLog.ts`, `src/features/staff/sections.tsx`, `src/app/admin.tsx`.
