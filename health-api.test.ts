import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/health/route";

describe("health endpoint", () => {
  const originalSecret = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it("reports readiness and returns a request correlation ID", async () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.NEXTAUTH_SECRET;
    const response = await GET(new Request("http://localhost/api/health"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(response.headers.get("x-request-id")).toBe(body.requestId);
  });

  it("fails readiness when required production configuration is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXTAUTH_SECRET;
    const response = await GET(new Request("http://localhost/api/health"));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe("not_ready");
    expect(body.missingRequiredConfiguration).toContain("NEXTAUTH_SECRET");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
