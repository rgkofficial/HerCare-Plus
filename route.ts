import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  screenHealthRisk,
  validateScreeningInput,
} from "@/lib/healthRiskScreening";
import { recordScreeningTelemetry } from "@/lib/screeningMonitoring";

const MAX_BODY_BYTES = 16_384;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }

  if (request.headers.get("content-length")) {
    const length = Number(request.headers.get("content-length"));
    if (!Number.isFinite(length) || length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    const input = validateScreeningInput(JSON.parse(rawBody));
    const startedAt = performance.now();
    const result = screenHealthRisk(input);
    recordScreeningTelemetry({
      modelVersion: result.modelVersion,
      latencyMs: Math.round(performance.now() - startedAt),
      outOfDistribution: result.outOfDistribution ?? false,
      confidence: result.confidence,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
