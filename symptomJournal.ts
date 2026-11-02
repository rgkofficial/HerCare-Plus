export const FLOW_VALUES = ["none", "spotting", "light", "medium", "heavy"] as const;
export type Flow = (typeof FLOW_VALUES)[number];
export const CERVICAL_FLUID_VALUES = ["unknown", "dry", "sticky", "creamy", "eggwhite"] as const;
export type CervicalFluid = (typeof CERVICAL_FLUID_VALUES)[number];
export const MOODS = ["calm", "happy", "energetic", "neutral", "tired", "anxious", "sad", "irritable"] as const;
export type Mood = (typeof MOODS)[number];

export type JournalEntry = {
  id: string;
  date: string;
  flow: Flow;
  cervicalFluid: CervicalFluid;
  basalTemperature?: number;
  painSeverity: number;
  painAreas: string[];
  symptoms: string[];
  mood?: Mood;
  pcosTags: string[];
  hormonalSymptoms: string[];
  notes?: string;
};

export type CycleSettings = {
  averageCycleLength: number;
  averagePeriodLength: number;
  timezone: string;
};

export type Prediction = {
  nextPeriod: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  ovulationDate: string | null;
  confidence: "low" | "medium" | "higher";
  confidenceLabel: string;
  disclaimer: string;
};

export type JournalAnalytics = {
  totalEntries: number;
  daysTracked: number;
  missingDays: number;
  periodStarts: string[];
  averageCycleLength: number | null;
  cycleLengths: number[];
  variability: number | null;
  symptomFrequency: Array<{ name: string; count: number; percent: number; avgPain: number }>;
  painByDate: Array<{ date: string; pain: number }>;
  moodDistribution: Array<{ name: string; count: number }>;
  flowDistribution: Record<Flow, number>;
  phaseByDate: Array<{ date: string; phase: "menstrual" | "follicular" | "fertile window" | "luteal" | "unknown" }>;
  pcosSignals: string[];
  clinicianSummary: string;
};

export const SAFETY_DISCLAIMER = "Cycle and fertility estimates are educational pattern signals, not contraception, diagnosis, or medical advice. Ovulation can vary substantially, especially with irregular cycles, PCOS, postpartum changes, illness, or hormonal medication. Talk with a clinician about persistent pain, very heavy bleeding, or concerning changes.";

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function dateDiffDays(from: string, to: string): number {
  if (!isValidDateString(from) || !isValidDateString(to)) throw new Error("Dates must use YYYY-MM-DD.");
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  if (!isValidDateString(date)) throw new Error("Dates must use YYYY-MM-DD.");
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function validateJournalEntry(input: unknown): { valid: boolean; errors: string[]; entry?: JournalEntry } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { valid: false, errors: ["A journal entry is required."] };
  const value = input as Partial<JournalEntry>;
  if (typeof value.id !== "string" || value.id.length < 1 || value.id.length > 80) errors.push("A valid entry ID is required.");
  if (typeof value.date !== "string" || !isValidDateString(value.date)) errors.push("Date must be a real calendar date in YYYY-MM-DD format.");
  if (!FLOW_VALUES.includes(value.flow as Flow)) errors.push("Flow is invalid.");
  if (!CERVICAL_FLUID_VALUES.includes(value.cervicalFluid as CervicalFluid)) errors.push("Cervical fluid is invalid.");
  if (!Number.isInteger(value.painSeverity) || (value.painSeverity as number) < 0 || (value.painSeverity as number) > 10) errors.push("Pain severity must be an integer from 0 to 10.");
  if (value.basalTemperature !== undefined && (!Number.isFinite(value.basalTemperature) || value.basalTemperature < 30 || value.basalTemperature > 45)) errors.push("Basal temperature must be between 30°C and 45°C.");
  if (!Array.isArray(value.symptoms) || value.symptoms.length > 30 || value.symptoms.some((item) => typeof item !== "string" || item.length > 80)) errors.push("Symptoms are invalid.");
  if (!Array.isArray(value.painAreas) || value.painAreas.some((item) => typeof item !== "string" || item.length > 60)) errors.push("Pain areas are invalid.");
  if (!Array.isArray(value.pcosTags) || value.pcosTags.some((item) => typeof item !== "string" || item.length > 80)) errors.push("PCOS tags are invalid.");
  if (!Array.isArray(value.hormonalSymptoms) || value.hormonalSymptoms.some((item) => typeof item !== "string" || item.length > 80)) errors.push("Hormonal symptoms are invalid.");
  if (value.mood !== undefined && !MOODS.includes(value.mood as Mood)) errors.push("Mood is invalid.");
  if (value.notes !== undefined && (typeof value.notes !== "string" || value.notes.length > 1000)) errors.push("Notes must be 1,000 characters or fewer.");
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors, entry: { id: value.id!, date: value.date!, flow: value.flow!, cervicalFluid: value.cervicalFluid!, painSeverity: value.painSeverity!, painAreas: value.painAreas!, symptoms: value.symptoms!, pcosTags: value.pcosTags!, hormonalSymptoms: value.hormonalSymptoms!, basalTemperature: value.basalTemperature, mood: value.mood, notes: value.notes } };
}

