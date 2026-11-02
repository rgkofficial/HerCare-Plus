import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/next", () => ({ getServerSession }));
vi.mock("../src/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));

import { GET, POST, DELETE } from "../src/app/api/reproductive-tracking/route";

describe("reproductive tracking API authorization", () => {
  beforeEach(() => getServerSession.mockResolvedValue(null));

  it.each([
    ["GET", () => GET(new Request("http://localhost/api/reproductive-tracking"))],
    ["POST", () => POST(new Request("http://localhost/api/reproductive-tracking", { method: "POST", body: "{}" }))],
    ["DELETE", () => DELETE(new Request("http://localhost/api/reproductive-tracking?id=owned-entry", { method: "DELETE" }))],
  ])("rejects unauthenticated %s access", async (_method, invoke) => {
    const response = await invoke();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Please sign in to access reproductive tracking data." });
  });
});
