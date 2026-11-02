import { describe, expect, it } from "vitest";
import { addDays, analyzeJournal, dateDiffDays, entryToCsv, predictCycle, validateJournalEntry, type JournalEntry } from "../src/lib/symptomJournal";

const entry = (date: string, flow: JournalEntry["flow"] = "none", extras: Partial<JournalEntry> = {}): JournalEntry => ({ id: `journal-${date}`, date, flow, cervicalFluid: "unknown", painSeverity: 0, painAreas: [], symptoms: [], pcosTags: [], hormonalSymptoms: [], ...extras });

describe("symptom journal domain", () => {
  it("handles leap-day arithmetic without local timezone drift", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(dateDiffDays("2024-02-29", "2024-03-01")).toBe(1);
  });

  it("rejects impossible dates and out-of-range pain", () => {
    expect(validateJournalEntry(entry("2026-02-30")).valid).toBe(false);
    expect(validateJournalEntry(entry("2026-10-31", "none", { painSeverity: 11 })).valid).toBe(false);
  });

  it("detects irregular period starts while ignoring missing days", () => {
    const entries = [entry("2026-01-01", "medium"), entry("2026-01-02", "light"), entry("2026-01-30", "heavy"), entry("2026-03-08", "light")];
    const analytics = analyzeJournal(entries, { averageCycleLength: 28, averagePeriodLength: 5, timezone: "Pacific/Auckland" });
    expect(analytics.periodStarts).toEqual(["2026-01-01", "2026-01-30", "2026-03-08"]);
    expect(analytics.cycleLengths).toEqual([29, 37]);
    expect(analytics.missingDays).toBeGreaterThan(0);
  });

  it("returns a wide, low-confidence estimate for a new or irregular journal", () => {
    const prediction = predictCycle([entry("2026-10-01", "light")], { averageCycleLength: 30, averagePeriodLength: 5, timezone: "Asia/Kolkata" });
    expect(prediction.confidence).toBe("low");
    expect(prediction.rangeStart).toBe("2026-10-26");
    expect(prediction.rangeEnd).toBe("2026-11-05");
    expect(prediction.disclaimer).toContain("medical advice");
  });

  it("keeps international timezone boundaries date-only", () => {
    const entries = [entry("2026-10-31", "medium"), entry("2026-11-01", "light"), entry("2026-11-29", "medium")];
    const analytics = analyzeJournal(entries, { averageCycleLength: 28, averagePeriodLength: 5, timezone: "Pacific/Honolulu" });
    expect(analytics.periodStarts).toEqual(["2026-10-31", "2026-11-29"]);
    expect(analytics.averageCycleLength).toBe(29);
  });

  it("correlates symptoms and preserves CSV quoting", () => {
    const entries = [entry("2026-01-01", "medium", { symptoms: ["Cramps"], painSeverity: 6, notes: "Warm, \"quiet\" day" }), entry("2026-01-02", "light", { symptoms: ["Cramps", "Fatigue"], painSeverity: 4 })];
    const analytics = analyzeJournal(entries, { averageCycleLength: 28, averagePeriodLength: 5, timezone: "UTC" });
    expect(analytics.symptomFrequency[0]).toMatchObject({ name: "Cramps", count: 2, percent: 100, avgPain: 5 });
    expect(entryToCsv(entries)).toContain('"Warm, ""quiet"" day"');
  });
});