export function periodStarts(entries: JournalEntry[]): string[] {
  const dates = [...new Set(entries.filter((entry) => entry.flow !== "none").map((entry) => entry.date))].sort();
  return dates.filter((date, index) => index === 0 || dateDiffDays(dates[index - 1], date) > 3);
}

function average(values: number[]): number | null { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function standardDeviation(values: number[], mean: number | null): number | null { return mean === null || values.length < 2 ? null : Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length); }

export function predictCycle(entries: JournalEntry[], settings: CycleSettings): Prediction {
  const starts = periodStarts(entries);
  const lengths = starts.slice(1).map((date, index) => dateDiffDays(starts[index], date)).filter((length) => length >= 15 && length <= 60);
  const mean = average(lengths) ?? settings.averageCycleLength;
  const variability = standardDeviation(lengths, average(lengths));
  const last = starts.at(-1) ?? null;
  const next = last ? addDays(last, Math.round(mean)) : null;
  const uncertainty = Math.max(2, Math.round(variability ?? (starts.length < 3 ? 5 : 3)));
  const fertileCenter = next ? addDays(next, -14) : null;
  return {
    nextPeriod: next,
    rangeStart: next ? addDays(next, -uncertainty) : null,
    rangeEnd: next ? addDays(next, uncertainty) : null,
    fertileStart: fertileCenter ? addDays(fertileCenter, -5) : null,
    fertileEnd: fertileCenter ? addDays(fertileCenter, 1) : null,
    ovulationDate: fertileCenter,
    confidence: starts.length >= 6 && uncertainty <= 3 ? "higher" : starts.length >= 3 ? "medium" : "low",
    confidenceLabel: starts.length >= 6 && uncertainty <= 3 ? "Higher confidence" : starts.length >= 3 ? "Building confidence" : "Early estimate",
    disclaimer: SAFETY_DISCLAIMER,
  };
}

