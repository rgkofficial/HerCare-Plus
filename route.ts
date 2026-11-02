import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logMedicalRecordAction } from "@/lib/medicalRecordAudit";

export const runtime = "nodejs";
const MAX_SHARE_HOURS = 72;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function ownerIdOr401() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const ownerId = await ownerIdOr401();
    if (!ownerId) return NextResponse.json({ error: "Please sign in to share documents." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const recordId = body && typeof body.recordId === "string" ? body.recordId : null;
    const requestedHours = body && Number.isFinite(body.expiresInHours) ? Number(body.expiresInHours) : 24;
    const expiresInHours = Math.min(MAX_SHARE_HOURS, Math.max(1, Math.floor(requestedHours)));
    const recipientLabel = body && typeof body.recipientLabel === "string"
      ? body.recipientLabel.trim().slice(0, 100) || "Care provider"
      : "Care provider";
    if (!recordId) return NextResponse.json({ error: "A document ID is required." }, { status: 400 });

    const { data: record, error: recordError } = await supabaseAdmin
      .from("medical_records").select("id, owner_id, scan_status").eq("id", recordId).eq("owner_id", ownerId).maybeSingle();
    if (recordError) return NextResponse.json({ error: "Unable to retrieve document details." }, { status: 502 });
    if (!record) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (record.scan_status === "rejected" || record.scan_status === "quarantined") {
      return NextResponse.json({ error: "This document is not cleared for sharing." }, { status: 409 });
    }

    const token = randomBytes(32).toString("base64url");
    const { data: share, error: insertError } = await supabaseAdmin.from("medical_record_shares").insert({
      record_id: record.id, owner_id: ownerId, token_hash: hashToken(token), recipient_label: recipientLabel,
      expires_at: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    }).select("id, record_id, recipient_label, expires_at, created_at").single();
    if (insertError) return NextResponse.json({ error: "Unable to create a secure share link." }, { status: 502 });
    await logMedicalRecordAction(ownerId, "share_created", record.id);
    return NextResponse.json({ share, token, warning: "This token is shown once. Store it securely and do not put it in logs." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Share request failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ownerId = await ownerIdOr401();
    if (!ownerId) return NextResponse.json({ error: "Please sign in to revoke shares." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const shareId = body && typeof body.id === "string" ? body.id : null;
    if (!shareId) return NextResponse.json({ error: "A share ID is required." }, { status: 400 });
    const { data: share, error: lookupError } = await supabaseAdmin.from("medical_record_shares")
      .select("id, record_id").eq("id", shareId).eq("owner_id", ownerId).is("revoked_at", null).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Unable to retrieve share details." }, { status: 502 });
    if (!share) return NextResponse.json({ error: "Share not found." }, { status: 404 });
    const { error } = await supabaseAdmin.from("medical_record_shares").update({ revoked_at: new Date().toISOString() }).eq("id", share.id).eq("owner_id", ownerId);
    if (error) return NextResponse.json({ error: "Unable to revoke share." }, { status: 502 });
    await logMedicalRecordAction(ownerId, "share_revoked", share.record_id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Share revocation failed." }, { status: 500 });
  }
}
