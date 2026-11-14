// When a push may be sent. Kept apart from the sending so each rule can be tested on its own.

/** A candidate gets at most this many "new job nearby" pushes in one day. */
export const NEW_JOB_DAILY_CAP = 5;

/** No "new job nearby" pushes from 22:00 to 07:00. The morning summary covers those jobs. */
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 7;

/** After the first applicant on a job, the employer hears about further ones at most this often. */
export const APPLICANT_PUSH_GAP_MS = 60 * 60 * 1000;

/** A message push waits this long, so someone looking at the chat is not also buzzed about it. */
export const MESSAGE_PUSH_DELAY_MS = 4_000;

// Tunisia is one hour ahead of UTC all year and does not change its clocks
// (checked against the time-zone database on 2026-11-14). Everyone in the
// pilot is in Tunisia, so "local time" is this one offset.
const TUNISIA_OFFSET_MS = 60 * 60 * 1000;

function tunisTime(now: number): Date {
  return new Date(now + TUNISIA_OFFSET_MS);
}

export function isQuietHour(now: number): boolean {
  const hour = tunisTime(now).getUTCHours();
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** The Tunisian calendar day, as "2026-11-14": the key the daily cap is counted under. */
export function tunisDay(now: number): string {
  return tunisTime(now).toISOString().slice(0, 10);
}

/** The most recent 22:00 in Tunisia: where the overnight window the morning summary covers began. */
export function lastQuietStart(now: number): number {
  const local = tunisTime(now);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), QUIET_START_HOUR);
  const shifted = start > local.getTime() ? start - 24 * 60 * 60 * 1000 : start;
  return shifted - TUNISIA_OFFSET_MS;
}
