import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthorizationError, RedisRateLimiter, assertOwnerOrAdmin, hasPermission, hashOpaqueToken, hashPassword, permissionsForRole, recordLoginAttempt, validateEmail, validatePassword, verifyPassword } from "../src/lib/identity";

describe("identity and privacy security primitives", () => {
  it("hashes passwords with a salted one-way representation", () => {
    const encoded = hashPassword("Strong-Password-2026!");
    expect(encoded.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("Strong-Password-2026!", encoded)).toBe(true);
    expect(verifyPassword("wrong-password", encoded)).toBe(false);
    expect(hashPassword("Strong-Password-2026!")).not.toBe(encoded);
  });

  it("enforces password and email policy", () => {
    expect(validateEmail("person@example.com")).toBe(true);
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validatePassword("Strong-Password-2026!")).toBe(true);
    expect(validatePassword("weak")).toBe(false);
  });

  it("keeps role permissions granular and denies BOLA", () => {
    const patient = { userId: "patient-1", tenantId: "tenant-1", role: "patient" as const, permissionVersion: 1 };
    expect(hasPermission(patient, "health:read:self")).toBe(true);
    expect(hasPermission(patient, "users:manage")).toBe(false);
    expect(permissionsForRole("administrator")).toContain("users:manage");
    expect(() => assertOwnerOrAdmin(patient, "patient-2")).toThrowError(AuthorizationError);
    expect(() => assertOwnerOrAdmin(patient, "patient-1")).not.toThrow();
  });

  it("rate limits in-memory fallback with retry information", async () => {
    const limiter = new RedisRateLimiter();
    expect((await limiter.check("test-key", 2, 60)).allowed).toBe(true);
    expect((await limiter.check("test-key", 2, 60)).allowed).toBe(true);
    const blocked = await limiter.check("test-key", 2, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("flags repeated failed logins and resets after success", () => {
    const identifier = `security-test-${Date.now()}`;
    for (let i = 0; i < 4; i++) expect(recordLoginAttempt(identifier, false).suspicious).toBe(false);
    expect(recordLoginAttempt(identifier, false).suspicious).toBe(true);
    expect(recordLoginAttempt(identifier, true)).toEqual({ suspicious: false, failedAttempts: 0 });
  });

  it("uses non-reversible recovery token hashes", () => {
    const token = "secret-recovery-token";
    expect(hashOpaqueToken(token)).not.toContain(token);
    expect(hashOpaqueToken(token)).toHaveLength(64);
  });
});

const { getCurrentIdentity } = vi.hoisted(() => ({ getCurrentIdentity: vi.fn() }));
vi.mock("../src/lib/identityServer", () => ({ getCurrentIdentity }));
vi.mock("../src/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: vi.fn() } }));

describe("account route negative authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); getCurrentIdentity.mockResolvedValue(null); });
  it("rejects unauthenticated access to account data", async () => {
    const { GET } = await import("../src/app/api/account/route");
    const response = await GET(new Request("http://localhost/api/account"));
    expect(response.status).toBe(401);
  });
  it("rejects unauthenticated deletion", async () => {
    const { DELETE } = await import("../src/app/api/account/route");
    const response = await DELETE(new Request("http://localhost/api/account", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(401);
  });
});
