import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateWellnessInput,
} from "../src/lib/wellness/wellnessValidation";

describe("Wellness Input Validation", () => {
  it("accepts valid hydration data", () => {
    const result = validateWellnessInput({
      category: "hydration",
      date: "2026-10-25",
      value: 250,
      unit: "ml",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects negative hydration values", () => {
    const result = validateWellnessInput({
      category: "hydration",
      date: "2026-10-25",
      value: -100,
      unit: "ml",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid categories", () => {
    const result = validateWellnessInput({
      category: "unknown",
      date: "2026-10-25",
      value: 100,
      unit: "ml",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects invalid dates", () => {
    const result = validateWellnessInput({
      category: "activity",
      date: "2026-02-30",
      value: 30,
      unit: "minutes",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects excessive notes", () => {
    const result = validateWellnessInput({
      category: "sleep",
      date: "2026-10-25",
      value: 8,
      unit: "hours",
      notes: "A".repeat(1001),
    });

    expect(result.valid).toBe(false);
  });

  it("rejects incorrect units", () => {
    const result = validateWellnessInput({
      category: "hydration",
      date: "2026-10-25",
      value: 250,
      unit: "liters",
    });

    expect(result.valid).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    const result = validateWellnessInput({
      category: "activity",
      date: "2026-10-25",
      value: Number.POSITIVE_INFINITY,
      unit: "minutes",
    });

    expect(result.valid).toBe(false);
  });
});