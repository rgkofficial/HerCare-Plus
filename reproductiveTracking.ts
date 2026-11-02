/**
 * Reproductive tracking domain logic.
 *
 * Deliberately uses calendar-day arithmetic in UTC. Parsing a YYYY-MM-DD value
 * as a local Date makes predictions change when a user travels across time
 * zones; this module keeps the user's recorded day stable.
 */
export type ReproductiveEntryType = "period" | "symptom" | "mood" | "pcos" | "pregnancy";
export type PredictionConfidence = "insufficient" | "low" | "moderate" | "good";

export interface ReproductiveEntry {
  id: string;
  entryType: ReproductiveEntryType;
  date: string;
  flow?: "spotting" | "light" | "medium" | "heavy";
  symptoms?: string[];
  mood?: string;
  painScore?: number;
  notes?: string;
  pregnancyStatus?: "trying" | "positive" | "negative" | "not_applicable";
  createdAt?: string;
}

export interface FertilityEstimate {
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  estimatedOvulation: string | null;
  uncertaintyDays: number;
  explanation: string;
}

export interface ReproductiveInsights {
  lastPeriodStart: string | null;
  nextPeriodStart: string | null;
  predictionRange: { start: string; end: string } | null;
  averageCycleLength: number | null;
  averagePeriodLength: number | null;
  variabilityDays: number | null;
  confidence: PredictionConfidence;
  irregular: boolean;
  missingData: boolean;
  cycleStarts: string[];
  fertility: FertilityEstimate;
  commonSymptoms: Array<{ symptom: string; loggedDays: number }>;
}

const DAY_MS = 86_400_000;
const MIN_CYCLE = 15;
const MAX_CYCLE = 90;
const MAX_PERIOD_DAYS = 14;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCalendarDate(value: string): Date {
  if (!ISO_DATE.test(value)) throw new Error("date must use YYYY-MM-DD format");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("date is not a valid calendar day");
  }
  return date;
}

export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((parseCalendarDate(end).getTime() - parseCalendarDate(start).getTime()) / DAY_MS);
}

