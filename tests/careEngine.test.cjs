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
  assert.match(plan.patientAction, /routine/i);
  assert.match(plan.patientAction, /fluid/i);
  assert.match(plan.patientAction, /log/i);
});

test("escalation check-in routes red flags to urgent clinical review", () => {
  const plan = evaluateCheckIn(patient, buildCheckIn("escalation"));

  assert.equal(plan.riskLevel, "urgent");
  assert.equal(plan.escalation.needed, true);
  assert.equal(plan.escalation.urgency, "urgent");
  assert.match(plan.patientAction, /NHS 111|999|A&E/i);
  assert.equal(plan.nextCheckInWindow, "Now");
  assert.equal(plan.rescuePlan.length, 1);
  assert.equal(plan.rescuePlan[0].patientMicroAction, plan.patientAction);
  assert.ok(
    plan.ruleHits.some((hit) => hit.startsWith("red flag:")),
    "expected at least one red-flag rule hit"
  );
  assert.ok(
    plan.clinicianSummary.includes("Red flags:"),
    "expected clinician handoff to include red flags"
  );
});

test("post-generation merge keeps every care-plan field deterministic", () => {
  const checkIn = buildCheckIn("escalation");
  const rulesPlan = evaluateCheckIn(patient, checkIn);
  const generatedPlan = {
    riskLevel: "steady",
    headline: "Provider headline",
    patientAction: "Provider patient action",
    explanation: "Provider explanation",
    safetyNotice: "Provider notice",
    escalation: {
      needed: false,
      urgency: "none",
      reason: "Provider reason",
      channel: "Provider channel"
    },
    clinicianSummary: "Provider summary",
    clinicianDraft: "Provider draft",
    signals: ["Provider signal"],
    nextCheckInWindow: "Provider window",
    ruleHits: [],
    agentTrace: [],
    judgeFit: {
      userImpact: "Provider impact",
      innovation: "Provider innovation",
      feasibility: "Provider feasibility",
      demoQuality: "Provider demo quality"
    },
    adherenceTwin: {
      summary: "Provider twin",
      predictedFailurePoint: "Provider prediction",
      riskDrivers: [],
      protectiveFactors: []
    },
    rescuePlan: [],
    unsafeRequestDemo: {
      request: "Provider request",
      blocked: false,
      patientResponse: "Provider response",
      clinicianNote: "Provider note",
      guardrails: []
    }
  };

  assert.deepEqual(applySafetyOverrides(generatedPlan, patient, checkIn), rulesPlan);
});

test("unsafe generated medication and diagnosis variants are discarded and audited", () => {
  const checkIn = buildCheckIn("normal");
  const rulesPlan = evaluateCheckIn(patient, checkIn);
  const unsafeActions = [
    "Take twice as much tomorrow. You have pancreatitis.",
    "Double your next dose tomorrow.",
    "This is pancreatitis. Stop taking your medication.",
    "You likely have acute pancreatitis, so increase the dose."
  ];

  for (const patientAction of unsafeActions) {
    const generatedPlan = {
      ...rulesPlan,
      patientAction,
      explanation: "Provider explanation",
      clinicianDraft: "Provider draft",
      ruleHits: []
    };
    const guardedPlan = applySafetyOverrides(generatedPlan, patient, checkIn);

    assert.equal(guardedPlan.patientAction, rulesPlan.patientAction, patientAction);
    assert.equal(guardedPlan.explanation, rulesPlan.explanation, patientAction);
    assert.equal(guardedPlan.clinicianDraft, rulesPlan.clinicianDraft, patientAction);
    assert.deepEqual(guardedPlan.escalation, rulesPlan.escalation, patientAction);
    assert.match(guardedPlan.safetyNotice, /does not diagnose, change medication/i);
    assert.ok(
      guardedPlan.ruleHits.includes("guardrail removed unsafe medication or diagnosis language"),
      patientAction
    );
  }
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
    assert.equal(plan.escalation.needed, false, `nausea ${expected.nauseaScore}/10`);
    assert.equal(plan.escalation.urgency, "none", `nausea ${expected.nauseaScore}/10`);
  }
});

