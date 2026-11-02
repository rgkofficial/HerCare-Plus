import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/next", () => ({ getServerSession }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: vi.fn() } }));

import { GET, POST } from "../src/app/api/symptom-journal/route";

describe("optional symptom journal sync authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); getServerSession.mockResolvedValue(null); });

  it("does not expose journal data without an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("does not accept sync writes without an authenticated session", async () => {
    const response = await POST(new Request("http://localhost/api/symptom-journal", { method: "POST", body: JSON.stringify({ entries: [] }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(401);
  });
});
