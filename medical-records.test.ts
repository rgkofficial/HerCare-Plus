import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  createSignedUrl: vi.fn(),
  upload: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
  remove: vi.fn(),
  logMedicalRecordAction: vi.fn(),
}));

vi.mock("next-auth/next", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

vi.mock("@/lib/medicalRecordAudit", () => ({
  logMedicalRecordAction: mocks.logMedicalRecordAction,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mocks.select,
      insert: mocks.insert,
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mocks.createSignedUrl,
        upload: mocks.upload,
        remove: mocks.remove,
      })),
    },
  },
}));

import {
  GET as listRecords,
  POST as uploadRecord,
} from "../src/app/api/medical-records/route";

import {
  GET as downloadRecord,
} from "../src/app/api/medical-records/download/route";

import {
  DELETE as deleteRecord,
} from "../src/app/api/medical-records/delete/route";

describe("Medical records API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getServerSession.mockResolvedValue(null);

    mocks.select.mockReturnValue({ eq: mocks.eq });

    mocks.eq.mockReturnValue({ eq: mocks.eq });

    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    // Supports chained ownership filters ending in maybeSingle().
    mocks.eq.mockImplementation(() => ({
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
    }));

    mocks.createSignedUrl.mockResolvedValue({
      data: {
        signedUrl: "https://example.invalid/signed-test-url",
      },
      error: null,
    });

    mocks.insert.mockReturnValue({
      select: vi.fn(() => ({
        single: mocks.single,
      })),
    });

    mocks.single.mockResolvedValue({
      data: { id: "record-123" },
      error: null,
    });

    mocks.upload.mockResolvedValue({
      data: { path: "test-path" },
      error: null,
    });

    mocks.remove.mockResolvedValue({
      data: [],
      error: null,
    });

    mocks.logMedicalRecordAction.mockResolvedValue(undefined);
  });

  // Test 1
  it("rejects unauthenticated requests to list records", async () => {
    const response = await listRecords();

    expect(response.status).toBe(401);
  });

  // Test 2
  it("rejects unauthenticated requests to upload records", async () => {
    const request = new Request(
      "http://localhost/api/medical-records",
      { method: "POST" }
    );

    const response = await uploadRecord(request);

    expect(response.status).toBe(401);
  });

  // Test 3
  it("rejects unauthenticated download requests", async () => {
    const request = new Request(
      "http://localhost/api/medical-records/download?id=record-123"
    );

    const response = await downloadRecord(request);

    expect(response.status).toBe(401);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  // Test 4 — Newly added DELETE test
  it("rejects unauthenticated delete requests", async () => {
    const request = new Request(
      "http://localhost/api/medical-records/delete",
      {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: "record-123",
        }),
      }
    );

    const response = await deleteRecord(request);

    expect(response.status).toBe(401);
  });

  // Test 5
  it("does not create a signed URL when the record is not owned by the user", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-b" },
    });

    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = new Request(
      "http://localhost/api/medical-records/download?id=user-a-record"
    );

    const response = await downloadRecord(request);

    expect(response.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  // Test 6
  it("rejects unsupported file types before storage", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "test-user" },
    });

    const formData = new FormData();

    formData.append(
      "file",
      new Blob(["test content"], {
        type: "application/x-msdownload",
      }),
      "unsafe.exe"
    );

    const request = new Request(
      "http://localhost/api/medical-records",
      {
        method: "POST",
        body: formData,
      }
    );

    const response = await uploadRecord(request);

    expect(response.status).toBe(415);

    await expect(response.json()).resolves.toHaveProperty(
      "error",
      "Only PDF, JPEG and PNG files are allowed."
    );

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  // Test 7
  it("rejects a PDF whose contents do not match its declared type", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "test-user" },
    });

    const formData = new FormData();

    formData.append(
      "file",
      new Blob(["this is not a PDF"], {
        type: "application/pdf",
      }),
      "fake.pdf"
    );

    const request = new Request(
      "http://localhost/api/medical-records",
      {
        method: "POST",
        body: formData,
      }
    );

    const response = await uploadRecord(request);

    expect(response.status).toBe(415);

    await expect(response.json()).resolves.toHaveProperty(
      "error",
      "The file contents do not match the file type."
    );

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  // Test 8
  it("rejects files larger than 10 MB before storage", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "test-user" },
    });

    const oversizedBytes = new Uint8Array(
      10 * 1024 * 1024 + 1
    );

    const formData = new FormData();

    formData.append(
      "file",
      new Blob([oversizedBytes], {
        type: "application/pdf",
      }),
      "large.pdf"
    );

    const request = new Request(
      "http://localhost/api/medical-records",
      {
        method: "POST",
        body: formData,
      }
    );

    const response = await uploadRecord(request);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toHaveProperty(
      "error",
      "File must be between 1 byte and 10 MB."
    );

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  // Test 9
  it("returns an error when storage upload fails", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "test-user" },
    });

    mocks.upload.mockResolvedValue({
      data: null,
      error: { message: "Storage unavailable" },
    });

    const formData = new FormData();

    formData.append(
      "file",
      new Blob(["%PDF-1.4\nTest document"], {
        type: "application/pdf",
      }),
      "test-report.pdf"
    );

    const request = new Request(
      "http://localhost/api/medical-records",
      {
        method: "POST",
        body: formData,
      }
    );

    const response = await uploadRecord(request);

    expect(response.status).toBe(502);

    await expect(response.json()).resolves.toHaveProperty(
      "error",
      "Unable to store the document."
    );

    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  // Test 10
  it("removes the uploaded file when saving its database record fails", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "test-user" },
    });

    mocks.upload.mockResolvedValue({
      data: { path: "test-path" },
      error: null,
    });

    mocks.single.mockResolvedValue({
      data: null,
      error: { message: "Database unavailable" },
    });

    const formData = new FormData();

    formData.append(
      "file",
      new Blob(["%PDF-1.4\nTest document"], {
        type: "application/pdf",
      }),
      "test-report.pdf"
    );

    const request = new Request(
      "http://localhost/api/medical-records",
      {
        method: "POST",
        body: formData,
      }
    );

    const response = await uploadRecord(request);

    expect(response.status).toBe(502);

    await expect(response.json()).resolves.toHaveProperty(
      "error",
      "Unable to save document details."
    );

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });

  // Test 11
  it("successfully uploads a valid PDF and saves its metadata", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "test-user" },
    });

    mocks.upload.mockResolvedValue({
      data: { path: "test-user/test-file.pdf" },
      error: null,
    });

    mocks.single.mockResolvedValue({
      data: {
        id: "record-123",
        file_name: "test-report.pdf",
        category: "other",
        content_type: "application/pdf",
        file_size: 23,
        created_at: "2026-10-23T00:00:00.000Z",
      },
      error: null,
    });

    const formData = new FormData();

    formData.append(
      "file",
      new Blob(["%PDF-1.4\nTest document"], {
        type: "application/pdf",
      }),
      "test-report.pdf"
    );

    const request = new Request(
      "http://localhost/api/medical-records",
      {
        method: "POST",
        body: formData,
      }
    );

    const response = await uploadRecord(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.record.id).toBe("record-123");
    expect(mocks.upload).toHaveBeenCalledTimes(1);

    expect(mocks.logMedicalRecordAction).toHaveBeenCalledWith(
      "test-user",
      "upload",
      "record-123"
    );
  });
});