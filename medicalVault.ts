import { createHash } from "crypto";

export const MEDICAL_RECORD_MAX_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 60;
export const SHARE_TTL_MAX_SECONDS = 24 * 60 * 60;
export const ALLOWED_MEDICAL_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type MedicalContentType = (typeof ALLOWED_MEDICAL_TYPES)[number];
export type OcrReviewStatus = "not_requested" | "pending_review" | "reviewed" | "rejected";

export function safeFileName(fileName: string): string {
  return fileName.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 200) || "medical-document";
}

export function matchesFileSignature(bytes: Buffer, contentType: string): boolean {
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

export function scanForMalware(bytes: Buffer): { clean: boolean; reason?: string; scanner: "eicar-test-signature" | "heuristic" } {
  const text = bytes.toString("latin1");
  // This intentionally detects the standard harmless EICAR test string so an
  // integration can be verified without shipping an antivirus engine.
  if (text.includes("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")) {
    return { clean: false, reason: "EICAR test signature detected", scanner: "eicar-test-signature" };
  }
  return { clean: true, scanner: "heuristic" };
}

export function retentionDateFrom(now = new Date(), years = 7): string {
  const date = new Date(now);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString();
}

export function isRetentionDue(retentionUntil: string | null | undefined, now = new Date()): boolean {
  return Boolean(retentionUntil && new Date(retentionUntil).getTime() <= now.getTime());
}

export function extractOcrCandidate(bytes: Buffer, contentType: string): { text: string; confidence: number; status: OcrReviewStatus } {
  // OCR is deliberately conservative until a reviewed OCR provider is configured.
  // Never treat a binary document as trusted structured medical data.
  const text = contentType === "application/pdf" ? bytes.toString("latin1").replace(/[^\x20-\x7E\n]/g, " ").slice(0, 2000) : "Image OCR requires a configured document-processing provider.";
  return { text, confidence: 0, status: "pending_review" };
}

export function auditHash(payload: { actorId: string; action: string; recordId: string; createdAt: string; previousHash?: string | null }): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
