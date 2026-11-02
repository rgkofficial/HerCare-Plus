import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), from: vi.fn() }));
vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: mocks.from } }));
import { GET as overview } from "../src/app/api/admin/overview/route";
import { GET as exportReport } from "../src/app/api/admin/export/route";

describe("Admin console authorization and data minimization", () => {
  beforeEach(() => { vi.clearAllMocks(); delete process.env.ADMIN_MEMBERS; mocks.getServerSession.mockResolvedValue(null); });
  it("denies unauthenticated dashboard access", async () => {
    const response = await overview();
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("denies signed-in users without an explicit admin allowlist entry", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-123", email: "user@example.test" } });
    const response = await overview();
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("denies exports without administrator authorization", async () => {
    const response = await exportReport(new Request("http://localhost/api/admin/export?report=tickets"));
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("accepts only explicitly allowlisted admins", async () => {
    process.env.ADMIN_MEMBERS = "admin-1:analyst";
    mocks.getServerSession.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.test" } });
    const chain = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }), neq: vi.fn().mockReturnThis() };
    mocks.from.mockReturnValue(chain);
    const response = await overview();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.privacy.personalHealthDataIncluded).toBe(false);
  });
});