export function analyzeJournal(entries: JournalEntry[], settings: CycleSettings): JournalAnalytics {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const starts = periodStarts(sorted);
  const cycleLengths = starts.slice(1).map((date, index) => dateDiffDays(starts[index], date)).filter((length) => length >= 15 && length <= 60);
  const avgCycle = average(cycleLengths);
  const variability = standardDeviation(cycleLengths, avgCycle);
  const symptomMap: Record<string, { count: number; pain: number }> = {};
  const moods: Record<string, number> = {};
  const flows: Record<Flow, number> = { none: 0, spotting: 0, light: 0, medium: 0, heavy: 0 };
  const pcos = new Set<string>();
  sorted.forEach((entry) => {
    flows[entry.flow]++;
    if (entry.mood) moods[entry.mood] = (moods[entry.mood] || 0) + 1;
    entry.pcosTags.forEach((tag) => pcos.add(tag));
    entry.symptoms.forEach((symptom) => {
      symptomMap[symptom] ||= { count: 0, pain: 0 };
      symptomMap[symptom].count++;
      symptomMap[symptom].pain += entry.painSeverity;
    });
  });
  const symptomFrequency = Object.entries(symptomMap).map(([name, value]) => ({ name, count: value.count, percent: Math.round((value.count / Math.max(1, sorted.length)) * 100), avgPain: Math.round((value.pain / value.count) * 10) / 10 })).sort((a, b) => b.count - a.count);
  const missingDays = sorted.length < 2 ? 0 : Math.max(0, dateDiffDays(sorted[0].date, sorted.at(-1)!.date) + 1 - new Set(sorted.map((entry) => entry.date)).size);
  const prediction = predictCycle(sorted, settings);
  const phaseByDate = sorted.map((entry) => {
    const latestStart = [...starts].reverse().find((start) => start <= entry.date);
    if (!latestStart) return { date: entry.date, phase: "unknown" as const };
    const day = dateDiffDays(latestStart, entry.date);
    return { date: entry.date, phase: day <= settings.averagePeriodLength ? "menstrual" as const : day >= Math.round(settings.averageCycleLength * 0.5) - 5 && day <= Math.round(settings.averageCycleLength * 0.5) + 2 ? "fertile window" as const : day < settings.averageCycleLength ? "luteal" as const : "unknown" as const };
  });
  const regularity = variability === null ? "not enough logged cycles" : variability <= 2 ? "fairly consistent" : variability <= 5 ? "variable" : "irregular";
  const topSymptoms = symptomFrequency.slice(0, 3).map((item) => `${item.name} (${item.percent}% of logged days)`);
  const clinicianSummary = `Tracking period: ${sorted[0]?.date ?? "not enough data"} to ${sorted.at(-1)?.date ?? "not enough data"}. ${sorted.length} journal entries across ${starts.length} detected period starts. Cycle pattern: ${regularity}${avgCycle ? `, average ${Math.round(avgCycle)} days` : ""}. Common symptoms: ${topSymptoms.length ? topSymptoms.join(", ") : "none recorded"}. PCOS/hormonal tags: ${[...pcos].join(", ") || "none recorded"}. This is a tracking summary, not a diagnosis.`;
  return { totalEntries: sorted.length, daysTracked: new Set(sorted.map((entry) => entry.date)).size, missingDays, periodStarts: starts, averageCycleLength: avgCycle ? Math.round(avgCycle * 10) / 10 : null, cycleLengths, variability: variability ? Math.round(variability * 10) / 10 : null, symptomFrequency, painByDate: sorted.map((entry) => ({ date: entry.date, pain: entry.painSeverity })), moodDistribution: Object.entries(moods).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), flowDistribution: flows, phaseByDate, pcosSignals: [...pcos], clinicianSummary };
}

export function entryToCsv(entries: JournalEntry[]): string {
  const headers = ["date", "flow", "cervicalFluid", "basalTemperatureC", "painSeverity", "painAreas", "symptoms", "mood", "pcosTags", "hormonalSymptoms", "notes"];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = entries.map((entry) => [entry.date, entry.flow, entry.cervicalFluid, entry.basalTemperature, entry.painSeverity, entry.painAreas.join("; "), entry.symptoms.join("; "), entry.mood, entry.pcosTags.join("; "), entry.hormonalSymptoms.join("; "), entry.notes].map(escape).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export function toLegacyCycleEntry(entry: JournalEntry) {
  return { id: entry.id, date: entry.date, flow: entry.flow === "none" ? "spotting" : entry.flow, symptoms: entry.symptoms, mood: entry.mood, notes: entry.notes };
}
