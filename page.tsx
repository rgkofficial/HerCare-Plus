"use client";

import { useEffect, useState, useRef } from "react";

type MedicalRecord = {
  id: string;
  file_name: string;
  category: string;
  content_type: string;
  file_size: number;
  created_at: string;
  version_number?: number;
  previous_version_id?: string | null;
};

const categories = [
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab Report" },
  { value: "medical_report", label: "Medical Report" },
  { value: "other", label: "Other" },
];

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [versionTarget, setVersionTarget] =
  useState<MedicalRecord | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionUploading, setVersionUploading] = useState(false);
  const [historyTarget, setHistoryTarget] =
  useState<MedicalRecord | null>(null);
  const [history, setHistory] = useState<MedicalRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/medical-records", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load documents.");
      }

      setRecords(result.records || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load documents."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!file) {
      setError("Please select a document first.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch("/api/medical-records", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed.");
      }

      setFile(null);
      if (formRef.current) {
       formRef.current.reset();
      }
      setCategory("other");
      setMessage("Document uploaded successfully.");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadDocument(record: MedicalRecord) {
    setBusyId(record.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/medical-records/download?id=${encodeURIComponent(record.id)}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Download failed.");
      }

      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = record.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function previewDocument(record: MedicalRecord) {
  setBusyId(record.id);
  setError("");
  setMessage("");

  // Open a tab immediately to reduce popup-blocker issues.
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) {
    setError("Please allow pop-ups to preview this document.");
    setBusyId(null);
    return;
  }

  try {
    const response = await fetch(
      `/api/medical-records/download?id=${encodeURIComponent(record.id)}`
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Preview failed.");
    }

    previewWindow.opener = null;
    previewWindow.location.href = result.downloadUrl;
  } catch (err) {
    previewWindow.close();
    setError(err instanceof Error ? err.message : "Preview failed.");
  } finally {
    setBusyId(null);
  }
}

  async function deleteDocument(record: MedicalRecord) {
    const confirmed = window.confirm(
      `Delete "${record.file_name}" permanently?`
    );

    if (!confirmed) return;

    setBusyId(record.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/medical-records/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delete failed.");
      }

      setRecords((current) =>
        current.filter((item) => item.id !== record.id)
      );
      setMessage("Document deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

   async function uploadNewVersion(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (!versionTarget || !versionFile) {
    setError("Select a document before uploading a new version.");
    return;
  }

  if (versionFile.size > 10 * 1024 * 1024) {
    setError("The file must be 10 MB or smaller.");
    return;
  }

  setVersionUploading(true);
  setError("");
  setMessage("");

  try {
    const formData = new FormData();
    formData.append("file", versionFile);
    formData.append("id", versionTarget.id);
    formData.append("category", versionTarget.category || "other");

    const response = await fetch("/api/medical-records/versions", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not upload the new version."
      );
    }

    setMessage("New document version uploaded successfully.");
    setVersionTarget(null);
    setVersionFile(null);
    await loadRecords();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not upload the new version."
    );
  } finally {
    setVersionUploading(false);
  }
}

async function viewVersionHistory(record: MedicalRecord) {
  setHistoryTarget(record);
  setHistory([]);
  setHistoryLoading(true);
  setError("");
  setMessage("");

  try {
    const response = await fetch(
      `/api/medical-records/versions?id=${encodeURIComponent(record.id)}`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not load version history."
      );
    }

    const versions = Array.isArray(result)
      ? result
      : result.versions ?? result.records;

    if (!Array.isArray(versions)) {
      throw new Error("Unexpected version-history response.");
    }

    setHistory(versions);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not load version history."
    );
  } finally {
    setHistoryLoading(false);
  }
}

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const filteredRecords = records.filter((record) => {
  const matchesSearch = record.file_name
    .toLowerCase()
    .includes(searchTerm.toLowerCase());

  const matchesCategory =
    filterCategory === "all" || record.category === filterCategory;

  return matchesSearch && matchesCategory;
});

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        color: "#243047",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Medical Records Vault</h1>
        <p style={{ color: "#596579", lineHeight: 1.6 }}>
          Store and manage your prescriptions, laboratory reports, and medical
          documents in one place.
        </p>
      </header>

      <section
        style={{
          border: "1px solid #dce3ec",
          borderRadius: 12,
          padding: 22,
          marginBottom: 28,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Upload a document</h2>
        <p style={{ color: "#596579", fontSize: 14 }}>
          PDF, JPEG, or PNG · Maximum 10 MB
        </p>

       <form ref={formRef} onSubmit={uploadDocument}>
          <label
            htmlFor="medical-file"
            style={{ display: "block", marginBottom: 8 }}
          >
            Choose file
          </label>
          <input
            id="medical-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) =>
              setFile(event.target.files?.[0] || null)
            }
            required
            style={{ display: "block", marginBottom: 18, maxWidth: "100%" }}
          />

          <label
            htmlFor="medical-category"
            style={{ display: "block", marginBottom: 8 }}
          >
            Document category
          </label>
          <select
            id="medical-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{
              padding: 10,
              width: "100%",
              maxWidth: 360,
              marginBottom: 18,
            }}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div>
            <button type="submit" disabled={uploading} style={buttonStyle}>
              {uploading ? "Uploading..." : "Upload document"}
            </button>
          </div>
        </form>
      </section>

      {message && (
        <p role="status" style={{ color: "#167044" }}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>
      )}

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2>Your documents</h2>
          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={loading}
            style={buttonStyle}
          >
            Refresh
          </button>
        </div>

        <div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  }}
