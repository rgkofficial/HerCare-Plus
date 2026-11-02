import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ROLES = ["patient", "clinician", "specialist", "administrator"] as const;
export type Role = (typeof ROLES)[number];
export const PERMISSIONS = [
  "profile:read", "profile:write", "privacy:read", "privacy:write", "consent:write",
  "health:read:self", "health:write:self", "health:read:shared", "health:write:shared",
  "provider:grant", "provider:revoke", "audit:read:self", "audit:read:tenant", "users:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  patient: ["profile:read", "profile:write", "privacy:read", "privacy:write", "consent:write", "health:read:self", "health:write:self", "provider:grant", "provider:revoke", "audit:read:self"],
  clinician: ["profile:read", "privacy:read", "consent:write", "health:read:shared", "health:write:shared", "audit:read:self"],
  specialist: ["profile:read", "privacy:read", "consent:write", "health:read:shared", "health:write:shared", "audit:read:self"],
  administrator: [...PERMISSIONS],
};

export type Identity = { userId: string; tenantId: string; role: Role; email?: string; permissionVersion: number };
export type AccessGrant = { id: string; patientId: string; providerId: string; providerRole: "clinician" | "specialist"; permissions: Permission[]; status: "active" | "revoked"; expiresAt?: string };
export type AccessEvent = { id: string; actorId: string; subjectId: string; tenantId: string; action: string; resourceType: string; resourceId?: string; createdAt: string; metadata?: Record<string, string> };

export function permissionsForRole(role: Role): readonly Permission[] { return ROLE_PERMISSIONS[role]; }
export function hasPermission(identity: Identity, permission: Permission): boolean { return identity.role === "administrator" || ROLE_PERMISSIONS[identity.role].includes(permission); }
export function requirePermission(identity: Identity | null, permission: Permission): Identity {
  if (!identity || !hasPermission(identity, permission)) throw new AuthorizationError("Forbidden", "INSUFFICIENT_PERMISSION");
  return identity;
}
export function assertOwnerOrAdmin(identity: Identity | null, ownerId: string): Identity {
  if (!identity || (identity.userId !== ownerId && identity.role !== "administrator")) throw new AuthorizationError("Forbidden", "OBJECT_ACCESS_DENIED");
  return identity;
}
export function assertSameTenant(identity: Identity | null, tenantId: string): Identity {
  if (!identity || identity.tenantId !== tenantId) throw new AuthorizationError("Forbidden", "TENANT_ACCESS_DENIED");
  return identity;
}

export class AuthorizationError extends Error {
  code: "UNAUTHENTICATED" | "INSUFFICIENT_PERMISSION" | "OBJECT_ACCESS_DENIED" | "TENANT_ACCESS_DENIED";
  status: number;
  constructor(message: string, code: AuthorizationError["code"]) { super(message); this.name = "AuthorizationError"; this.code = code; this.status = code === "UNAUTHENTICATED" ? 401 : 403; }
}

export function validateEmail(value: unknown): value is string { return typeof value === "string" && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
export function validatePassword(value: unknown): value is string { return typeof value === "string" && value.length >= 12 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value); }
export function hashPassword(password: string): string { const salt = randomBytes(16).toString("hex"); const derived = scryptSync(password, salt, 64).toString("hex"); return `scrypt$${salt}$${derived}`; }
export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, salt, expected] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  try { const actual = scryptSync(password, salt, 64); const target = Buffer.from(expected, "hex"); return target.length === actual.length && timingSafeEqual(actual, target); } catch { return false; }
}
export function createOpaqueToken(bytes = 32): string { return randomBytes(bytes).toString("base64url"); }
export function hashOpaqueToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };
export interface DistributedRateLimitStore { increment(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }>; }
const localBuckets = new Map<string, { count: number; resetAt: number }>();
export class RedisRateLimiter {
  constructor(private readonly store?: DistributedRateLimitStore) {}
  async check(key: string, limit: number, windowSeconds = 60): Promise<RateLimitResult> {
    const now = Date.now();
    const result = this.store ? await this.store.increment(key, windowSeconds) : (() => {
      const current = localBuckets.get(key);
      const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowSeconds * 1000 } : current;
      bucket.count += 1; localBuckets.set(key, bucket); return bucket;
    })();
    return { allowed: result.count <= limit, remaining: Math.max(0, limit - result.count), retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt - now) / 1000)) };
  }
}
export const authRateLimiter = new RedisRateLimiter();

const failedLogins = new Map<string, { count: number; firstAt: number; lastAt: number }>();
export function recordLoginAttempt(identifier: string, success: boolean, now = Date.now()): { suspicious: boolean; failedAttempts: number } {
  const key = identifier.trim().toLowerCase();
  if (success) { failedLogins.delete(key); return { suspicious: false, failedAttempts: 0 }; }
  const current = failedLogins.get(key);
  const item = !current || now - current.firstAt > 15 * 60_000 ? { count: 0, firstAt: now, lastAt: now } : current;
  item.count += 1; item.lastAt = now; failedLogins.set(key, item);
  return { suspicious: item.count >= 5, failedAttempts: item.count };
}
