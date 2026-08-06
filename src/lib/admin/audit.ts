import { db } from "@/lib/db";
import { adminAuditLog, type auditAction } from "@/lib/db/schema";

/**
 * Admin audit logging — records every admin write action for
 * accountability (admin-panel spec: "Admin activity audit log").
 */

export type AuditAction = (typeof auditAction.enumValues)[number];

export async function logAudit(input: {
  adminId: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(adminAuditLog).values({
    adminId: input.adminId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    details: input.details,
  });
}
