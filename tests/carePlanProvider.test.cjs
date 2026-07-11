const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { DEMO_CHECK_INS, evaluateCheckIn } = require("../app/lib/careEngine.ts");
const { resolveProviderCarePlan } = require("../app/lib/carePlanProvider.ts");

const patient = patients.find((candidate) => candidate.id === "maya-patel");

function buildContext(scenario = "normal") {
  const checkIn = {
    patientId: patient.id,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  };

  return {
    patient,
    checkIn,
    fallback: evaluateCheckIn(patient, checkIn)
  };
}

test("invalid provider output returns a disclosed deterministic fallback", async () => {
  const context = buildContext();
  const resolution = await resolveProviderCarePlan({
    ...context,
    provider: async () => null
  });

  assert.equal(resolution.error, undefined);
  assert.equal(resolution.payload.source, "rules-fallback");
  assert.equal(resolution.payload.fallbackReason, "invalid-openai-output");
  assert.deepEqual(resolution.payload.plan, context.fallback);
});

test("provider timeout or exception returns a complete deterministic fallback", async () => {
  const context = buildContext("escalation");
  const timeoutError = new Error("provider request timed out");
  const resolution = await resolveProviderCarePlan({
    ...context,
    provider: async () => {
      throw timeoutError;
    }
  });

  assert.equal(resolution.error, timeoutError);
  assert.equal(resolution.payload.source, "rules-fallback");
  assert.equal(resolution.payload.fallbackReason, "openai-error");
  assert.equal(resolution.payload.plan.riskLevel, "urgent");
  assert.equal(resolution.payload.plan.escalation.urgency, "urgent");
  assert.equal(resolution.payload.plan.rescuePlan.length, 7);
});

test("provider output still passes through deterministic medication guardrails", async () => {
  const context = buildContext();
  const generatedPlan = {
    ...context.fallback,
    patientAction: "Double the next dose and stop taking it if nausea continues.",
    explanation: "This sounds like I can diagnose medication intolerance.",
    clinicianDraft: "Increase dose tomorrow.",
    ruleHits: []
  };
  const resolution = await resolveProviderCarePlan({
    ...context,
    provider: async () => generatedPlan
  });
  const guardedText = `${resolution.payload.plan.patientAction} ${resolution.payload.plan.explanation} ${resolution.payload.plan.clinicianDraft}`;

  assert.equal(resolution.payload.source, "openai");
  assert.doesNotMatch(guardedText, /double|stop taking|increase dose|diagnos/i);
  assert.ok(
    resolution.payload.plan.ruleHits.includes("guardrail removed unsafe medication or diagnosis language"),
    "expected deterministic post-generation guardrail evidence"
  );
});
