import rawModelData from "@/data/adherence-model.json";

type JsonObject = Record<string, unknown>;
type NumberRules = { min?: number; max?: number; integer?: boolean; exclusiveMin?: number };

export const MODEL_FEATURE_NAMES = [
  "week",
  "adherence_last_2wk",
  "missed_doses_2wk",
  "nausea_score",
  "hydration_risk",
  "energy_risk",
  "appetite_suppression",
  "weight_loss_pct",
  "hba1c_delta",
  "systolic_bp",
  "routine_disruption",
  "side_effect_spike",
  "prior_failure",
  "mood_anxious"
] as const;

type ModelFeatureName = (typeof MODEL_FEATURE_NAMES)[number];
type FeatureDirection = "increases risk" | "decreases risk";

export type ModelFeature = {
  name: ModelFeatureName;
  label: string;
  mean: number;
  std: number;
  weight: number;
  support: {
    kind: "continuous" | "binary";
    low: number;
    high: number;
  };
};

export type ModelEnsembleMember = {
  id: string;
  intercept: number;
  weights: number[];
};

export type ModelArtifact = {
  version: string;
  modelType: string;
  target: string;
  trainedAt: string;
  cohort: {
    patients: number;
    weeksPerPatient: number;
    rows: number;
    generationSeed: number;
    description: string;
  };
  features: ModelFeature[];
  intercept: number;
  constraints: {
    method: string;
    featureDirections: Record<ModelFeatureName, FeatureDirection>;
  };
  ensemble: {
    method: string;
    members: ModelEnsembleMember[];
    spread: string;
  };
  metrics: {
    samples: number;
    patients: number;
    trainPatients: number;
    validationPatients: number;
    testPatients: number;
    positiveRate: number;
    testAuc: number;
    testAuprc: number;
    testBrier: number;
    baselineBrier: number;
    brierSkill: number;
    threshold: number;
    precisionAtThreshold: number;
    recallAtThreshold: number;
    reviewRateAtThreshold: number;
    confusionMatrix: { tp: number; fp: number; fn: number; tn: number };
    thresholdSelection: {
      method: string;
      targetRecall: number;
      validationPrecision: number;
      validationRecall: number;
      validationReviewRate: number;
    };
    claimStatus: "synthetic-skill-demonstrated" | "no-demonstrated-skill";
    calibration: Array<{ bin: string; count: number; predicted: number; observed: number }>;
  };
  modelCard: {
    intendedUse: string;
    notFor: string;
    edgeInference: string;
    explainability: string;
    limitations: string[];
  };
  trainingRuntime: {
    python: string;
    numpy: string;
    seed: number;
    maxIterations: number;
  };
};

export type ModelData = {
  artifact: ModelArtifact;
  sampleRows: Array<Record<string, number>>;
};

export class ModelArtifactValidationError extends Error {
  constructor(path: string, message: string) {
    super(`Adherence model artifact is invalid at ${path}: ${message}`);
    this.name = "ModelArtifactValidationError";
  }
}

function fail(path: string, message: string): never {
  throw new ModelArtifactValidationError(path, message);
}

function expectObject(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "expected an object");
  return value as JsonObject;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) fail(path, "expected a non-empty string");
  return value;
}

function expectNumber(value: unknown, path: string, rules: NumberRules = {}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "expected a finite number");
  if (rules.integer && !Number.isInteger(value)) fail(path, "expected an integer");
  if (rules.exclusiveMin !== undefined && value <= rules.exclusiveMin) {
    fail(path, `expected a value greater than ${rules.exclusiveMin}`);
  }
  if (rules.min !== undefined && value < rules.min) fail(path, `expected a value of at least ${rules.min}`);
  if (rules.max !== undefined && value > rules.max) fail(path, `expected a value no greater than ${rules.max}`);
  return value;
}

function expectDate(value: unknown, path: string): string {
  const date = expectString(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(path, "expected an ISO date in YYYY-MM-DD format");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    fail(path, "expected a valid calendar date");
  }
  return date;
}

function expectProbability(value: unknown, path: string): number {
  return expectNumber(value, path, { min: 0, max: 1 });
}

