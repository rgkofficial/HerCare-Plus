import fs from "node:fs";
import path from "node:path";

type ModelArtifact = {
  version: string;
  features?: string[];
  classes: string[];
  coefficients: number[][];
  intercepts: number[];
  mean: number[];
  scale: number[];
  training_min: number[];
  training_max: number[];
  training_mean: number[];
  training_covariance: number[][];
};

export type MaternalVitals = {
  age: number;
  systolicBP: number;
  diastolicBP: number;
  bloodSugar: number;
  bodyTemperature: number;
  heartRate: number;
};

export type MaternalModelResult = {
  modelVersion: string;
  riskBand: "lower indicator" | "moderate indicator" | "higher indicator";
  predictedClass: string | null;
  probability: number | null;
  abstained: boolean;
  outOfDistribution: boolean;
  limitation: string;
};

const LIMITATION =
  "This is a screening risk indicator, not a diagnosis. It is not clinically validated and cannot replace a qualified clinician.";
const ARTIFACT_PATH = path.join(
  process.cwd(),
  "ml",
  "artifacts",
  "maternal-risk-v1.json",
);

let cachedArtifact: ModelArtifact | undefined;
let cachedInverse: number[][] | undefined;

function loadArtifact(): ModelArtifact {
  if (!cachedArtifact) {
    const parsed = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8")) as ModelArtifact;
    const dimensions = 6;
    if (
      parsed.version !== "maternal-risk-v1" ||
      (parsed.features && parsed.features.join(",") !== "Age,SystolicBP,DiastolicBP,BS,BodyTemp,HeartRate") ||
      parsed.classes?.length !== 3 ||
      parsed.coefficients?.some((row) => row.length !== dimensions) ||
      parsed.coefficients?.length !== 3 ||
      parsed.intercepts?.length !== 3 ||
      parsed.mean?.length !== dimensions ||
      parsed.scale?.length !== dimensions ||
      parsed.training_min?.length !== dimensions ||
      parsed.training_max?.length !== dimensions ||
      parsed.training_mean?.length !== dimensions ||
      parsed.training_covariance?.length !== dimensions ||
      parsed.training_covariance?.some((row) => row.length !== dimensions) ||
      [...parsed.coefficients.flat(), ...parsed.intercepts, ...parsed.mean, ...parsed.scale,
        ...parsed.training_min, ...parsed.training_max, ...parsed.training_mean,
        ...parsed.training_covariance.flat()].some((value) => !Number.isFinite(value)) ||
      parsed.scale.some((value) => value <= 0)
    ) {
      throw new Error("Maternal model artifact failed integrity validation.");
    }
    cachedArtifact = parsed;
  }
  return cachedArtifact;
}

function invert(matrix: number[][]): number[][] {
  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: size }, (_, columnIndex) =>
      rowIndex === columnIndex ? 1 : 0,
    ),
  ]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) {
      throw new Error("Model covariance matrix is singular.");
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map((value) => value / divisor);
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map(
        (value, index) => value - factor * augmented[column][index],
      );
    }
  }
  return augmented.map((row) => row.slice(size));
}

function mahalanobisDistance(values: number[], artifact: ModelArtifact): number {
  const delta = values.map((value, index) => value - artifact.training_mean[index]);
  cachedInverse ??= invert(artifact.training_covariance);
  const inverse = cachedInverse;
  return Math.sqrt(
    delta.reduce(
      (total, value, row) =>
        total +
        value *
          delta.reduce((inner, other, column) => inner + inverse[row][column] * other, 0),
      0,
    ),
  );
}

function softmax(scores: number[]): number[] {
  const maximum = Math.max(...scores);
  const exponentials = scores.map((score) => Math.exp(score - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

export function inferMaternalRisk(vitals: MaternalVitals): MaternalModelResult {
  const artifact = loadArtifact();
  const values = [
    vitals.age,
    vitals.systolicBP,
    vitals.diastolicBP,
    vitals.bloodSugar,
    vitals.bodyTemperature,
    vitals.heartRate,
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    return {
      modelVersion: artifact.version,
      riskBand: "moderate indicator",
      predictedClass: null,
      probability: null,
      abstained: true,
      outOfDistribution: true,
      limitation: `${LIMITATION} A finite value is required for every maternal vital.`,
    };
  }
  const outOfRange = values.some(
    (value, index) =>
      value < artifact.training_min[index] || value > artifact.training_max[index],
  );
  const distance = mahalanobisDistance(values, artifact);
  const outOfDistribution = outOfRange || distance > 4;
  if (outOfDistribution) {
    return {
      modelVersion: artifact.version,
      riskBand: "moderate indicator",
      predictedClass: null,
      probability: null,
      abstained: true,
      outOfDistribution: true,
      limitation: `${LIMITATION} These inputs are outside the range this tool was built for.`,
    };
  }
  const standardized = values.map(
    (value, index) => (value - artifact.mean[index]) / artifact.scale[index],
  );
  const probabilities = softmax(
    artifact.coefficients.map((coefficients, classIndex) =>
      coefficients.reduce(
        (total, coefficient, featureIndex) =>
          total + coefficient * standardized[featureIndex],
        artifact.intercepts[classIndex],
      ),
    ),
  );
  const bestIndex = probabilities.indexOf(Math.max(...probabilities));
  const probability = probabilities[bestIndex];
  const predictedClass = artifact.classes[bestIndex];
  return {
    modelVersion: artifact.version,
    riskBand:
      predictedClass === "high risk"
        ? "higher indicator"
        : predictedClass === "mid risk"
          ? "moderate indicator"
          : "lower indicator",
    predictedClass,
    probability,
    abstained: probability < 0.55,
    outOfDistribution: false,
    limitation: LIMITATION,
  };
}
