import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 07:00 in Tunisia, which is 06:00 UTC all year: the end of quiet hours.
crons.daily("morning summary of new jobs", { hourUTC: 6, minuteUTC: 0 }, internal.notify.digest);

export default crons;
