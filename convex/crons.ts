import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh all subscribed podcast feeds every hour
crons.interval(
  "refresh all podcast feeds",
  { hours: 1 },
  (internal as any).feedRefresh.refreshAllFeeds
);

export default crons;
