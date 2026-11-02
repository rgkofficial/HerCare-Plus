import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), from: vi.fn() }));
vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: mocks.from } }));
import { GET, PATCH, POST } from "../src/app/api/medical-history/route";
describe("structured medical history authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getServerSession.mockResolvedValue(null); });
  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET(new Request("http://localhost/api/medical-history"))).status).toBe(401);
    expect((await POST(new Request("http://localhost/api/medical-history", { method: "POST", body: "{}" }))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("applies the authenticated owner filter to updates", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "owner-a" } });
    const chain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }) };
    mocks.from.mockReturnValue(chain);
    const response = await PATCH(new Request("http://localhost/api/medical-history", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ resource: "medication", id: "record-owned-by-b", name: "Vitamin" }) }));
    expect(response.status).toBe(404);
    expect(chain.eq).toHaveBeenCalledWith("owner_id", "owner-a");
  });
});
