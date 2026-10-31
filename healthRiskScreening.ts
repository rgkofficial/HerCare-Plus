export const HEALTH_RISK_MODEL_VERSION = "ruleset-2026-10-26";

export type RiskBand = "lower indicator" | "moderate indicator" | "higher indicator";

export interface ScreeningInput {
  age: number;
  symptomDurationDays: number;
  painSeverity: number;
  heavyBleeding: boolean;
  faintingOrSevereDizziness: boolean;
  pregnancyPossible: boolean;
  maternalVitals?: MaternalVitals;
}

export interface ScreeningResult {
  modelVersion: string;
  riskBand: RiskBand;
  confidence: "uncertain" | "screening estimate";
  abstained: boolean;
  outOfDistribution?: boolean;
  escalationRequired: boolean;
  abstentionReason: "rules_only" | "low_margin" | "out_of_distribution" | "none";
  probability?: number | null;
  factors: string[];
  nextSteps: string[];
  limitation: string;
}

const LIMITATION =
  "This is a screening risk indicator, not a diagnosis. It is not clinically validated and cannot replace a qualified clinician.";

export function validateScreeningInput(value: unknown): ScreeningInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be an object.");
  }

  const input = value as Record<string, unknown>;
  const requiredBooleans = [
    "heavyBleeding",
    "faintingOrSevereDizziness",
    "pregnancyPossible",
  ];
  for (const field of requiredBooleans) {
    if (typeof input[field] !== "boolean") {
      throw new Error(`${field} must be a boolean.`);
    }
  }

  const age = input.age;
  const symptomDurationDays = input.symptomDurationDays;
  const painSeverity = input.painSeverity;
  if (
    typeof age !== "number" ||
    !Number.isInteger(age) ||
    age < 13 ||
    age > 120
  ) {
    throw new Error("age must be an integer between 13 and 120.");
  }
  if (
    typeof symptomDurationDays !== "number" ||
    !Number.isInteger(symptomDurationDays) ||
    symptomDurationDays < 0 ||
    symptomDurationDays > 365
  ) {
    throw new Error("symptomDurationDays must be an integer between 0 and 365.");
  }
  if (
    typeof painSeverity !== "number" ||
    !Number.isInteger(painSeverity) ||
    painSeverity < 0 ||
    painSeverity > 10
  ) {
    throw new Error("painSeverity must be an integer between 0 and 10.");
  }

  const unknownFields = Object.keys(input).filter(
    (field) =>
      ![
        "age",
        "symptomDurationDays",
        "painSeverity",
        ...requiredBooleans,
        "maternalVitals",
      ].includes(field),
  );
  if (unknownFields.length > 0) {
    throw new Error(`Unknown field: ${unknownFields[0]}.`);
  }

  const maternalVitals = input.maternalVitals;
  if (maternalVitals !== undefined) {
    if (!maternalVitals || typeof maternalVitals !== "object" || Array.isArray(maternalVitals)) {
      throw new Error("maternalVitals must be an object.");
    }
    const vitals = maternalVitals as Record<string, unknown>;
    const fields = [
      "age",
      "systolicBP",
      "diastolicBP",
      "bloodSugar",
      "bodyTemperature",
      "heartRate",
    ];
    const unknownVital = Object.keys(vitals).find((field) => !fields.includes(field));
    if (unknownVital) throw new Error(`Unknown maternal vital: ${unknownVital}.`);
    for (const field of fields) {
      if (typeof vitals[field] !== "number" || !Number.isFinite(vitals[field])) {
        throw new Error(`${field} must be a finite number.`);
      }
    }
    const vitalValues = fields.map((field) => vitals[field] as number);
    if (!Number.isInteger(vitalValues[0]) || vitalValues[0] < 10 || vitalValues[0] > 70) {
      throw new Error("maternal age must be an integer between 10 and 70.");
    }
    if (
      vitalValues[0] < 10 || vitalValues[0] > 70 ||
      vitalValues[1] < 70 || vitalValues[1] > 160 ||
      vitalValues[2] < 49 || vitalValues[2] > 100 ||
      vitalValues[3] < 6 || vitalValues[3] > 19 ||
      vitalValues[4] < 98 || vitalValues[4] > 103 ||
      vitalValues[5] < 7 || vitalValues[5] > 90
    ) {
      throw new Error("maternalVitals are outside the dataset-supported ranges.");
    }
    if (vitalValues[1] <= vitalValues[2]) {
      throw new Error("systolicBP must exceed diastolicBP.");
    }
  }

  if (input.pregnancyPossible && !maternalVitals) {
    throw new Error("maternalVitals are required when pregnancyPossible is true.");
  }
  if (!input.pregnancyPossible && maternalVitals) {
    throw new Error("maternalVitals may only be provided when pregnancyPossible is true.");
  }

  return {
    age,
    symptomDurationDays,
    painSeverity,
    heavyBleeding: input.heavyBleeding as boolean,
    faintingOrSevereDizziness: input.faintingOrSevereDizziness as boolean,
    pregnancyPossible: input.pregnancyPossible as boolean,
    maternalVitals: maternalVitals as MaternalVitals | undefined,
  };
}

export function screenHealthRisk(input: ScreeningInput): ScreeningResult {
  const factors: string[] = [];
  const urgent = input.faintingOrSevereDizziness || input.painSeverity >= 9;
  if (input.faintingOrSevereDizziness) {
    factors.push("fainting or severe dizziness was reported");
  }
  if (input.heavyBleeding) factors.push("heavy bleeding was reported");
  if (input.pregnancyPossible) factors.push("pregnancy may be possible");
  if (input.painSeverity >= 7) factors.push("high pain severity was reported");
  if (input.symptomDurationDays >= 7) factors.push("symptoms have persisted for a week or more");

  const riskBand: RiskBand = urgent
    ? "higher indicator"
    : factors.length >= 2 || input.painSeverity >= 5
      ? "moderate indicator"
      : "lower indicator";

  const modelResult =
    input.pregnancyPossible && input.maternalVitals
      ? inferMaternalRisk(input.maternalVitals)
      : undefined;
  return {
    modelVersion: HEALTH_RISK_MODEL_VERSION,
    riskBand,
    confidence: "uncertain",
    abstained: true,
    escalationRequired: urgent,
    abstentionReason: modelResult ? (modelResult.outOfDistribution ? "out_of_distribution" : "low_margin") : "rules_only",
    factors,
    nextSteps: [
      urgent
        ? "Seek urgent medical care now, especially if symptoms are worsening."
        : "Arrange a conversation with a qualified clinician if symptoms persist or concern you.",
      "Call local emergency services for severe or rapidly worsening symptoms.",
    ],
    limitation: LIMITATION,
    ...(modelResult && {
      modelVersion: modelResult.modelVersion,
      riskBand: urgent || modelResult.outOfDistribution ? "higher indicator" : modelResult.riskBand,
      confidence: modelResult.abstained ? "uncertain" : "screening estimate",
      abstained: modelResult.abstained,
      outOfDistribution: modelResult.outOfDistribution,
      probability: modelResult.probability,
      escalationRequired: urgent || modelResult.riskBand === "higher indicator",
    }),
  };
}
import { inferMaternalRisk, type MaternalVitals } from "./maternalRiskModel";
