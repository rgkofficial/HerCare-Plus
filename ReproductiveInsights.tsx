"use client";

import { Download, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { calculateReproductiveInsights, createClinicianDiscussionSummary, exportReproductiveData, type ReproductiveEntry } from "@/lib/reproductiveTracking";
import type { CycleEntry } from "@/lib/cycleEngine";

function asEntries(entries: CycleEntry[]): ReproductiveEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    entryType: "period",
    date: entry.date,
    flow: entry.flow,
    symptoms: entry.symptoms,
    mood: entry.mood,
    notes: entry.notes,
  }));
}

export default function ReproductiveInsights({ entries }: { entries: CycleEntry[] }) {
  const reproductiveEntries = asEntries(entries);
  const insights = reproductiveEntries.length ? calculateReproductiveInsights(reproductiveEntries) : null;

  const download = (content: string, filename: string, type = "application/json") => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4" aria-labelledby="reproductive-insights-heading">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 id="reproductive-insights-heading" className="text-lg font-black text-gray-800">Reproductive insights</h2>
          <p className="text-xs text-gray-500 mt-1">Estimates are transparent and not medical advice.</p>
        </div>
        <ShieldCheck size={20} className="text-emerald-500" aria-label="Privacy protected" />
      </div>
      {!insights ? (
        <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5 text-sm text-purple-800">
          Add two period starts to unlock fertility-window estimates and trend context.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-pink-100 bg-pink-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-pink-500">Fertile window</p>
              <p className="mt-2 text-sm font-black text-gray-800">{insights.fertility.fertileWindowStart && insights.fertility.fertileWindowEnd ? `${insights.fertility.fertileWindowStart} – ${insights.fertility.fertileWindowEnd}` : "Need more data"}</p>
              <p className="mt-1 text-[11px] text-gray-500">±{insights.fertility.uncertaintyDays} days · {insights.confidence} confidence</p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pattern</p>
              <p className="mt-2 text-sm font-black text-gray-800">{insights.irregular ? "Variable cycles" : "No high-variability flag"}</p>
              <p className="mt-1 text-[11px] text-gray-500">{insights.missingData ? "Some days are unlogged" : "Recent data is logged"}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <Sparkles className="text-purple-500 shrink-0" size={20} />
              <p className="text-xs leading-relaxed text-gray-600">{insights.fertility.explanation}</p>
            </div>
            {insights.commonSymptoms.length > 0 && <p className="mt-4 text-xs text-gray-600"><strong>Frequently logged:</strong> {insights.commonSymptoms.slice(0, 4).map((item) => `${item.symptom} (${item.loggedDays})`).join(", ")}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => download(exportReproductiveData(reproductiveEntries), "hercare-reproductive-export.json")} className="flex items-center justify-center gap-2 rounded-2xl bg-gray-800 px-3 py-3 text-[10px] font-black uppercase tracking-wider text-white"><Download size={15} /> Export data</button>
            <button onClick={() => download(createClinicianDiscussionSummary(reproductiveEntries), "hercare-clinician-summary.txt", "text/plain")} className="flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-3 text-[10px] font-black uppercase tracking-wider text-purple-700"><FileText size={15} /> Clinician summary</button>
          </div>
        </>
      )}
    </section>
  );
}
