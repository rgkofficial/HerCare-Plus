import { NextResponse } from "next/server";
import { logEvent, requestId } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requiredProductionConfig = ["NEXTAUTH_SECRET"] as const;
const optionalIntegrations = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY"] as const;

export async function GET(request: Request) {
  const id = requestId(request);
  const missingRequired =
    process.env.NODE_ENV === "production"
      ? requiredProductionConfig.filter((name) => !process.env[name])
      : [];
  const configuredOptional = optionalIntegrations.filter((name) => Boolean(process.env[name]));
  const ready = missingRequired.length === 0;
  const body = {
    status: ready ? "ok" : "not_ready",
    service: "hercare-plus",
    version: process.env.npm_package_version || "0.1.0",
    timestamp: new Date().toISOString(),
    requestId: id,
    checks: {
      process: "ok",
      requiredConfiguration: ready ? "ok" : "missing",
      integrationsConfigured: configuredOptional,
    },
    ...(ready ? {} : { missingRequiredConfiguration: missingRequired }),
  };
  logEvent(ready ? "info" : "error", "health_check", { requestId: id, ready });
  return NextResponse.json(body, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Request-ID": id },
  });
}
