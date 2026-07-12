const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { DEMO_CHECK_INS } = require("../app/lib/careEngine.ts");
const {
  analyzeRiskSensitivity,
  explainRiskScore,
  getModelArtifact,
  getModelSampleRows,
  scoreFeatureVector,
  scorePatientRisk
} = require("../app/lib/edgeModel.ts");

const patient = patients.find((candidate) => candidate.id === "maya-patel");

function buildCheckIn(scenario) {
  return {
    patientId: patient.id,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  };
}

test("edge model artifact exposes honest prospective validation metrics", () => {
  const artifact = getModelArtifact();
  const testRows = artifact.metrics.testPatients * artifact.cohort.weeksPerPatient;
  const testPositiveRate =
    (artifact.metrics.confusionMatrix.tp + artifact.metrics.confusionMatrix.fn) / testRows;

  assert.equal(artifact.metrics.samples, 12000);
  assert.equal(artifact.features.length, 14);
  assert.equal(artifact.ensemble.members.length, 16);
  assert.ok(artifact.metrics.testAuc > 0.7, "expected synthetic discrimination above chance");
  assert.ok(artifact.metrics.testAuprc > testPositiveRate, "expected precision-recall skill above prevalence");
  assert.ok(artifact.metrics.brierSkill > 0, "expected positive Brier skill against the training-prevalence baseline");
  assert.ok(artifact.metrics.thresholdSelection.validationRecall >= artifact.metrics.thresholdSelection.targetRecall);
  assert.ok(artifact.metrics.recallAtThreshold >= 0.7, "expected the recall-oriented operating point to transfer to test patients");
  assert.equal(artifact.metrics.claimStatus, "synthetic-skill-demonstrated");
  assert.match(artifact.modelCard.notFor, /Diagnosis|medication/i);
  assert.equal(artifact.constraints.method, "projected gradient descent");
  assert.ok(artifact.features.find((feature) => feature.name === "missed_doses_2wk").weight >= 0);
  assert.ok(artifact.features.find((feature) => feature.name === "prior_failure").weight >= 0);
  assert.ok(artifact.features.find((feature) => feature.name === "adherence_last_2wk").weight <= 0);
});

test("parity fixtures preserve the prospective temporal contract and Python scores", () => {
  const rows = getModelSampleRows();
  assert.equal(rows.length, 20);
  assert.ok(rows.some((row) => row.target === 1));
  assert.ok(rows.some((row) => row.target === 0));

  rows.forEach((row) => {
    const result = scoreFeatureVector(row);
    assert.equal(row.outcome_week, row.week + 1);
    assert.ok(Math.abs(result.risk - row.expected_consensus_risk) < 1e-9);
    assert.ok(Math.abs(result.modelSpread.p10 - row.expected_p10) < 1e-9);
    assert.ok(Math.abs(result.modelSpread.p90 - row.expected_p90) < 1e-9);
    assert.equal(result.support.status === "supported" ? 1 : 0, row.expected_supported);
  });
});

test("risk explanation reconstructs the final probability from additive log-odds", () => {
  const result = scorePatientRisk(patient, buildCheckIn("normal"));
  const explanation = explainRiskScore(result, 5);
  assert.ok(explanation, "expected supported input to produce a risk explanation");
  const finalStep = explanation.steps.at(-1);

  assert.ok(finalStep, "expected at least one decomposition step");
  assert.ok(Math.abs(finalStep.probabilityAfter - result.risk) < 1e-9);
  assert.ok(explanation.topFeatureCoverage > 0 && explanation.topFeatureCoverage <= 1);
  assert.equal(explanation.currentRisk, result.risk);
  assert.ok(result.contributions.every((item) => Number.isFinite(item.zScore)));
});

test("sensitivity analysis is bounded, sorted, and preserves monotonic direction", () => {
  const result = scorePatientRisk(patient, buildCheckIn("normal"));
  const sensitivity = analyzeRiskSensitivity(result);
  assert.ok(sensitivity, "expected supported input to produce sensitivity analysis");
  const spans = sensitivity.features.map((feature) => feature.span);
  const sortedSpans = [...spans].sort((a, b) => b - a);
  const adherence = sensitivity.features.find((feature) => feature.name === "adherence_last_2wk");
  const routine = sensitivity.features.find((feature) => feature.name === "routine_disruption");

  assert.deepEqual(spans, sortedSpans);
  assert.ok(sensitivity.oneAtATimeLow <= result.risk);
  assert.ok(sensitivity.oneAtATimeHigh >= result.risk);
  assert.ok(sensitivity.stabilityScore >= 0 && sensitivity.stabilityScore <= 1);
  assert.equal(adherence.direction, "higher lowers risk");
  assert.match(routine.perturbation, /training SD/);
  assert.ok(sensitivity.features.every((feature) => feature.minRisk >= 0 && feature.maxRisk <= 1));
});

test("sensitivity perturbations stay inside exported marginal feature bounds", () => {
  const base = scorePatientRisk(patient, buildCheckIn("normal"));
  const nausea = base.artifact.features.find((feature) => feature.name === "nausea_score");
  const features = { ...base.features, nausea_score: nausea.support.high - 0.001 };
  const score = scoreFeatureVector(features, base.artifact);
  const sensitivity = analyzeRiskSensitivity({ ...base, ...score, features });

  assert.equal(score.support.status, "supported");
  assert.ok(sensitivity, "expected a supported near-boundary input to produce sensitivity analysis");
  for (const feature of sensitivity.features) {
    const exported = base.artifact.features.find((item) => item.name === feature.name);
    assert.ok(feature.lowValue >= exported.support.low, `${feature.name} escaped its lower support bound`);
    assert.ok(feature.highValue <= exported.support.high, `${feature.name} escaped its upper support bound`);
  }
  const nauseaSensitivity = sensitivity.features.find((feature) => feature.name === "nausea_score");
  assert.equal(nauseaSensitivity.highValue, nausea.support.high);
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

test("supported intervention simulations are sorted by scenario-score decrease", () => {
  const result = scorePatientRisk(patient, buildCheckIn("normal"));

  assert.equal(result.support.status, "supported");
  assert.equal(result.interventions.length, 4);
  for (const intervention of result.interventions) {
    assert.equal(intervention.rankable, true);
    assert.ok(intervention.risk <= result.risk);
    assert.ok(intervention.absoluteReduction >= 0);
  }

  const reductions = result.interventions.map((intervention) => intervention.absoluteReduction);
  const sorted = [...reductions].sort((a, b) => b - a);
  assert.deepEqual(reductions, sorted);
});

test("out-of-support input abstains from numeric intervention ranking", () => {
  const result = scorePatientRisk(patient, buildCheckIn("escalation"));

  assert.equal(result.support.status, "out-of-support");
  assert.ok(result.support.violations.length >= 1);
  assert.ok(result.interventions.every((intervention) => !intervention.rankable));
  assert.ok(result.interventions.every((intervention) => intervention.risk === null));
  assert.ok(result.interventions.every((intervention) => intervention.absoluteReduction === null));
  assert.equal(explainRiskScore(result), null);
  assert.equal(analyzeRiskSensitivity(result), null);
});
