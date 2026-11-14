import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 07:00 in Tunisia, which is 06:00 UTC all year: the end of quiet hours.
crons.daily("morning summary of new jobs", { hourUTC: 6, minuteUTC: 0 }, internal.notify.digest);

// In the small hours in Tunisia, when nobody is waiting on the app.
crons.daily("retention: remove what has passed its period", { hourUTC: 2, minuteUTC: 0 }, internal.retention.run);
crons.daily("remove photos that were uploaded and never attached", { hourUTC: 2, minuteUTC: 30 }, internal.cleanup.orphanUploads, {});

export default crons;
