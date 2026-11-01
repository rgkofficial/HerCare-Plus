import { describe, expect, it } from "vitest";
import { validateWellnessAction } from "../src/lib/wellness/wellnessActionValidation";

describe("wellness action validation", () => {
  it("accepts a valid journal check-in", () => {
    const result = validateWellnessAction({ action: "journal", date: "2026-11-01", mood: 4, stress: 2, notes: "Walked outside" });
    expect(result.valid).toBe(true);
  });
  it("rejects a journal outside the five-point scale", () => {
    const result = validateWellnessAction({ action: "journal", date: "2026-11-01", mood: 6, stress: 2 });
    expect(result.valid).toBe(false);
  });
  it("rejects an invalid reminder time", () => {
    const result = validateWellnessAction({ action: "preferences", notificationsEnabled: true, cycleIntegrationConsent: false, reminderTime: "25:90" });
    expect(result.valid).toBe(false);
  });
  it("requires habit ownership to be checked by the route input", () => {
    const result = validateWellnessAction({ action: "completion", habitId: "", date: "2026-11-01", completed: true });
    expect(result.valid).toBe(false);
  });
  it("does not accept an unknown action", () => {
    const result = validateWellnessAction({ action: "delete-all", ownerId: "other-user" });
    expect(result.valid).toBe(false);
  });
});