function parseFeatures(value: unknown): ModelFeature[] {
  if (!Array.isArray(value)) fail("artifact.features", "expected an array");
  if (value.length !== MODEL_FEATURE_NAMES.length) {
    fail("artifact.features", `expected exactly ${MODEL_FEATURE_NAMES.length} features`);
  }

  return value.map((featureValue, index) => {
    const path = `artifact.features[${index}]`;
    const feature = expectObject(featureValue, path);
    const expectedName = MODEL_FEATURE_NAMES[index];
    const name = expectString(feature.name, `${path}.name`);

    if (name !== expectedName) fail(`${path}.name`, `expected "${expectedName}" in exported feature order`);
    const support = expectObject(feature.support, `${path}.support`);
    const supportKind = support.kind;
    if (supportKind !== "continuous" && supportKind !== "binary") {
      fail(`${path}.support.kind`, 'expected "continuous" or "binary"');
    }
    const supportLow = expectNumber(support.low, `${path}.support.low`);
    const supportHigh = expectNumber(support.high, `${path}.support.high`);
    if (supportLow > supportHigh) fail(`${path}.support.high`, "must be at least support.low");
    if (supportKind === "binary" && (supportLow !== 0 || supportHigh !== 1)) {
      fail(`${path}.support`, "binary support must span exactly 0 to 1");
    }

    return {
      name: expectedName,
      label: expectString(feature.label, `${path}.label`),
      mean: expectNumber(feature.mean, `${path}.mean`),
      std: expectNumber(feature.std, `${path}.std`, { exclusiveMin: 0 }),
      weight: expectNumber(feature.weight, `${path}.weight`),
      support: { kind: supportKind, low: supportLow, high: supportHigh }
    };
  });
}

function parseEnsemble(
  value: unknown,
  features: ModelFeature[],
  directions: Record<ModelFeatureName, FeatureDirection>
) {
  const path = "artifact.ensemble";
  const source = expectObject(value, path);
  if (!Array.isArray(source.members) || source.members.length !== 16) {
    fail(`${path}.members`, "expected exactly 16 bootstrap members");
  }
  const ids = new Set<string>();
  const members = source.members.map((memberValue, memberIndex) => {
    const memberPath = `${path}.members[${memberIndex}]`;
    const member = expectObject(memberValue, memberPath);
    const id = expectString(member.id, `${memberPath}.id`);
    if (ids.has(id)) fail(`${memberPath}.id`, "expected a unique member id");
    ids.add(id);
    if (!Array.isArray(member.weights) || member.weights.length !== features.length) {
      fail(`${memberPath}.weights`, `expected exactly ${features.length} weights`);
    }
    const weights = member.weights.map((weight, featureIndex) => {
      const parsed = expectNumber(weight, `${memberPath}.weights[${featureIndex}]`);
      const feature = features[featureIndex];
      const direction = directions[feature.name];
      if (direction === "increases risk" && parsed < 0) {
        fail(`${memberPath}.weights[${featureIndex}]`, "conflicts with an increasing-risk constraint");
      }
      if (direction === "decreases risk" && parsed > 0) {
        fail(`${memberPath}.weights[${featureIndex}]`, "conflicts with a decreasing-risk constraint");
      }
      return parsed;
    });
    return { id, intercept: expectNumber(member.intercept, `${memberPath}.intercept`), weights };
  });

  return {
    method: expectString(source.method, `${path}.method`),
    members,
    spread: expectString(source.spread, `${path}.spread`)
  };
}

function parseFeatureDirections(value: unknown, features: ModelFeature[]): Record<ModelFeatureName, FeatureDirection> {
  const record = expectObject(value, "artifact.constraints.featureDirections");
  const parsed = {} as Record<ModelFeatureName, FeatureDirection>;

  features.forEach((feature) => {
    const path = `artifact.constraints.featureDirections.${feature.name}`;
    const direction = record[feature.name];
    if (direction !== "increases risk" && direction !== "decreases risk") {
      fail(path, 'expected "increases risk" or "decreases risk"');
    }
    if (direction === "increases risk" && feature.weight < 0) fail(path, "conflicts with a negative feature weight");
    if (direction === "decreases risk" && feature.weight > 0) fail(path, "conflicts with a positive feature weight");
    parsed[feature.name] = direction;
  });

  const unexpected = Object.keys(record).find((name) => !MODEL_FEATURE_NAMES.includes(name as ModelFeatureName));
  if (unexpected) fail(`artifact.constraints.featureDirections.${unexpected}`, "unexpected feature direction");

  return parsed;
}

function parseConfusionMatrix(value: unknown) {
  const path = "artifact.metrics.confusionMatrix";
  const matrix = expectObject(value, path);
  const rules = { min: 0, integer: true } as const;
  return {
    tp: expectNumber(matrix.tp, `${path}.tp`, rules),
    fp: expectNumber(matrix.fp, `${path}.fp`, rules),
    fn: expectNumber(matrix.fn, `${path}.fn`, rules),
    tn: expectNumber(matrix.tn, `${path}.tn`, rules)
  };
}