test("missed medication plus nausea crosses the same-day review boundary at six", () => {
  const cases = [
    { nauseaScore: 5, riskLevel: "watch", urgency: "none", needed: false },
    { nauseaScore: 6, riskLevel: "review", urgency: "same_day", needed: true },
    { nauseaScore: 7, riskLevel: "review", urgency: "same_day", needed: true }
  ];

  for (const expected of cases) {
    const plan = evaluateCheckIn(
      patient,
      buildBoundaryCheckIn({ medicationTaken: false, nauseaScore: expected.nauseaScore })
    );
    assert.equal(plan.riskLevel, expected.riskLevel, `missed medication with nausea ${expected.nauseaScore}/10`);
    assert.equal(plan.escalation.urgency, expected.urgency, `missed medication with nausea ${expected.nauseaScore}/10`);
    assert.equal(plan.escalation.needed, expected.needed, `missed medication with nausea ${expected.nauseaScore}/10`);
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

test("watch stays in coaching while review creates only a pending same-day draft", () => {
  const watchPlan = evaluateCheckIn(patient, buildBoundaryCheckIn({ nauseaScore: 5 }));
  const reviewPlan = evaluateCheckIn(patient, buildBoundaryCheckIn({ hydrationScore: 2 }));

  assert.equal(watchPlan.riskLevel, "watch");
  assert.equal(watchPlan.escalation.needed, false);
  assert.equal(watchPlan.escalation.urgency, "none");
  assert.match(watchPlan.escalation.channel, /no active handoff/i);

  assert.equal(reviewPlan.riskLevel, "review");
  assert.equal(reviewPlan.escalation.needed, true);
  assert.equal(reviewPlan.escalation.urgency, "same_day");
  assert.match(reviewPlan.escalation.channel, /draft.*pending/i);
  assert.match(reviewPlan.patientAction, /draft.*pending/i);
  assert.match(reviewPlan.clinicianDraft, /draft pending/i);

  const planText = JSON.stringify([
    evaluateCheckIn(patient, buildCheckIn("normal")),
    watchPlan,
    reviewPlan,
    evaluateCheckIn(patient, buildCheckIn("escalation"))
  ]);
  assert.doesNotMatch(
    planText,
    /\b(?:send|sent|delivered|receives?|routed|created|queued?)\b/i,
    "care plans must describe drafts and pending review, not transport"
  );
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

test("adversarial active phrases select destination-specific urgent routes", () => {
  const cases = [
    {
      freeText: "I have not been able to keep fluids down.",
      labels: ["unable to keep fluids down"],
      destination: /call NHS 111/i
    },
    {
      freeText: "No idea why I have chest pain.",
      labels: ["chest pain"],
      destination: /call 999/i
    },
    {
      freeText: "I am struggling to breathe.",
      labels: ["breathlessness"],
      destination: /call 999/i
    },
    {
      freeText: "I want to kill myself.",
      labels: ["immediate self-harm language"],
      destination: /call 999|go to A&E/i
    },
    {
      freeText: "I am throwing up.",
      labels: ["unable to keep fluids down"],
      destination: /call NHS 111/i
    },
    {
      freeText: "I have severe persistent abdominal pain and I am throwing up.",
      labels: ["severe abdominal pain", "unable to keep fluids down"],
      destination: /call NHS 111/i
    }
  ];

  for (const { freeText, labels, destination } of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));

    assert.equal(plan.riskLevel, "urgent", freeText);
    assert.equal(plan.escalation.needed, true, freeText);
    assert.equal(plan.escalation.urgency, "urgent", freeText);
    assert.match(plan.escalation.channel, destination, freeText);
    assert.match(plan.patientAction, destination, freeText);
    assert.equal(plan.nextCheckInWindow, "Now", freeText);
    assert.equal(plan.rescuePlan.length, 1, freeText);
    assert.equal(plan.rescuePlan[0].label, "Immediate safety action", freeText);
    assert.equal(plan.rescuePlan[0].patientMicroAction, plan.patientAction, freeText);
    assert.ok(
      plan.adherenceTwin.riskDrivers.every((driver) => /coaching routes are suppressed/i.test(driver.rescueMove)),
      freeText
    );
    for (const label of labels) {
      assert.ok(plan.ruleHits.includes(`red flag: ${label}`), `${label}: ${freeText}`);
    }
  }
});

test("negation in one check-in field cannot hide a red flag in another field", () => {
  const plan = evaluateCheckIn(
    patient,
    buildBoundaryCheckIn({
      sideEffects: "No nausea",
      freeText: "I have chest pain now"
    })
  );

  assert.equal(plan.riskLevel, "urgent");
  assert.ok(plan.ruleHits.includes("red flag: chest pain"));
  assert.match(plan.escalation.channel, /call 999/i);
});

test("explicitly resolved historical vomiting stays out of urgent mode", () => {
  const resolvedPhrases = [
    "I vomited once last week but I am fine now.",
    "Last week I was vomiting, but I feel better now.",
    "I threw up yesterday; however I am well now."
  ];

  for (const freeText of resolvedPhrases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));
    assert.equal(plan.riskLevel, "steady", freeText);
    assert.equal(plan.ruleHits.some((hit) => hit.startsWith("red flag:")), false, freeText);
  }

  const currentAgain = evaluateCheckIn(
    patient,
    buildBoundaryCheckIn({
      freeText: "I vomited once last week but I am fine now. I am throwing up again today."
    })
  );
  assert.equal(currentAgain.riskLevel, "urgent");
  assert.ok(currentAgain.ruleHits.includes("red flag: unable to keep fluids down"));
});

test("severe abdominal and fluid-intolerance paraphrases trigger urgent handoff", () => {
  const cases = [
    {
      freeText: "I have agonising upper belly pain that spreads into my back.",
      labels: ["severe abdominal pain"]
    },
    {
      freeText: "Every sip comes straight back up and I cannot drink.",
      labels: ["unable to keep fluids down"]
    },
    {
      freeText: "My stomach hurts unbearably and I keep throwing up.",
      labels: ["severe abdominal pain", "unable to keep fluids down"]
    },
    {
      freeText: "I have agonizing upper abdominal pain spreading to the back.",
      labels: ["severe abdominal pain"]
    },
    {
      freeText: "Even tiny sips come right back up and I am unable to drink fluids.",
      labels: ["unable to keep fluids down"]
    },
    {
      freeText: "My belly is hurting excruciatingly and I keep being sick.",
      labels: ["severe abdominal pain", "unable to keep fluids down"]
    }
  ];

  for (const { freeText, labels } of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));

    assert.equal(plan.riskLevel, "urgent", freeText);
    assert.equal(plan.escalation.urgency, "urgent", freeText);
    for (const label of labels) {
      assert.ok(plan.ruleHits.includes(`red flag: ${label}`), `${label}: ${freeText}`);
    }
  }
});

