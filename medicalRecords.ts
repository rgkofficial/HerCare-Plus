import "server-only";

export const MAX_MEDICAL_RECORD_SIZE = 10 * 1024 * 1024;
export const MEDICAL_RECORD_BUCKET = "medical-records";
export const ALLOWED_MEDICAL_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type MedicalRecordCategory =
  | "prescription"
  | "lab_report"
  | "medical_report"
  | "other";

export const MEDICAL_RECORD_CATEGORIES: MedicalRecordCategory[] = [
  "prescription",
  "lab_report",
  "medical_report",
  "other",
];

export function safeFileName(name: string): string {
  return name.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 200) || "document";
}

export function hasValidSignature(bytes: Buffer, contentType: string): boolean {
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

/**
 * Synchronous first-line quarantine check. Production deployments should set
 * MEDICAL_RECORD_SCANNER=clamd and run the worker that updates scan_status.
 * EICAR is blocked here so test and development environments never persist a
 * known antivirus test payload.
 */
export function scanForKnownThreats(bytes: Buffer): { clean: boolean; reason?: string } {
  const text = bytes.toString("ascii");
  if (text.includes("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")) {
    return { clean: false, reason: "Known antivirus test signature detected." };
  }
  return { clean: true };
}

export function categoryFrom(value: FormDataEntryValue | null): MedicalRecordCategory {
  return typeof value === "string" && MEDICAL_RECORD_CATEGORIES.includes(value as MedicalRecordCategory)
    ? (value as MedicalRecordCategory)
    : "other";
}
