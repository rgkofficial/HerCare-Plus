import "next-auth";
import "next-auth/jwt";
import type { Role } from "@/lib/identity";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: Role;
      permissionVersion: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    tenantId?: string;
    role?: Role;
    permissionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    role?: Role;
    permissionVersion?: number;
  }
}
