import "server-only";

export const MAX_MEDICAL_RECORD_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 60;
export const DEFAULT_RETENTION_DAYS = 7 * 365;

export const MEDICAL_RECORD_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export const MEDICAL_RECORD_CATEGORIES = [
  "prescription",
  "lab_report",
  "medical_report",
  "other",
] as const;

export type MedicalRecordCategory = (typeof MEDICAL_RECORD_CATEGORIES)[number];

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 200) || "document";
}

export function validateMedicalDocument(
  file: Pick<File, "type" | "size" | "arrayBuffer">,
  bytes: Buffer,
): { ok: true; extension: string } | { ok: false; status: 400 | 415; error: string } {
  if (file.size <= 0 || file.size > MAX_MEDICAL_RECORD_BYTES) {
    return { ok: false, status: 400, error: "File must be between 1 byte and 10 MB." };
  }
  const extension = MEDICAL_RECORD_TYPES[file.type as keyof typeof MEDICAL_RECORD_TYPES];
  if (!extension) {
    return { ok: false, status: 415, error: "Only PDF, JPEG and PNG files are allowed." };
  }
  const isPdf = extension === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const isJpeg = extension === "jpg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = extension === "png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPdf && !isJpeg && !isPng) {
    return { ok: false, status: 415, error: "The file contents do not match the file type." };
  }
  return { ok: true, extension };
}

/**
 * A conservative pre-storage quarantine gate. This is deliberately fail-closed
 * for the standard EICAR test string and common executable signatures. Deployments
 * should additionally configure a real AV provider and keep scan_status=quarantined
 * until its asynchronous verdict is recorded.
 */
export function scanForKnownMalware(bytes: Buffer): { clean: boolean; signature?: string } {
  const text = bytes.toString("latin1");
  if (text.includes("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")) {
    return { clean: false, signature: "EICAR-Test-File" };
  }
  if (bytes.subarray(0, 2).equals(Buffer.from("MZ")) || bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    return { clean: false, signature: "Executable-Signature" };
  }
  return { clean: true };
}

export function normalizeCategory(value: FormDataEntryValue | null): MedicalRecordCategory {
  return typeof value === "string" && (MEDICAL_RECORD_CATEGORIES as readonly string[]).includes(value)
    ? (value as MedicalRecordCategory)
    : "other";
}
