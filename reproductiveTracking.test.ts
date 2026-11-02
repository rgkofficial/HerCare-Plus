import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calculateReproductiveInsights,
  createClinicianDiscussionSummary,
  daysBetween,
  exportReproductiveData,
  parseCalendarDate,
  validateReproductiveEntry,
  type ReproductiveEntry,
} from "../src/lib/reproductiveTracking";

const entry = (id: string, date: string, extra: Partial<ReproductiveEntry> = {}): ReproductiveEntry => ({
  id,
  date,
  entryType: "period",
  flow: "medium",
  ...extra,
});

describe("reproductive tracking engine", () => {
  it("uses calendar days without timezone drift", () => {
    expect(addCalendarDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(daysBetween("2024-03-01", "2024-03-31")).toBe(30);
    expect(() => parseCalendarDate("2024-02-30")).toThrow("valid calendar");
  });

  it("rejects invalid dates, mass assignment, and unsafe values", () => {
    expect(() => validateReproductiveEntry({ ...entry("1", "2024-01-01"), role: "admin" })).toThrow("Unknown field");
    expect(() => validateReproductiveEntry({ ...entry("1", "2024-01-01"), painScore: 11 })).toThrow("painScore");
    expect(() => validateReproductiveEntry({ ...entry("1", "2024-02-30") })).toThrow("valid calendar");
    expect(() => validateReproductiveEntry({ ...entry("1", "2024-01-01"), notes: "x".repeat(2001) })).toThrow("too long");
  });

  it("returns transparent uncertainty and a fertile-window estimate", () => {
    const result = calculateReproductiveInsights([
      entry("1", "2024-01-01"), entry("2", "2024-01-02"), entry("3", "2024-01-29"),
      entry("4", "2024-01-30"), entry("5", "2024-02-26"), entry("6", "2024-02-27"),
    ], "2024-02-27");
    expect(result.averageCycleLength).toBe(28);
    expect(result.nextPeriodStart).toBe("2024-03-25");
    expect(result.fertility.fertileWindowStart).toBe("2024-03-11");
    expect(result.fertility.explanation).toContain("not contraception");
    expect(result.confidence).toBe("low");
  });

  it("flags unusual cycle patterns and missing daily data instead of hiding them", () => {
    const result = calculateReproductiveInsights([
      entry("1", "2024-01-01"), entry("2", "2024-01-02"),
      entry("3", "2024-01-15"), entry("4", "2024-01-16"),
      entry("5", "2024-03-01"),
    ], "2024-03-10");
    expect(result.irregular).toBe(true);
    expect(result.missingData).toBe(true);
    expect(result.predictionRange).not.toBeNull();
  });

  it("creates a clinician discussion summary and a portable export", () => {
    const entries = [entry("1", "2024-01-01", { symptoms: ["Cramps"], painScore: 6 })];
    expect(createClinicianDiscussionSummary(entries)).toContain("not a diagnosis");
    const exportText = exportReproductiveData(entries);
    expect(exportText).toContain('"product": "HerCare Plus"');
    expect(exportText).toContain("Cramps");
  });
});
