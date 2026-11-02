import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MedicalRecordAuditAction =
  | "upload"
  | "download"
  | "delete"
  | "share"
  | "share_access";

export async function logMedicalRecordAction(
  actorId: string,
  action: MedicalRecordAuditAction,
  recordId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("medical_record_audit_logs")
    .insert({
      actor_id: actorId,
      action,
      record_id: recordId,
    });

  if (error) {
    // Do not log document contents or sensitive personal information.
    console.error("Medical record audit logging failed.");
    throw new Error("Unable to write medical record audit log.");
  }
}
