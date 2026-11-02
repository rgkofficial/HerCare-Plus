import "server-only";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AdminRole = "super_admin" | "operations_admin" | "support_agent" | "analyst";
export type AdminContext = { userId: string; email: string | null; role: AdminRole };

const roleRank: Record<AdminRole, number> = {
  analyst: 1,
  support_agent: 2,
  operations_admin: 3,
  super_admin: 4,
};

function configuredMembers(): Map<string, AdminRole> {
  const map = new Map<string, AdminRole>();
  for (const entry of (process.env.ADMIN_MEMBERS || "").split(",")) {
    const [userId, role = "analyst"] = entry.trim().split(":");
    if (userId && role in roleRank) map.set(userId, role as AdminRole);
  }
  return map;
}

export async function requireAdmin(minimum: AdminRole = "analyst"): Promise<AdminContext | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;
  const configuredRole = configuredMembers().get(userId);
  if (!configuredRole || roleRank[configuredRole] < roleRank[minimum]) return null;
  return { userId, email: session?.user?.email || null, role: configuredRole };
}

export async function writeAdminAudit(
  actor: AdminContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action,
    resource_type: resourceType,
    resource_id: resourceId || null,
    metadata,
  });
  if (error) throw new Error("Unable to write administrative audit event.");
}

export function adminUnauthorized() {
  return Response.json({ error: "Administrator authorization required." }, { status: 403 });
}