>
  <input
    type="text"
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    placeholder="Search by filename..."
    aria-label="Search medical documents"
    style={{
      flex: "1 1 220px",
      padding: 12,
      border: "1px solid #dce3ec",
      borderRadius: 8,
    }}
  />

  <select
    value={filterCategory}
    onChange={(event) => setFilterCategory(event.target.value)}
    aria-label="Filter by category"
    style={{
      flex: "0 1 200px",
      padding: 12,
      border: "1px solid #dce3ec",
      borderRadius: 8,
    }}
  >
    <option value="all">All categories</option>
    {categories.map((item) => (
      <option key={item.value} value={item.value}>
        {item.label}
      </option>
    ))}
  </select>
</div>

        {loading ? (
          <p>Loading documents...</p>
        ) : records.length === 0 ? (
          <p style={{ color: "#596579" }}>
            No documents yet. Upload a test document to get started.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredRecords.map((record) => (
              <article
                key={record.id}
                style={{
                  border: "1px solid #dce3ec",
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <h3 style={{ marginTop: 0, overflowWrap: "anywhere" }}>
                  {record.file_name}
                </h3>
                <p style={{ color: "#596579", fontSize: 14 }}>
                  {categories.find((item) => item.value === record.category)
                    ?.label || "Other"}{" "}
                  · {formatSize(Number(record.file_size))} ·{" "}
                  {new Date(record.created_at).toLocaleDateString()}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <button
    type="button"
    onClick={() => void previewDocument(record)}
    disabled={busyId === record.id}
    style={buttonStyle}
  >
    {busyId === record.id ? "Please wait..." : "Preview"}
  </button>

  <button
    type="button"
    onClick={() => void downloadDocument(record)}
    disabled={busyId === record.id}
    style={buttonStyle}
  >
    {busyId === record.id ? "Please wait..." : "Download"}
  </button>

  <button
    type="button"
    onClick={() => void deleteDocument(record)}
    disabled={busyId === record.id}
    style={{
      ...buttonStyle,
      background: "#fff",
      color: "#b42318",
      border: "1px solid #d9a5a5",
    }}
  >
    Delete
  </button>
   <button
  type="button"
  onClick={() => {
    setVersionTarget(record);
    setVersionFile(null);
    setError("");
    setMessage("");
  }}
  style={buttonStyle}
>
  Upload New Version
</button>

<button
  type="button"
  onClick={() => void viewVersionHistory(record)}
  style={buttonStyle}
>
  View Version History
</button>
</div>

   {versionTarget?.id === record.id && (
  <form
    onSubmit={uploadNewVersion}
    style={{
      marginTop: 16,
      padding: 16,
      background: "#f5f7fa",
      borderRadius: 8,
    }}
  >
    <h4>Upload a new version</h4>

    <p style={{ fontSize: 14, color: "#596579" }}>
      Choose the updated PDF, JPEG, or PNG file (maximum 10 MB).
    </p>

    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      required
      onChange={(event) =>
        setVersionFile(event.target.files?.[0] ?? null)
      }
      style={{ display: "block", marginBottom: 12 }}
    />

    <button type="submit" disabled={versionUploading} style={buttonStyle}>
      {versionUploading ? "Uploading..." : "Save New Version"}
    </button>

    <button
      type="button"
      onClick={() => {
        setVersionTarget(null);
        setVersionFile(null);
      }}
      style={{ ...buttonStyle, marginLeft: 8 }}
    >
      Cancel
    </button>
  </form>
)}

{historyTarget?.id === record.id && (
  <div
    style={{
      marginTop: 16,
      padding: 16,
      background: "#f5f7fa",
      borderRadius: 8,
    }}
  >
    <h4>Version History</h4>

    {historyLoading ? (
      <p>Loading version history...</p>
    ) : history.length === 0 ? (
      <p>No version history was returned.</p>
    ) : (
      <ol>
        {history.map((version) => (
          <li key={version.id} style={{ marginBottom: 10 }}>
            <strong>
              Version {version.version_number ?? 1}: {version.file_name}
            </strong>
            <br />
            <span style={{ fontSize: 13, color: "#596579" }}>
              {new Date(version.created_at).toLocaleString()} ·{" "}
              {formatSize(Number(version.file_size))}
            </span>
            <br />
            <button
              type="button"
              onClick={() => void downloadDocument(version)}
              disabled={busyId === version.id}
              style={{ ...buttonStyle, marginTop: 6 }}
            >
              Download this version
            </button>
          </li>
        ))}
      </ol>
    )}

    <button
      type="button"
      onClick={() => {
        setHistoryTarget(null);
        setHistory([]);
      }}
      style={buttonStyle}
    >
      Close History
    </button>
  </div>
)}
              </article>
            ))}
          </div>
        )}
      </section>

      <p style={{ marginTop: 32, fontSize: 13, color: "#596579" }}>
        Privacy controls: uploads are signature-validated, screened before
        storage, isolated by account, and exposed through 60-second links.
        OCR extraction is opt-in and requires human review before it can be
        treated as structured health information.
      </p>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#176b59",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
};
