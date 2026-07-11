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

function buildBoundaryCheckIn(overrides = {}) {
  return {
    ...buildCheckIn("normal"),
    scenario: "custom",
    nauseaScore: 4,
    hydrationScore: 7,
    energyScore: 6,
    sideEffects: "Mild symptoms remain manageable.",
    biomarkerNote: "No unusual synthetic reading.",
    freeText: "Routine is stable today.",
    ...overrides
  };
}

function patientWithRecentAdherence(adherencePct) {
  const copy = structuredClone(patient);
  copy.weeklyData.at(-2).adherencePct = adherencePct;
  copy.weeklyData.at(-1).adherencePct = adherencePct;
  return copy;
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

test("hydration boundaries move from coaching to same-day review to urgent handoff", () => {
  const cases = [
    { hydrationScore: 3, riskLevel: "steady", urgency: "none" },
    { hydrationScore: 2, riskLevel: "review", urgency: "same_day" },
    { hydrationScore: 1, riskLevel: "urgent", urgency: "urgent" }
  ];

  for (const expected of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ hydrationScore: expected.hydrationScore }));
    assert.equal(plan.riskLevel, expected.riskLevel, `hydration ${expected.hydrationScore}/10`);
    assert.equal(plan.escalation.urgency, expected.urgency, `hydration ${expected.hydrationScore}/10`);
  }
});

test("nausea boundaries enter watch mode without forcing clinical review", () => {
  const cases = [
    { nauseaScore: 4, riskLevel: "steady" },
    { nauseaScore: 5, riskLevel: "watch" },
    { nauseaScore: 6, riskLevel: "watch" }
  ];

  for (const expected of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ nauseaScore: expected.nauseaScore }));
    assert.equal(plan.riskLevel, expected.riskLevel, `nausea ${expected.nauseaScore}/10`);
  }
});

test("missed medication plus nausea crosses the same-day review boundary at six", () => {
  const cases = [
    { nauseaScore: 5, riskLevel: "watch", urgency: "routine_async" },
    { nauseaScore: 6, riskLevel: "review", urgency: "same_day" },
    { nauseaScore: 7, riskLevel: "review", urgency: "same_day" }
  ];

  for (const expected of cases) {
    const plan = evaluateCheckIn(
      patient,
      buildBoundaryCheckIn({ medicationTaken: false, nauseaScore: expected.nauseaScore })
    );
    assert.equal(plan.riskLevel, expected.riskLevel, `missed medication with nausea ${expected.nauseaScore}/10`);
    assert.equal(plan.escalation.urgency, expected.urgency, `missed medication with nausea ${expected.nauseaScore}/10`);
  }
});

test("high-nausea evidence activates at seven without changing the review boundary", () => {
  for (const nauseaScore of [6, 7, 8]) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ nauseaScore }));
    assert.equal(
      plan.ruleHits.includes("high nausea burden"),
      nauseaScore >= 7,
      `high-nausea evidence at ${nauseaScore}/10`
    );
  }
});

test("latest and two-week adherence enter watch mode only below 85 percent", () => {
  const cases = [
    { adherencePct: 86, riskLevel: "steady", hasRuleHit: false },
    { adherencePct: 85, riskLevel: "steady", hasRuleHit: false },
    { adherencePct: 84, riskLevel: "watch", hasRuleHit: true }
  ];

  for (const expected of cases) {
    const plan = evaluateCheckIn(
      patientWithRecentAdherence(expected.adherencePct),
      buildBoundaryCheckIn()
    );
    assert.equal(plan.riskLevel, expected.riskLevel, `${expected.adherencePct}% recent adherence`);
    assert.equal(
      plan.ruleHits.includes("two-week adherence below target"),
      expected.hasRuleHit,
      `${expected.adherencePct}% recent adherence evidence`
    );
  }
});

test("common red-flag phrases trigger urgent handoff", () => {
  const cases = [
    ["chest pain", "I have pressure in my chest."],
    ["breathlessness", "I am struggling to breathe."],
    ["fainting or severe dizziness", "I nearly fainted when I stood up."],
    ["severe abdominal pain", "I have severe persistent abdominal pain that radiates to my back."],
    ["unable to keep fluids down", "I cannot keep water down and keep vomiting."],
    ["pregnancy concern", "I had a positive pregnancy test."],
    ["self-harm language", "I am thinking about hurting myself."]
  ];

  for (const [label, freeText] of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));
    assert.equal(plan.riskLevel, "urgent", label);
    assert.equal(plan.escalation.urgency, "urgent", label);
    assert.ok(plan.ruleHits.includes(`red flag: ${label}`), label);
  }
});

test("negated and benign symptom language does not create false urgent handoffs", () => {
  const benignPhrases = [
    "No chest pain or shortness of breath.",
    "I can keep fluids down and I am not vomiting.",
    "The screen looked faint, but I did not feel dizzy.",
    "Mild stomach discomfort settled after lunch.",
    "I am not pregnant and my period arrived normally.",
    "I have no thoughts of self harm."
  ];

  for (const freeText of benignPhrases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));
    assert.notEqual(plan.riskLevel, "urgent", freeText);
    assert.equal(plan.ruleHits.some((hit) => hit.startsWith("red flag:")), false, freeText);
  }
});

test("a positive red flag after a negated clause still escalates", () => {
  const plan = evaluateCheckIn(
    patient,
    buildBoundaryCheckIn({ freeText: "No chest pain or breathlessness, but my severe stomach pain will not go away." })
  );

  assert.equal(plan.riskLevel, "urgent");
  assert.ok(plan.ruleHits.includes("red flag: severe abdominal pain"));
  assert.equal(plan.ruleHits.includes("red flag: chest pain"), false);
});