function parseCalibration(value: unknown) {
  const path = "artifact.metrics.calibration";
  if (!Array.isArray(value) || value.length === 0) fail(path, "expected at least one calibration bin");

  return value.map((binValue, index) => {
    const binPath = `${path}[${index}]`;
    const bin = expectObject(binValue, binPath);
    return {
      bin: expectString(bin.bin, `${binPath}.bin`),
      count: expectNumber(bin.count, `${binPath}.count`, { min: 1, integer: true }),
      predicted: expectProbability(bin.predicted, `${binPath}.predicted`),
      observed: expectProbability(bin.observed, `${binPath}.observed`)
    };
  });
}

function parseStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0) fail(path, "expected at least one string");
  return value.map((item, index) => expectString(item, `${path}[${index}]`));
}

function parseSampleRows(value: unknown): Array<Record<string, number>> {
  if (!Array.isArray(value) || value.length === 0) fail("sampleRows", "expected at least one sample row");
  const requiredNames = [
    "patient_id",
    ...MODEL_FEATURE_NAMES,
    "outcome_week",
    "target",
    "expected_consensus_risk",
    "expected_p10",
    "expected_p90",
    "expected_supported"
  ];

  return value.map((rowValue, index) => {
    const path = `sampleRows[${index}]`;
    const source = expectObject(rowValue, path);
    const row: Record<string, number> = {};

    requiredNames.forEach((name) => {
      row[name] = expectNumber(source[name], `${path}.${name}`);
    });

    if (!Number.isInteger(row.patient_id) || row.patient_id < 0) fail(`${path}.patient_id`, "expected a non-negative integer");
    if (row.outcome_week !== row.week + 1) fail(`${path}.outcome_week`, "must equal index week plus one");
    if (row.target !== 0 && row.target !== 1) fail(`${path}.target`, "expected a binary value");
    ["expected_consensus_risk", "expected_p10", "expected_p90"].forEach((name) => {
      if (row[name] < 0 || row[name] > 1) fail(`${path}.${name}`, "expected a probability from 0 to 1");
    });
    if (row.expected_p10 > row.expected_p90) fail(`${path}.expected_p90`, "must be at least expected_p10");
    if (row.expected_supported !== 0 && row.expected_supported !== 1) {
      fail(`${path}.expected_supported`, "expected a binary value");
    }

    return row;
  });
}

