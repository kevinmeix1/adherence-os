const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { DEMO_CHECK_INS } = require("../app/lib/careEngine.ts");
const { analyzeRiskSensitivity, explainRiskScore, getModelArtifact, scorePatientRisk } = require("../app/lib/edgeModel.ts");

const patient = patients.find((candidate) => candidate.id === "maya-patel");

function buildCheckIn(scenario) {
  return {
    patientId: patient.id,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  };
}

test("edge model artifact exposes expected synthetic validation metrics", () => {
  const artifact = getModelArtifact();

  assert.equal(artifact.metrics.samples, 12000);
  assert.equal(artifact.features.length, 14);
  assert.ok(artifact.metrics.testAuc > 0.9, "expected strong synthetic discrimination");
  assert.ok(artifact.metrics.testBrier < 0.05, "expected low synthetic calibration error");
  assert.match(artifact.modelCard.notFor, /Diagnosis|medication/i);
  assert.equal(artifact.constraints.method, "projected gradient descent");
  assert.ok(artifact.features.find((feature) => feature.name === "missed_doses_2wk").weight >= 0);
  assert.ok(artifact.features.find((feature) => feature.name === "prior_failure").weight >= 0);
  assert.ok(artifact.features.find((feature) => feature.name === "adherence_last_2wk").weight <= 0);
});

test("risk explanation reconstructs the final probability from additive log-odds", () => {
  const result = scorePatientRisk(patient, buildCheckIn("escalation"));
  const explanation = explainRiskScore(result, 5);
  const finalStep = explanation.steps.at(-1);

  assert.ok(finalStep, "expected at least one decomposition step");
  assert.ok(Math.abs(finalStep.probabilityAfter - result.risk) < 1e-9);
  assert.ok(explanation.topFeatureCoverage > 0 && explanation.topFeatureCoverage <= 1);
  assert.equal(explanation.currentRisk, result.risk);
  assert.ok(result.contributions.every((item) => Number.isFinite(item.zScore)));
});

test("sensitivity analysis is bounded, sorted, and preserves monotonic direction", () => {
  const result = scorePatientRisk(patient, buildCheckIn("escalation"));
  const sensitivity = analyzeRiskSensitivity(result);
  const spans = sensitivity.features.map((feature) => feature.span);
  const sortedSpans = [...spans].sort((a, b) => b - a);
  const adherence = sensitivity.features.find((feature) => feature.name === "adherence_last_2wk");

  assert.deepEqual(spans, sortedSpans);
  assert.ok(sensitivity.oneAtATimeLow <= result.risk);
  assert.ok(sensitivity.oneAtATimeHigh >= result.risk);
  assert.ok(sensitivity.stabilityScore >= 0 && sensitivity.stabilityScore <= 1);
  assert.equal(adherence.direction, "higher lowers risk");
  assert.ok(sensitivity.features.every((feature) => feature.minRisk >= 0 && feature.maxRisk <= 1));
});

test("edge model scores escalation check-in higher than normal check-in", () => {
  const normal = scorePatientRisk(patient, buildCheckIn("normal"));
  const escalation = scorePatientRisk(patient, buildCheckIn("escalation"));

  assert.ok(escalation.risk > normal.risk, `expected ${escalation.risk} > ${normal.risk}`);
  assert.ok(escalation.contributions.length >= 5);
  assert.ok(
    escalation.contributions.some((item) => item.label === "Nausea burden" || item.label === "Low hydration risk"),
    "expected symptom features to appear in risk contributions"
  );
});

test("intervention simulations are sorted by risk reduction", () => {
  const result = scorePatientRisk(patient, buildCheckIn("escalation"));

  assert.equal(result.interventions.length, 4);
  for (const intervention of result.interventions) {
    assert.ok(intervention.risk <= result.risk);
    assert.ok(intervention.absoluteReduction >= 0);
  }

  const reductions = result.interventions.map((intervention) => intervention.absoluteReduction);
  const sorted = [...reductions].sort((a, b) => b - a);
  assert.deepEqual(reductions, sorted);
});
