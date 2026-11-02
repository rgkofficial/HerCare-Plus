"use client";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Download, Flag, LifeBuoy, RefreshCw, ShieldCheck, Bell } from "lucide-react";

type Overview = {
  generatedAt: string;
  privacy: { scope: string; personalHealthDataIncluded: boolean };
  metrics: { operationalEvents: number; openTickets: number; notificationDeliveries: number; notificationByStatus: Record<string, number> };
  serviceHealth: Array<{ service: string; status: string; incidents: number }>;
  featureFlags: Array<{ key: string; description: string; enabled: boolean; rollout_percent: number }>;
  openTickets: Array<{ id: string; category: string; status: string; priority: string; subject: string; assigned_to?: string }>;
  recentEvents: Array<{ service: string; event_type: string; status: string; error_code?: string; occurred_at: string }>;
};
const statusColor: Record<string, string> = { ok: "bg-emerald-100 text-emerald-800", warning: "bg-amber-100 text-amber-800", error: "bg-rose-100 text-rose-800", running: "bg-blue-100 text-blue-800" };
const metricCards = [
  ["Open support tickets", "openTickets", LifeBuoy],
  ["Operational events", "operationalEvents", Activity],
  ["Delivery records", "notificationDeliveries", Bell],
  ["Configured flags", "flags", Flag],
] as const;
export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/overview", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load dashboard."); setOverview(result); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load dashboard."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function exportReport(report: string) { window.location.href = `/api/admin/export?report=${report}`; }
  if (loading) return <main className="min-h-screen bg-slate-50 px-5 pt-28 pb-20"><p className="text-slate-600">Loading operations dashboard…</p></main>;
  if (error) return <main className="min-h-screen bg-slate-50 px-5 pt-28 pb-20"><div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-white p-8"><AlertTriangle className="text-rose-600" /><h1 className="mt-3 text-2xl font-black text-slate-900">Admin access unavailable</h1><p className="mt-2 text-slate-600">{error}</p><button onClick={() => void load()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Retry</button></div></main>;
  if (!overview) return null;
  return <main className="min-h-screen bg-slate-50 px-5 pt-28 pb-20"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-indigo-600"><ShieldCheck size={17} /> Restricted operations</div><h1 className="mt-2 text-4xl font-black text-slate-900">Admin Console</h1><p className="mt-2 max-w-2xl text-slate-600">Operational control without unnecessary exposure of personal health information.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm"><RefreshCw size={17} /> Refresh</button></header>
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><ShieldCheck size={18} /><span><strong>Privacy boundary:</strong> {overview.privacy.scope}. PHI included: {overview.privacy.personalHealthDataIncluded ? "yes" : "no"}.</span></div>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metricCards.map(([label, key, Icon]) => { const value = key === "flags" ? overview.featureFlags.length : overview.metrics[key]; return <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{label}</span><Icon size={20} className="text-indigo-500" /></div><p className="mt-3 text-3xl font-black text-slate-900">{String(value)}</p></div>; })}</section>
    <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">Service health</h2><span className="text-xs text-slate-500">Last 50 events</span></div><div className="mt-4 space-y-3">{overview.serviceHealth.length ? overview.serviceHealth.map((service) => <div key={service.service} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><div><p className="font-bold text-slate-800">{service.service}</p><p className="text-xs text-slate-500">{service.incidents} recent incidents</p></div><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusColor[service.status] || statusColor.warning}`}>{service.status}</span></div>) : <p className="text-sm text-slate-500">No health events reported yet.</p>}</div></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">Feature flags</h2><Flag size={20} className="text-indigo-500" /></div><div className="mt-4 space-y-3">{overview.featureFlags.length ? overview.featureFlags.map((flag) => <div key={flag.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><div><p className="font-bold text-slate-800">{flag.key}</p><p className="text-xs text-slate-500">{flag.description || "No description"} · {flag.rollout_percent}% rollout</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${flag.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{flag.enabled ? "Enabled" : "Off"}</span></div>) : <p className="text-sm text-slate-500">No flags configured.</p>}</div></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">Support queue</h2><p className="text-sm text-slate-500">Redacted subjects only; clinical content is not displayed.</p></div><div className="flex gap-2"><button onClick={() => exportReport("tickets")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"><Download size={15} /> CSV</button></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead><tbody>{overview.openTickets.map((ticket) => <tr key={ticket.id} className="border-b border-slate-50"><td className="py-3 font-bold text-slate-800">{ticket.subject}</td><td>{ticket.category}</td><td>{ticket.priority}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{ticket.status}</span></td><td>{ticket.assigned_to || "Unassigned"}</td></tr>)}</tbody></table>{!overview.openTickets.length && <p className="py-6 text-sm text-slate-500">No open tickets.</p>}</div></section>
    <section className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mr-auto"><h2 className="font-black text-slate-900">Minimized reports</h2><p className="text-sm text-slate-500">Exports contain operational fields only and are audited.</p></div>{["operations", "notifications"].map((report) => <button key={report} onClick={() => exportReport(report)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold capitalize text-white hover:bg-indigo-700"><Download size={15} /> {report} CSV</button>)}</section>
    <p className="text-xs text-slate-500">Updated {new Date(overview.generatedAt).toLocaleString()} · Administrative actions are recorded in the audit log.</p>
  </div></main>;
}