export function parseModelData(value: unknown): ModelData {
  const root = expectObject(value, "modelData");
  const source = expectObject(root.artifact, "artifact");
  const cohortSource = expectObject(source.cohort, "artifact.cohort");
  const features = parseFeatures(source.features);
  const constraintsSource = expectObject(source.constraints, "artifact.constraints");
  const metricsSource = expectObject(source.metrics, "artifact.metrics");
  const matrix = parseConfusionMatrix(metricsSource.confusionMatrix);
  const calibration = parseCalibration(metricsSource.calibration);
  const modelCardSource = expectObject(source.modelCard, "artifact.modelCard");
  const trainingRuntimeSource = expectObject(source.trainingRuntime, "artifact.trainingRuntime");
  const featureDirections = parseFeatureDirections(constraintsSource.featureDirections, features);
  const ensemble = parseEnsemble(source.ensemble, features, featureDirections);

  const cohort = {
    patients: expectNumber(cohortSource.patients, "artifact.cohort.patients", { min: 1, integer: true }),
    weeksPerPatient: expectNumber(cohortSource.weeksPerPatient, "artifact.cohort.weeksPerPatient", {
      min: 1,
      integer: true
    }),
    rows: expectNumber(cohortSource.rows, "artifact.cohort.rows", { min: 1, integer: true }),
    generationSeed: expectNumber(cohortSource.generationSeed, "artifact.cohort.generationSeed", { integer: true }),
    description: expectString(cohortSource.description, "artifact.cohort.description")
  };

  if (cohort.rows !== cohort.patients * cohort.weeksPerPatient) {
    fail("artifact.cohort.rows", "must equal patients multiplied by weeksPerPatient");
  }

  const metrics = {
    samples: expectNumber(metricsSource.samples, "artifact.metrics.samples", { min: 1, integer: true }),
    patients: expectNumber(metricsSource.patients, "artifact.metrics.patients", { min: 1, integer: true }),
    trainPatients: expectNumber(metricsSource.trainPatients, "artifact.metrics.trainPatients", { min: 1, integer: true }),
    validationPatients: expectNumber(metricsSource.validationPatients, "artifact.metrics.validationPatients", {
      min: 1,
      integer: true
    }),
    testPatients: expectNumber(metricsSource.testPatients, "artifact.metrics.testPatients", { min: 1, integer: true }),
    positiveRate: expectProbability(metricsSource.positiveRate, "artifact.metrics.positiveRate"),
    testAuc: expectProbability(metricsSource.testAuc, "artifact.metrics.testAuc"),
    testAuprc: expectProbability(metricsSource.testAuprc, "artifact.metrics.testAuprc"),
    testBrier: expectProbability(metricsSource.testBrier, "artifact.metrics.testBrier"),
    baselineBrier: expectProbability(metricsSource.baselineBrier, "artifact.metrics.baselineBrier"),
    brierSkill: expectNumber(metricsSource.brierSkill, "artifact.metrics.brierSkill", { max: 1 }),
    threshold: expectProbability(metricsSource.threshold, "artifact.metrics.threshold"),
    precisionAtThreshold: expectProbability(metricsSource.precisionAtThreshold, "artifact.metrics.precisionAtThreshold"),
    recallAtThreshold: expectProbability(metricsSource.recallAtThreshold, "artifact.metrics.recallAtThreshold"),
    reviewRateAtThreshold: expectProbability(metricsSource.reviewRateAtThreshold, "artifact.metrics.reviewRateAtThreshold"),
    confusionMatrix: matrix,
    thresholdSelection: (() => {
      const selection = expectObject(metricsSource.thresholdSelection, "artifact.metrics.thresholdSelection");
      return {
        method: expectString(selection.method, "artifact.metrics.thresholdSelection.method"),
        targetRecall: expectProbability(selection.targetRecall, "artifact.metrics.thresholdSelection.targetRecall"),
        validationPrecision: expectProbability(
          selection.validationPrecision,
          "artifact.metrics.thresholdSelection.validationPrecision"
        ),
        validationRecall: expectProbability(
          selection.validationRecall,
          "artifact.metrics.thresholdSelection.validationRecall"
        ),
        validationReviewRate: expectProbability(
          selection.validationReviewRate,
          "artifact.metrics.thresholdSelection.validationReviewRate"
        )
      };
    })(),
    claimStatus: (() => {
      const status = metricsSource.claimStatus;
      if (status !== "synthetic-skill-demonstrated" && status !== "no-demonstrated-skill") {
        fail("artifact.metrics.claimStatus", "expected a supported claim status");
      }
      return status as ModelArtifact["metrics"]["claimStatus"];
    })(),
    calibration
  };

  if (metrics.samples !== cohort.rows) fail("artifact.metrics.samples", "must match artifact.cohort.rows");
  if (metrics.patients !== cohort.patients) fail("artifact.metrics.patients", "must match artifact.cohort.patients");
  if (metrics.trainPatients + metrics.validationPatients + metrics.testPatients !== metrics.patients) {
    fail("artifact.metrics.testPatients", "train, validation, and test patients must sum to all patients");
  }

  const testRows = metrics.testPatients * cohort.weeksPerPatient;
  const classifiedRows = matrix.tp + matrix.fp + matrix.fn + matrix.tn;
  if (classifiedRows !== testRows) fail("artifact.metrics.confusionMatrix", `expected ${testRows} classified test rows`);

  const calibratedRows = calibration.reduce((total, bin) => total + bin.count, 0);
  if (calibratedRows !== testRows) fail("artifact.metrics.calibration", `expected ${testRows} calibrated test rows`);

  return {
    artifact: {
      version: expectString(source.version, "artifact.version"),
      modelType: expectString(source.modelType, "artifact.modelType"),
      target: expectString(source.target, "artifact.target"),
      trainedAt: expectDate(source.trainedAt, "artifact.trainedAt"),
      cohort,
      features,
      intercept: expectNumber(source.intercept, "artifact.intercept"),
      constraints: {
        method: expectString(constraintsSource.method, "artifact.constraints.method"),
        featureDirections
      },
      ensemble,
      metrics,
      modelCard: {
        intendedUse: expectString(modelCardSource.intendedUse, "artifact.modelCard.intendedUse"),
        notFor: expectString(modelCardSource.notFor, "artifact.modelCard.notFor"),
        edgeInference: expectString(modelCardSource.edgeInference, "artifact.modelCard.edgeInference"),
        explainability: expectString(modelCardSource.explainability, "artifact.modelCard.explainability"),
        limitations: parseStringArray(modelCardSource.limitations, "artifact.modelCard.limitations")
      },
      trainingRuntime: {
        python: expectString(trainingRuntimeSource.python, "artifact.trainingRuntime.python"),
        numpy: expectString(trainingRuntimeSource.numpy, "artifact.trainingRuntime.numpy"),
        seed: expectNumber(trainingRuntimeSource.seed, "artifact.trainingRuntime.seed", { integer: true }),
        maxIterations: expectNumber(trainingRuntimeSource.maxIterations, "artifact.trainingRuntime.maxIterations", {
          min: 1,
          integer: true
        })
      }
    },
    sampleRows: parseSampleRows(root.sampleRows)
  };
}

export const adherenceModelData = parseModelData(rawModelData);
