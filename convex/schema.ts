import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const point = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

export const language = v.union(v.literal("ar"), v.literal("fr"), v.literal("en"));
export const role = v.union(v.literal("candidate"), v.literal("employer"));
export const notifyNewJobs = v.union(v.literal("all"), v.literal("digest"), v.literal("off"));

export const contractType = v.union(
  v.literal("full_time"),
  v.literal("part_time"),
  v.literal("seasonal"),
  v.literal("temporary"),
  v.literal("internship"),
);
export const employerKind = v.union(v.literal("business"), v.literal("individual"));
export const payPeriod =v.union(v.literal("hour"), v.literal("day"), v.literal("month"));

export default defineSchema({
  // Sessions, accounts and tokens for Convex Auth.
  ...authTables,

  // Replaces authTables.users: the same sign-in fields, plus the app's own.
  users: defineTable({
    // Written by Convex Auth when someone signs in with Google.
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Set by `users.ensure` right after sign-in.
    language: v.optional(language),
    lastSeenAt: v.optional(v.number()),

    // Consent comes before any profile data. See docs/04-launch/data-protection.md.
    consentAt: v.optional(v.number()),
    consentVersion: v.optional(v.string()),
    adultDeclared: v.optional(v.boolean()),

    role: v.optional(role),
    about: v.optional(v.string()),
    // A photo the person uploaded, replacing the one from their Google account.
    photoId: v.optional(v.id("_storage")),
    // Set when the person chose to show no photo at all.
    photoRemoved: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),

    // Candidates only. Never returned to another user.
    home: v.optional(point),
    radiusM: v.optional(v.number()),
    notifyNewJobs: v.optional(notifyNewJobs),

    isAdmin: v.optional(v.boolean()),
    banned: v.optional(v.boolean()),
    onboardedAt: v.optional(v.number()),
  })
    // Convex Auth looks users up through these two indexes.
    .index("email", ["email"])
    .index("phone", ["phone"]),

  companies: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(),
    address: v.string(),
    location: point,
    // Up to four images, in display order. The first is the main one, shown on job cards.
    imageIds: v.optional(v.array(v.id("_storage"))),
    // A registered business gives its tax ID; a person hiring for themselves has none.
    kind: v.optional(employerKind),
    // Canonical matricule fiscal. Shown to its owner and to admins only, never to candidates.
    taxId: v.optional(v.string()),
    // Its first eight characters, shared by all establishments of one taxpayer.
    taxIdBase: v.optional(v.string()),
    approval: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_approval", ["approval"])
    .index("by_tax_id", ["taxId"]),

  jobs: defineTable({
    companyId: v.id("companies"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    contractType,
    payAmount: v.number(),
    payPeriod,
    location: point,
    status: v.union(v.literal("draft"), v.literal("open"), v.literal("closed")),
    publishedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    notifiedCount: v.number(),
    hidden: v.optional(v.boolean()),
    isDemo: v.optional(v.boolean()),
  }).index("by_company_status", ["companyId", "status"]),

  swipes: defineTable({
    candidateId: v.id("users"),
    jobId: v.id("jobs"),
    direction: v.union(v.literal("left"), v.literal("right")),
    decision: v.optional(
      v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    ),
    distanceM: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_candidate_job", ["candidateId", "jobId"])
    .index("by_job_direction", ["jobId", "direction"])
    .index("by_candidate_direction", ["candidateId", "direction"]),

  matches: defineTable({
    jobId: v.id("jobs"),
    companyId: v.id("companies"),
    candidateId: v.id("users"),
    employerId: v.id("users"),
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    blockedBy: v.optional(v.id("users")),
  })
    .index("by_candidate", ["candidateId", "lastMessageAt"])
    .index("by_employer", ["employerId", "lastMessageAt"]),

  messages: defineTable({
    matchId: v.id("matches"),
    senderId: v.id("users"),
    body: v.string(),
  }).index("by_match", ["matchId"]),

  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.union(v.literal("job"), v.literal("company"), v.literal("user")),
    targetId: v.string(),
    reason: v.string(),
    note: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("resolved")),
  }).index("by_status", ["status"]),

  pushCounters: defineTable({
    userId: v.id("users"),
    day: v.string(),
    count: v.number(),
  }).index("by_user_day", ["userId", "day"]),
});
