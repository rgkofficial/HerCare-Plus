import { describe, expect, it } from "vitest";
import {
  sanitizeFileName,
  scanForKnownMalware,
  validateMedicalDocument,
} from "../src/lib/medicalRecordSecurity";

describe("medical document security gates", () => {
  it("rejects the EICAR antivirus test signature", () => {
    const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    expect(scanForKnownMalware(eicar)).toEqual({ clean: false, signature: "EICAR-Test-File" });
  });

  it("rejects executable signatures even when a document MIME type is claimed", () => {
    expect(scanForKnownMalware(Buffer.from("MZ\u0000malicious"))).toEqual({ clean: false, signature: "Executable-Signature" });
  });

  it("requires both an allowed MIME type and matching magic bytes", () => {
    const result = validateMedicalDocument(
      { type: "application/pdf", size: 12, arrayBuffer: async () => new ArrayBuffer(12) },
      Buffer.from("not-a-pdf"),
    );
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("removes path separators and control characters from display names", () => {
    expect(sanitizeFileName("../report\u0000\n.pdf")).toBe(".._report__.pdf");
  });
});
