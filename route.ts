import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MEDICAL_RECORD_BUCKET } from "@/lib/medicalRecords";
export const runtime = "nodejs";
export async function GET() {
  try {
    const session = await getServerSession(authOptions); const ownerId = session?.user?.id;
    if (!ownerId) return NextResponse.json({ error: "Please sign in to export documents." }, { status: 401 });
    const { data: records, error } = await supabaseAdmin.from("medical_records").select("id, file_name, category, content_type, file_size, created_at, version_number, retention_until, storage_path").eq("owner_id", ownerId).eq("scan_status", "clean").order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "Unable to prepare export." }, { status: 502 });
    const documents = await Promise.all((records || []).map(async (record) => {
      const { data } = await supabaseAdmin.storage.from(MEDICAL_RECORD_BUCKET).createSignedUrl(record.storage_path, 60).catch(() => ({ data: null }));
      const { storage_path: _storagePath, ...safeRecord } = record;
      return { ...safeRecord, downloadUrl: data?.signedUrl || null, linkExpiresInSeconds: data?.signedUrl ? 60 : 0 };
    }));
    return NextResponse.json({ exportedAt: new Date().toISOString(), expiresInSeconds: 60, documents });
  } catch { return NextResponse.json({ error: "Export request failed." }, { status: 500 }); }
}
