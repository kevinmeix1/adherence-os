const assert = require("node:assert/strict");
const test = require("node:test");

const rawModelData = require("../data/adherence-model.json");
const {
  ModelArtifactValidationError,
  adherenceModelData,
  parseModelData
} = require("../app/lib/modelArtifact.ts");

function cloneModelData() {
  return structuredClone(rawModelData);
}

test("checked-in adherence model passes runtime validation", () => {
  assert.equal(adherenceModelData.artifact.features.length, 14);
  assert.equal(adherenceModelData.artifact.ensemble.members.length, 16);
  assert.deepEqual(parseModelData(rawModelData), adherenceModelData);
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

test("model validation rejects invalid prospective fixture timing", () => {
  const invalidData = cloneModelData();
  invalidData.sampleRows[0].outcome_week = invalidData.sampleRows[0].week;

  assert.throws(() => parseModelData(invalidData), /sampleRows\[0\]\.outcome_week: must equal index week plus one/);
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
