type ScreeningTelemetry = {
  modelVersion: string;
  latencyMs: number;
  outOfDistribution: boolean;
  confidence: string;
};

const counters = {
  inferences: 0,
  outOfDistribution: 0,
  abstentions: 0,
};

export function recordScreeningTelemetry(telemetry: ScreeningTelemetry): void {
  counters.inferences += 1;
  if (telemetry.outOfDistribution) counters.outOfDistribution += 1;
  if (telemetry.confidence === "uncertain") counters.abstentions += 1;
  console.info(
    JSON.stringify({
      event: "health_risk_inference",
      ...telemetry,
      counters: { ...counters },
    }),
  );
}

export function getScreeningCounters(): typeof counters {
  return { ...counters };
}
