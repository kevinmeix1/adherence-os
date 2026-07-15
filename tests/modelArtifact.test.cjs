const assert = require("node:assert/strict");
const test = require("node:test");

const rawModelData = require("../data/adherence-model.json");
const rawModelFixtures = require("../data/adherence-model-fixtures.json");
const {
  ModelArtifactValidationError,
  adherenceModelData,
  parseModelSampleRows,
  parseModelData
} = require("../app/lib/modelArtifact.ts");
const { MODEL_FEATURE_CONTRACT_VERSION } = require("../app/lib/modelFeatures.ts");

function cloneModelData() {
  return structuredClone(rawModelData);
}

test("checked-in adherence model passes runtime validation", () => {
  assert.equal(adherenceModelData.artifact.features.length, 14);
  assert.equal(adherenceModelData.artifact.ensemble.members.length, 16);
  assert.equal(adherenceModelData.artifact.featureContract.version, MODEL_FEATURE_CONTRACT_VERSION);
  assert.equal(rawModelFixtures.contractVersion, MODEL_FEATURE_CONTRACT_VERSION);
  assert.equal(rawModelFixtures.featureRows.length, 12);
  assert.deepEqual(parseModelData(rawModelData), adherenceModelData);
  assert.equal(parseModelSampleRows(rawModelFixtures.sampleRows).length, 20);
});

test("model validation rejects a mismatched feature-source contract", () => {
  const invalidData = cloneModelData();
  invalidData.artifact.featureContract.version = "adherence-feature-source-v0";

  assert.throws(
    () => parseModelData(invalidData),
    /artifact\.featureContract\.version: expected adherence-feature-source-v1/
  );
});

test("model validation rejects unsafe standardisation values with a precise path", () => {
  const invalidData = cloneModelData();
  invalidData.artifact.features[3].std = 0;

  assert.throws(
    () => parseModelData(invalidData),
    (error) => {
      assert.ok(error instanceof ModelArtifactValidationError);
      assert.match(error.message, /artifact\.features\[3\]\.std/);
      assert.match(error.message, /greater than 0/);
      return true;
    }
  );
});

test("model validation enforces exported feature order", () => {
  const invalidData = cloneModelData();
  [invalidData.artifact.features[0], invalidData.artifact.features[1]] = [
    invalidData.artifact.features[1],
    invalidData.artifact.features[0]
  ];

  assert.throws(() => parseModelData(invalidData), /artifact\.features\[0\]\.name: expected "week"/);
});

test("model validation rejects inconsistent evaluation counts", () => {
  const invalidData = cloneModelData();
  invalidData.artifact.metrics.confusionMatrix.tn -= 1;

  assert.throws(() => parseModelData(invalidData), /confusionMatrix: expected 1800 classified test rows/);
});

test("model validation locks the predeclared challenger and its held-out row count", () => {
  const wrongFeature = cloneModelData();
  wrongFeature.artifact.metrics.challengerBenchmark.featureNames = ["nausea_score"];
  assert.throws(
    () => parseModelData(wrongFeature),
    /challengerBenchmark\.featureNames: expected only "adherence_last_2wk"/
  );

  const wrongCount = cloneModelData();
  wrongCount.artifact.metrics.challengerBenchmark.confusionMatrix.tn -= 1;
  assert.throws(
    () => parseModelData(wrongCount),
    /challengerBenchmark\.confusionMatrix: expected 1800 classified test rows/
  );
});

test("model validation reconciles runtime-gate coverage with supported rows", () => {
  const wrongCoverage = cloneModelData();
  wrongCoverage.artifact.metrics.supportEvaluation.supportedRows -= 1;
  assert.throws(
    () => parseModelData(wrongCoverage),
    /supportEvaluation\.supportedRows: supported and abstained rows must sum to all held-out rows/
  );

  const wrongMatrix = cloneModelData();
  wrongMatrix.artifact.metrics.supportEvaluation.confusionMatrix.tn -= 1;
  assert.throws(
    () => parseModelData(wrongMatrix),
    /supportEvaluation\.confusionMatrix: must classify exactly the supported held-out rows/
  );
});

test("model validation rejects invalid prospective fixture timing", () => {
  const invalidRows = structuredClone(rawModelFixtures.sampleRows);
  invalidRows[0].outcome_week = invalidRows[0].week;

  assert.throws(() => parseModelSampleRows(invalidRows), /sampleRows\[0\]\.outcome_week: must equal index week plus one/);
});

test("model validation rejects ensemble coefficients that violate monotonic constraints", () => {
  const invalidData = cloneModelData();
  const nauseaIndex = invalidData.artifact.features.findIndex((feature) => feature.name === "nausea_score");
  invalidData.artifact.ensemble.members[0].weights[nauseaIndex] = -0.1;

  assert.throws(
    () => parseModelData(invalidData),
    /artifact\.ensemble\.members\[0\]\.weights\[3\]: conflicts with an increasing-risk constraint/
  );
});
