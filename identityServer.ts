import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import type { Identity, Role } from "@/lib/identity";
import { ROLES } from "@/lib/identity";

export async function getCurrentIdentity(): Promise<Identity | null> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user?.id || !user.tenantId || !user.role || !ROLES.includes(user.role as Role)) return null;
    return { userId: user.id, tenantId: user.tenantId, role: user.role as Role, email: user.email || undefined, permissionVersion: user.permissionVersion || 1 };
  } catch { return null; }
}
