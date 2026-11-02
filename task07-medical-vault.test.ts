import { describe, expect, it } from "vitest";
import { auditHash, extractOcrCandidate, isRetentionDue, matchesFileSignature, retentionDateFrom, scanForMalware } from "@/lib/medicalVault";

describe("Task 7 medical vault controls", () => {
  it("accepts matching signatures and rejects MIME-only spoofing", () => {
    expect(matchesFileSignature(Buffer.from("%PDF-1.7\n"), "application/pdf")).toBe(true);
    expect(matchesFileSignature(Buffer.from("not a PDF"), "application/pdf")).toBe(false);
  });

  it("quarantines the harmless EICAR test signature before storage", () => {
    const bytes = Buffer.from("%PDF-1.4\nX5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const scan = scanForMalware(bytes);
    expect(scan.clean).toBe(false);
    expect(scan.reason).toContain("EICAR");
  });

  it("calculates and evaluates retention deadlines", () => {
    const now = new Date("2026-11-01T00:00:00.000Z");
    expect(retentionDateFrom(now)).toBe("2033-11-01T00:00:00.000Z");
    expect(isRetentionDue("2026-10-31T23:59:59.000Z", now)).toBe(true);
    expect(isRetentionDue("2026-11-02T00:00:00.000Z", now)).toBe(false);
  });

  it("keeps OCR untrusted until human review", () => {
    const extraction = extractOcrCandidate(Buffer.from("%PDF-1.4\npatient: Example"), "application/pdf");
    expect(extraction.status).toBe("pending_review");
    expect(extraction.confidence).toBe(0);
  });

  it("produces different audit hashes when the chain input changes", () => {
    const first = auditHash({ actorId: "owner-a", action: "download", recordId: "record-1", createdAt: "2026-11-01T00:00:00.000Z" });
    const second = auditHash({ actorId: "owner-a", action: "download", recordId: "record-1", createdAt: "2026-11-01T00:00:00.000Z", previousHash: first });
    expect(first).toHaveLength(64);
    expect(second).toHaveLength(64);
    expect(second).not.toBe(first);
  });
});
