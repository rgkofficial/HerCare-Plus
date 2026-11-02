import { describe, expect, it } from "vitest";
import { buildSafeResponse, detectTriage } from "../src/lib/chat";
describe("chat studio triage safeguards", () => {
  it("detects emergency bleeding and breathing symptoms", () => {
    expect(detectTriage("I am soaking a pad every hour and feel faint").level).toBe("emergency");
    expect(detectTriage("I have difficulty breathing").level).toBe("emergency");
  });
  it("detects advisory symptoms without escalating every message", () => {
    expect(detectTriage("My period cramps are getting worse").level).toBe("advisory");
    expect(detectTriage("Can you explain the menstrual cycle?").level).toBe("none");
  });
  it("keeps emergency guidance prominent and non-diagnostic", () => {
    const response = buildSafeResponse("heavy bleeding", "emergency");
    expect(response).toContain("Call 112");
    expect(response).toContain("not a substitute");
  });
});
