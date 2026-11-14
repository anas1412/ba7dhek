/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as adminTools from "../adminTools.js";
import type * as auth from "../auth.js";
import type * as companies from "../companies.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_geoMath from "../lib/geoMath.js";
import type * as lib_images from "../lib/images.js";
import type * as lib_pushRules from "../lib/pushRules.js";
import type * as lib_pushText from "../lib/pushText.js";
import type * as lib_redirect from "../lib/redirect.js";
import type * as lib_staffLog from "../lib/staffLog.js";
import type * as lib_taxId from "../lib/taxId.js";
import type * as lib_validate from "../lib/validate.js";
import type * as lib_wordFilter from "../lib/wordFilter.js";
import type * as matches from "../matches.js";
import type * as messages from "../messages.js";
import type * as notify from "../notify.js";
import type * as push from "../push.js";
import type * as reports from "../reports.js";
import type * as staff from "../staff.js";
import type * as swipes from "../swipes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  adminTools: typeof adminTools;
  auth: typeof auth;
  companies: typeof companies;
  crons: typeof crons;
  files: typeof files;
  http: typeof http;
  jobs: typeof jobs;
  "lib/auth": typeof lib_auth;
  "lib/geo": typeof lib_geo;
  "lib/geoMath": typeof lib_geoMath;
  "lib/images": typeof lib_images;
  "lib/pushRules": typeof lib_pushRules;
  "lib/pushText": typeof lib_pushText;
  "lib/redirect": typeof lib_redirect;
  "lib/staffLog": typeof lib_staffLog;
  "lib/taxId": typeof lib_taxId;
  "lib/validate": typeof lib_validate;
  "lib/wordFilter": typeof lib_wordFilter;
  matches: typeof matches;
  messages: typeof messages;
  notify: typeof notify;
  push: typeof push;
  reports: typeof reports;
  staff: typeof staff;
  swipes: typeof swipes;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  jobsGeo: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"jobsGeo">;
  candidatesGeo: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"candidatesGeo">;
  pushNotifications: import("@convex-dev/expo-push-notifications/_generated/component.js").ComponentApi<"pushNotifications">;
};
