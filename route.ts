import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createClinicianDiscussionSummary,
  exportReproductiveData,
  validateReproductiveEntry,
  type ReproductiveEntry,
} from "@/lib/reproductiveTracking";

export const runtime = "nodejs";

async function authenticatedOwner() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

function unauthorized() {
  return NextResponse.json({ error: "Please sign in to access reproductive tracking data." }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const ownerId = await authenticatedOwner();
    if (!ownerId) return unauthorized();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "entries";
    const { data, error } = await supabaseAdmin
      .from("reproductive_entries")
      .select("id, entry_type, date, payload, created_at")
      .eq("owner_id", ownerId)
      .order("date", { ascending: true })
      .limit(500);
    if (error) return NextResponse.json({ error: "Unable to retrieve tracking data." }, { status: 502 });
    const entries = (data || []).map((row) => ({ id: row.id, entryType: row.entry_type, date: row.date, ...(row.payload || {}), createdAt: row.created_at })) as ReproductiveEntry[];
    if (mode === "summary") return NextResponse.json({ summary: createClinicianDiscussionSummary(entries) });
    if (mode === "export") return new NextResponse(exportReproductiveData(entries), { status: 200, headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=hercare-reproductive-export.json" } });
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve tracking data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ownerId = await authenticatedOwner();
    if (!ownerId) return unauthorized();
    const input = validateReproductiveEntry(await request.json());
    const { data, error } = await supabaseAdmin
      .from("reproductive_entries")
      .upsert({ id: input.id, owner_id: ownerId, entry_type: input.entryType, date: input.date, payload: { ...input, id: undefined, entryType: undefined, date: undefined } }, { onConflict: "id,owner_id" })
      .select("id, entry_type, date, payload, created_at")
      .single();
    if (error) return NextResponse.json({ error: "Unable to save tracking entry." }, { status: 502 });
    return NextResponse.json({ entry: { id: data.id, entryType: data.entry_type, date: data.date, ...(data.payload || {}), createdAt: data.created_at } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid tracking entry.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ownerId = await authenticatedOwner();
    if (!ownerId) return unauthorized();
    const id = new URL(request.url).searchParams.get("id");
    if (!id || id.length > 100) return NextResponse.json({ error: "A valid entry id is required." }, { status: 400 });
    const { error } = await supabaseAdmin.from("reproductive_entries").delete().eq("owner_id", ownerId).eq("id", id);
    if (error) return NextResponse.json({ error: "Unable to delete tracking entry." }, { status: 502 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Unable to delete tracking entry." }, { status: 500 });
  }
}
