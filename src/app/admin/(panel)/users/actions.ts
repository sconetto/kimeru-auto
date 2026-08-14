"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { adminUsers, adminRole } from "@/lib/db/schema";

const userSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(150).optional().default(""),
  password: z.string().min(8).max(200),
  role: z.enum(adminRole.enumValues).default("viewer"),
});

const updateUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().max(150).optional().default(""),
  role: z.enum(adminRole.enumValues),
  password: z.union([z.string().min(8).max(200), z.literal("")]).optional().default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function createUser(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;

  const parsed = userSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;

  const email = parsed.data.email.toLowerCase();
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing.length > 0) return;

  const passwordHash = await hash(parsed.data.password, 10);
  const [inserted] = await db
    .insert(adminUsers)
    .values({
      email,
      name: parsed.data.name || null,
      passwordHash,
      role: parsed.data.role,
    })
    .returning();

  await logAudit({
    adminId,
    action: "create",
    entityType: "admin_user",
    entityId: inserted.id,
    details: { email },
  });
  revalidatePath("/admin/users");
}

export async function updateUser(formData: FormData) {
  const actorId = await requireRole("admin");
  if (actorId === null) return;

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return;

  const { id, name, role, password, isActive } = parsed.data;
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!target) return;

  // Self-demotion/deactivation guard: an admin must not strip their own
  // access — that would lock the panel with no remaining administrators.
  if (id === actorId && (role !== "admin" || !isActive)) return;

  const passwordHash = password ? await hash(password, 10) : undefined;
  await db
    .update(adminUsers)
    .set({
      name: name || null,
      role,
      isActive,
      ...(passwordHash ? { passwordHash } : {}),
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, id));

  await logAudit({
    adminId: actorId,
    action: "update",
    entityType: "admin_user",
    entityId: id,
    details: { role, isActive, passwordChanged: Boolean(password) },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const actorId = await requireRole("admin");
  if (actorId === null) return;

  const id = Number(formData.get("id"));
  if (id === actorId) return;

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  await logAudit({ adminId: actorId, action: "delete", entityType: "admin_user", entityId: id });
  revalidatePath("/admin/users");
}
