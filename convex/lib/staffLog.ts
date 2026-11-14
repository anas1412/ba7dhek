import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type StaffAction =
  | "approve_business"
  | "reject_business"
  | "hide_job"
  | "unhide_job"
  | "remove_job"
  | "ban"
  | "unban"
  | "add_moderator"
  | "remove_moderator"
  | "dismiss_report";

/**
 * Records one thing a member of staff did: who, what, to what. Written inside
 * the same transaction as the action, so an action without its record cannot
 * exist. `label` is the target's name at that moment, kept so the log still
 * reads after the job or person is gone.
 */
export async function logStaffAction(
  ctx: MutationCtx,
  staff: Doc<"users">,
  action: StaffAction,
  targetType: "job" | "user" | "company" | "report",
  targetId: string,
  label: string,
): Promise<void> {
  await ctx.db.insert("staffActions", { staffId: staff._id, action, targetType, targetId, label });
}
