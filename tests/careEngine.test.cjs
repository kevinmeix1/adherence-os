const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const {
  DEMO_CHECK_INS,
  applySafetyOverrides,
  evaluateCheckIn
} = require("../app/lib/careEngine.ts");

const patient = patients.find((candidate) => candidate.id === "maya-patel");

function buildCheckIn(scenario) {
  return {
    patientId: patient.id,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  };
}

test("normal check-in stays in coaching mode with no escalation", () => {
  const plan = evaluateCheckIn(patient, buildCheckIn("normal"));

  assert.equal(plan.riskLevel, "steady");
  assert.equal(plan.escalation.needed, false);
  assert.equal(plan.escalation.urgency, "none");
  assert.equal(plan.agentTrace.length, 5);
  assert.equal(plan.rescuePlan.length, 7);
  assert.equal(plan.unsafeRequestDemo.blocked, true);
  assert.match(plan.patientAction, /routine|reminder|log/i);
});

test("escalation check-in routes red flags to urgent clinical review", () => {
  const plan = evaluateCheckIn(patient, buildCheckIn("escalation"));

  assert.equal(plan.riskLevel, "urgent");
  assert.equal(plan.escalation.needed, true);
  assert.equal(plan.escalation.urgency, "urgent");
  assert.match(plan.patientAction, /clinical team|urgent medical help/i);
  assert.ok(
    plan.ruleHits.some((hit) => hit.startsWith("red flag:")),
    "expected at least one red-flag rule hit"
  );
  assert.ok(
    plan.clinicianSummary.includes("Red flags:"),
    "expected clinician handoff to include red flags"
  );
});

test("safety override removes unsafe medication and diagnosis language", () => {
  const checkIn = buildCheckIn("normal");
  const safeBaseline = evaluateCheckIn(patient, checkIn);
  const unsafePlan = {
    ...safeBaseline,
    patientAction: "Double the next dose and stop taking it if nausea continues.",
    explanation: "This sounds like I can diagnose a medication intolerance.",
    clinicianDraft: "Increase dose tomorrow unless symptoms continue.",
    ruleHits: []
  };

  const guardedPlan = applySafetyOverrides(unsafePlan, patient, checkIn);
  const guardedText = `${guardedPlan.patientAction} ${guardedPlan.explanation} ${guardedPlan.clinicianDraft}`;

  assert.doesNotMatch(guardedText, /double|stop taking|increase dose|diagnos/i);
  assert.match(guardedPlan.safetyNotice, /does not diagnose, change medication/i);
  assert.ok(
    guardedPlan.ruleHits.includes("guardrail removed unsafe medication or diagnosis language"),
    "expected guardrail rule hit to be recorded"
  );
});