export function validateReproductiveEntry(input: unknown): ReproductiveEntry {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("entry must be an object");
  const value = input as Record<string, unknown>;
  const allowed = new Set(["id", "entryType", "date", "flow", "symptoms", "mood", "painScore", "notes", "pregnancyStatus", "createdAt"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`Unknown field: ${key}`);
  if (typeof value.id !== "string" || value.id.length < 1 || value.id.length > 100) throw new Error("id is required");
  if (typeof value.entryType !== "string" || !["period", "symptom", "mood", "pcos", "pregnancy"].includes(value.entryType)) throw new Error("invalid entryType");
  parseCalendarDate(String(value.date));
  if (value.flow !== undefined && !["spotting", "light", "medium", "heavy"].includes(String(value.flow))) throw new Error("invalid flow");
  if (value.symptoms !== undefined && (!Array.isArray(value.symptoms) || value.symptoms.length > 30 || value.symptoms.some((x) => typeof x !== "string" || x.length > 80))) throw new Error("invalid symptoms");
  if (value.painScore !== undefined && (typeof value.painScore !== "number" || !Number.isInteger(value.painScore) || value.painScore < 0 || value.painScore > 10)) throw new Error("painScore must be between 0 and 10");
  if (value.notes !== undefined && (typeof value.notes !== "string" || value.notes.length > 2000)) throw new Error("notes is too long");
  if (value.pregnancyStatus !== undefined && !["trying", "positive", "negative", "not_applicable"].includes(String(value.pregnancyStatus))) throw new Error("invalid pregnancyStatus");
  return { ...value, entryType: value.entryType as ReproductiveEntryType, date: String(value.date) } as ReproductiveEntry;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function periodStarts(entries: ReproductiveEntry[]): string[] {
  const periodDays = new Set(entries.filter((entry) => entry.entryType === "period" || entry.flow).map((entry) => entry.date));
  const dates = uniqueSorted([...periodDays]);
  return dates.filter((date, index) => index === 0 || daysBetween(dates[index - 1], date) > 2);
}

function average(values: number[]): number | null {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

export function calculateReproductiveInsights(entries: ReproductiveEntry[], today = formatCalendarDate(new Date())): ReproductiveInsights {
  const valid = entries.map(validateReproductiveEntry).sort((a, b) => a.date.localeCompare(b.date));
  const starts = periodStarts(valid);
  const gaps = starts.slice(1).map((date, index) => daysBetween(starts[index], date)).filter((gap) => gap >= MIN_CYCLE && gap <= MAX_CYCLE);
  const cycleAverage = average(gaps);
  const variability = gaps.length > 1 ? average(gaps.map((gap) => Math.abs(gap - (cycleAverage || gap)))) : 0;
  const last = starts.at(-1) || null;
  const next = last && cycleAverage ? addCalendarDays(last, Math.round(cycleAverage)) : null;
  const uncertainty = variability === null ? 0 : Math.max(2, Math.ceil(variability));
  const predictionRange = next ? { start: addCalendarDays(next, -uncertainty), end: addCalendarDays(next, uncertainty) } : null;
  const irregular = gaps.some((gap) => gap < 21 || gap > 35) || (variability || 0) > 7;
  const confidence: PredictionConfidence = gaps.length < 2 ? "insufficient" : gaps.length < 3 ? "low" : irregular ? "moderate" : "good";
  const periodEntries = valid.filter((entry) => entry.entryType === "period" || entry.flow);
  const periodLengths = starts.map((start, index) => {
    const end = starts[index + 1];
    const days = periodEntries.filter((entry) => entry.date >= start && (!end || entry.date < end)).map((entry) => entry.date);
    return days.length ? Math.min(days.length, MAX_PERIOD_DAYS) : 1;
  });
  const symptomCounts = new Map<string, number>();
  valid.forEach((entry) => (entry.symptoms || []).forEach((symptom) => symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1)));
  const fertileStart = next ? addCalendarDays(next, -14) : null;
  const fertileEnd = next ? addCalendarDays(next, -5) : null;
  return {
    lastPeriodStart: last,
    nextPeriodStart: next,
    predictionRange,
    averageCycleLength: cycleAverage,
    averagePeriodLength: average(periodLengths),
    variabilityDays: variability,
    confidence,
    irregular,
    missingData: starts.length < 2 || !valid.some((entry) => entry.date === today),
    cycleStarts: starts,
    fertility: {
      fertileWindowStart: fertileStart,
      fertileWindowEnd: fertileEnd,
      estimatedOvulation: next ? addCalendarDays(next, -14) : null,
      uncertaintyDays: uncertainty || 7,
      explanation: next ? "Estimate based on recorded cycle starts; ovulation and fertility can vary, especially with irregular cycles. This is not contraception or a diagnosis." : "Log at least two period starts to estimate a fertile window.",
    },
    commonSymptoms: [...symptomCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([symptom, loggedDays]) => ({ symptom, loggedDays })),
  };
}

export function createClinicianDiscussionSummary(entries: ReproductiveEntry[]): string {
  const insights = calculateReproductiveInsights(entries);
  const symptomText = insights.commonSymptoms.length ? insights.commonSymptoms.map((item) => `${item.symptom} (${item.loggedDays} days)`).join(", ") : "none recorded";
  return [
    "Reproductive tracking discussion summary (not a diagnosis)",
    `Cycle starts recorded: ${insights.cycleStarts.length}`,
    `Average cycle length: ${insights.averageCycleLength ?? "insufficient data"} days; variability: ${insights.variabilityDays ?? "insufficient data"} days`,
    `Pattern flag: ${insights.irregular ? "variable/irregular pattern noted" : "no high-variability flag from available data"}`,
    `Common symptoms: ${symptomText}`,
    "Please review the original entries, dates, pain/bleeding severity, medications, and pregnancy context with a clinician.",
  ].join("\n");
}

export function exportReproductiveData(entries: ReproductiveEntry[]): string {
  const cleaned = entries.map(validateReproductiveEntry);
  return JSON.stringify({ exportedAt: new Date().toISOString(), product: "HerCare Plus", data: cleaned, insights: calculateReproductiveInsights(cleaned) }, null, 2);
}
