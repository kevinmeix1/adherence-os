const assert = require("node:assert/strict");
const test = require("node:test");

const { GET } = require("../app/api/health/route.ts");
const { getModelArtifact } = require("../app/lib/edgeModel.ts");
const { getHealthStatus } = require("../app/lib/health.ts");

test("health status reports synthetic data and model readiness", () => {
  const status = getHealthStatus();

  assert.equal(status.status, "ok");
  assert.equal(status.dataMode, "synthetic");
  assert.equal(status.checks.patients, 3);
  assert.equal(status.checks.modelFeatures, 14);
  assert.match(status.checks.modelVersion, /edge-logistic/);

  const artifact = getModelArtifact();
  assert.deepEqual(status.checks.modelArtifact, {
    version: artifact.version,
    trainedAt: artifact.trainedAt,
    generationSeed: artifact.cohort.generationSeed,
    cohortPatients: artifact.cohort.patients,
    samples: artifact.metrics.samples,
    features: artifact.features.length
  });
});

test("health endpoint returns an HTTP 200 JSON response", async () => {
  const response = GET();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "adherence-os");
});
