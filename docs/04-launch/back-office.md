# Back office

**Status:** built 2026-11-14, extended the same day with paging, bulk actions, export, charts and reported-chat reading. The server side is covered by tests. The screens have not been seen with a signed-in member of staff: nobody has opened them yet.

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
| Read a conversation that was reported | Yes | Yes |
| Export a list as a spreadsheet | No | Yes |
| Read the activity log | No | Yes |
| Make or remove an admin | No | Not from the app |

**Admins are made from a terminal only**, by someone with access to the Convex project:

```bash
npx convex run adminTools:setAdmin '{"email":"you@example.com","admin":true}'
```

Add `--prod` for the production deployment. The person must have signed in once on that deployment, since signing in is what creates their account. The reason for keeping this out of the app: a stolen admin session should not be able to create more admins.

## Sections

- **Overview:** reports waiting, businesses waiting, jobs live and hidden, people, chats, bans. Below them, three small charts of the last 14 days: new accounts, jobs published, applications.
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

## Lists, bulk actions and export

- **Every list is read a page at a time** (20 rows, then "Load more"), so nothing is cut off however long it grows. A search is applied to each page as it is read, so a page can come back short while more remain; the list says when it has reached its end.
- **Bulk actions:** tick rows, or "select all shown", then act on them together. Businesses: approve, reject. Jobs: hide, bring back, remove. People: ban, and for an admin lift a ban. Reports: only "nothing wrong" is offered in bulk; removing a job or banning a person from a report is decided one at a time. Each row in a bulk action is still checked and logged on its own.
- **Export (admin only):** people, businesses, jobs and the activity log, as a spreadsheet file of up to 5,000 rows, newest first. A browser downloads it; a phone opens the share sheet. The people and businesses files hold e-mail addresses. Every export is logged. Values that could run as a spreadsheet formula are made harmless.

## Reading a conversation

Nobody browses conversations. There is no function that lists them or opens one by its address. The one way in:

1. A person reports someone from inside a chat. Before sending, they are told that the team will be able to read that chat.
2. The report carries that one conversation. While the report is open, a moderator or admin can press "Read the reported chat" on it.
3. Each reading is written to the activity log with who read it.
4. Once the report is settled, the conversation can no longer be read.

A report on a job gives no access to any conversation.

## Limits

- The overview counts by reading up to 5,000 rows per table. Past that it says so and the figures are a minimum; exact counts at that size need running totals kept as data changes, which are not built.
- The charts cover 14 days and three measures. No date range to choose, no breakdown by category or area.
- The reporter is not told what was decided.
- No back-office screen for a single person's history (their jobs, the reports about them).
- Code: `convex/staff.ts`, `convex/reports.ts`, `convex/companies.ts`, `convex/lib/staffLog.ts`, `src/features/staff/sections.tsx`, `src/features/staff/DailyBars.tsx`, `src/app/admin.tsx`.
