import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auditHash } from "@/lib/medicalVault";

export type MedicalRecordAuditAction = "upload" | "download" | "delete" | "export" | "share" | "revoke_share" | "ocr_request" | "ocr_review";

export async function logMedicalRecordAction(actorId: string, action: MedicalRecordAuditAction, recordId: string, metadata: Record<string, string> = {}): Promise<void> {
  const { data: previous } = await supabaseAdmin.from("medical_record_audit_logs").select("event_hash").eq("record_id", recordId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const createdAt = new Date().toISOString();
  const eventHash = auditHash({ actorId, action, recordId, createdAt, previousHash: previous?.event_hash });
  const { error } = await supabaseAdmin.from("medical_record_audit_logs").insert({ actor_id: actorId, action, record_id: recordId, metadata, previous_hash: previous?.event_hash ?? null, event_hash: eventHash, created_at: createdAt });
  if (error) {
    console.error("Medical record audit logging failed.");
    throw new Error("Unable to write medical record audit log.");
  }
}
