import { beforeEach, describe, expect, it, vi } from "vitest";
const getServerSession = vi.hoisted(() => vi.fn());
vi.mock("next-auth/next", () => ({ getServerSession }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/medicalRecordAudit", () => ({ logMedicalRecordAction: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: vi.fn() } }));
import { GET, POST, DELETE } from "../src/app/api/medical-history/route";
describe("medical history authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); getServerSession.mockResolvedValue(null); });
  it("rejects unauthenticated dashboard reads", async () => { const response = await GET(new Request("http://localhost/api/medical-history")); expect(response.status).toBe(401); });
  it("rejects unauthenticated exports", async () => { const response = await GET(new Request("http://localhost/api/medical-history?type=export")); expect(response.status).toBe(401); });
  it("rejects unauthenticated profile writes", async () => { const response = await POST(new Request("http://localhost/api/medical-history", { method: "POST", body: JSON.stringify({ action: "profile" }), headers: { "content-type": "application/json" } })); expect(response.status).toBe(401); });
  it("rejects unauthenticated deletes", async () => { const response = await DELETE(new Request("http://localhost/api/medical-history", { method: "DELETE", body: JSON.stringify({ type: "medication", id: "other-user-item" }), headers: { "content-type": "application/json" } })); expect(response.status).toBe(401); });
});
