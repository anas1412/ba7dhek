import { defineApp } from "convex/server";
import geospatial from "@convex-dev/geospatial/convex.config";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config";

const app = defineApp();

// Two separate spatial indexes: open jobs, and candidates' home points.
app.use(geospatial, { name: "jobsGeo" });
app.use(geospatial, { name: "candidatesGeo" });
app.use(pushNotifications);

export default app;
