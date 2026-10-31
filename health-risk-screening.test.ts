import { describe, expect, it } from "vitest";
import {
  HEALTH_RISK_MODEL_VERSION,
  screenHealthRisk,
  validateScreeningInput,
} from "../src/lib/healthRiskScreening";

const validInput = {
  age: 28,
  symptomDurationDays: 2,
  painSeverity: 2,
  heavyBleeding: false,
  faintingOrSevereDizziness: false,
  pregnancyPossible: false,
};

describe("health risk screening", () => {
  it("rejects unknown fields and invalid ranges", () => {
    expect(() => validateScreeningInput({ ...validInput, role: "admin" })).toThrow(
      "Unknown field",
    );
    expect(() => validateScreeningInput({ ...validInput, painSeverity: 11 })).toThrow(
      "painSeverity",
    );
  });

  it("returns an abstaining lower indicator for low-signal input", () => {
    const result = screenHealthRisk(validateScreeningInput(validInput));
    expect(result.riskBand).toBe("lower indicator");
    expect(result.abstained).toBe(true);
    expect(result.confidence).toBe("uncertain");
    expect(result.modelVersion).toBe(HEALTH_RISK_MODEL_VERSION);
    expect(result.limitation).toContain("not a diagnosis");
  });

  it("elevates urgent red flags without presenting a diagnosis", () => {
    const result = screenHealthRisk(
      validateScreeningInput({
        ...validInput,
        painSeverity: 9,
        faintingOrSevereDizziness: true,
      }),
    );
    expect(result.riskBand).toBe("higher indicator");
    expect(result.nextSteps[0]).toContain("urgent medical care");
    expect(result.limitation).toContain("not clinically validated");
  });

  it("uses the versioned maternal artifact only for pregnancy vitals", () => {
    const result = screenHealthRisk(
      validateScreeningInput({
        ...validInput,
        pregnancyPossible: true,
        maternalVitals: {
          age: 25,
          systolicBP: 130,
          diastolicBP: 80,
          bloodSugar: 15,
          bodyTemperature: 98,
          heartRate: 86,
        },
      }),
    );
    expect(result.modelVersion).toBe("maternal-risk-v1");
    expect(result.probability).toBeTypeOf("number");
    expect(result.limitation).toContain("not clinically validated");
  });

  it("rejects nested mass-assignment and out-of-range values", () => {
    expect(() =>
      validateScreeningInput({
        ...validInput,
        maternalVitals: { age: 25, role: "admin" },
      }),
    ).toThrow("Unknown maternal vital");
    expect(() =>
      validateScreeningInput({
        ...validInput,
        maternalVitals: {
          age: 25,
          systolicBP: 999,
          diastolicBP: 80,
          bloodSugar: 7,
          bodyTemperature: 98,
          heartRate: 70,
        },
      }),
    ).toThrow("outside");
  });

  it("requires complete maternal context only for pregnancy-specific inference", () => {
    expect(() => validateScreeningInput({ ...validInput, pregnancyPossible: true })).toThrow(
      "maternalVitals are required",
    );
    expect(() =>
      validateScreeningInput({
        ...validInput,
        maternalVitals: { age: 25, systolicBP: 130, diastolicBP: 80, bloodSugar: 7, bodyTemperature: 98, heartRate: 70 },
      }),
    ).toThrow("may only be provided");
  });

  it("never lets a maternal model result downgrade an urgent red flag", () => {
    const result = screenHealthRisk(
      validateScreeningInput({
        ...validInput,
        painSeverity: 10,
        pregnancyPossible: true,
        maternalVitals: { age: 25, systolicBP: 120, diastolicBP: 80, bloodSugar: 7, bodyTemperature: 98, heartRate: 70 },
      }),
    );
    expect(result.riskBand).toBe("higher indicator");
    expect(result.escalationRequired).toBe(true);
    expect(result.nextSteps[0]).toContain("urgent medical care");
  });
});