test("negated and benign symptom language does not create false urgent handoffs", () => {
  const benignPhrases = [
    "No chest pain or shortness of breath.",
    "I can keep fluids down and I am not vomiting.",
    "The screen looked faint, but I did not feel dizzy.",
    "Mild stomach discomfort settled after lunch.",
    "I am not pregnant and my period arrived normally.",
    "I have no thoughts of self harm.",
    "I do not have agonising upper belly pain that spreads into my back.",
    "No sip comes straight back up and I can drink.",
    "My stomach does not hurt unbearably and I am not throwing up.",
    "I don't have agonizing upper abdominal pain and I haven't been throwing up."
  ];

  for (const freeText of benignPhrases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));
    assert.notEqual(plan.riskLevel, "urgent", freeText);
    assert.equal(plan.ruleHits.some((hit) => hit.startsWith("red flag:")), false, freeText);
  }
});

test("positive red flags remain active after separate negated clauses", () => {
  const cases = [
    {
      freeText: "No chest pain or breathlessness, but my severe stomach pain will not go away.",
      present: "severe abdominal pain",
      absent: "chest pain"
    },
    {
      freeText: "I do not have agonising upper belly pain, but every sip comes straight back up and I cannot drink.",
      present: "unable to keep fluids down",
      absent: "severe abdominal pain"
    },
    {
      freeText: "No sip comes back up, but my stomach hurts unbearably now.",
      present: "severe abdominal pain",
      absent: "unable to keep fluids down"
    },
    {
      freeText: "I did not have severe stomach pain earlier, but now my stomach hurts unbearably.",
      present: "severe abdominal pain"
    }
  ];

  for (const { freeText, present, absent } of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));

    assert.equal(plan.riskLevel, "urgent", freeText);
    assert.ok(plan.ruleHits.includes(`red flag: ${present}`), freeText);
    if (absent) assert.equal(plan.ruleHits.includes(`red flag: ${absent}`), false, freeText);
  }
});
