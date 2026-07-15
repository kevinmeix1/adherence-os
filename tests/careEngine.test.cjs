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

test("coaching check-in stays in watch mode with no escalation", () => {
  const plan = evaluateCheckIn(patient, buildCheckIn("normal"));

  assert.equal(plan.riskLevel, "watch");
  assert.equal(plan.escalation.needed, false);
  assert.equal(plan.escalation.urgency, "none");
  assert.equal(plan.agentTrace.length, 5);
  assert.equal(plan.rescuePlan.length, 7);
  assert.equal(plan.unsafeRequestDemo.blocked, true);
  assert.match(plan.patientAction, /meal cue/i);
  assert.match(plan.patientAction, /log nausea/i);
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

test("urgent headlines name the configured destination without downplaying emergency routes", () => {
  const cases = [
    {
      input: buildBoundaryCheckIn({ freeText: "I have chest pain now." }),
      headline: "Call 999 now",
      destination: /call 999/i
    },
    {
      input: buildBoundaryCheckIn({ freeText: "I can't keep myself safe." }),
      headline: "Call 999 or go to A&E now",
      destination: /call 999|go to A&E/i
    },
    {
      input: buildBoundaryCheckIn({ freeText: "I've taken an overdose." }),
      headline: "Call 999 or go to A&E now",
      destination: /call 999|go to A&E/i
    },
    {
      input: buildBoundaryCheckIn({ freeText: "I have severe abdominal pain and I am vomiting." }),
      headline: "Call NHS 111 now",
      destination: /call NHS 111/i
    },
    {
      input: buildBoundaryCheckIn({ freeText: "I am thinking about hurting myself." }),
      headline: "Call NHS 111 now",
      destination: /NHS 111|mental-health/i
    },
    {
      input: buildBoundaryCheckIn({ hydrationScore: 1 }),
      headline: "Call NHS 111 now",
      destination: /call NHS 111/i
    }
  ];

  for (const { input, headline, destination } of cases) {
    const plan = evaluateCheckIn(patient, input);
    assert.equal(plan.riskLevel, "urgent", headline);
    assert.equal(plan.headline, headline);
    assert.match(`${plan.patientAction} ${plan.escalation.channel}`, destination, headline);
    assert.doesNotMatch(plan.headline, /same-day/i, headline);
  }
});

test("non-urgent copy reports configured rule state without clinical reassurance", () => {
  const plans = [
    evaluateCheckIn(patient, buildBoundaryCheckIn()),
    evaluateCheckIn(patient, buildCheckIn("normal")),
    evaluateCheckIn(patient, buildBoundaryCheckIn({ hydrationScore: 2 }))
  ];
  const copy = plans.map((plan) => `${plan.headline} ${plan.explanation} ${plan.clinicianDraft}`).join("\n");

  assert.equal(plans[0].headline, "Coaching can continue");
  assert.equal(plans[1].headline, "Monitor this adherence pattern");
  assert.match(plans[0].explanation, /No configured watch, same-day, or urgent rule matched/i);
  assert.match(plans[0].explanation, /does not mean symptoms were assessed or found safe/i);
  assert.match(plans[1].explanation, /This is not a clinical assessment/i);
  assert.match(plans[2].explanation, /No message has been sent/i);
  assert.doesNotMatch(
    copy,
    /not in crisis|symptoms are manageable|looks manageable|looks steady|preserved clinician oversight|without needing another appointment/i
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
  assert.match(reviewPlan.clinicianDraft, /draft only; pending manual review/i);

  const plans = [
    evaluateCheckIn(patient, buildCheckIn("normal")),
    watchPlan,
    reviewPlan,
    evaluateCheckIn(patient, buildCheckIn("escalation"))
  ];
  const planText = JSON.stringify(plans);
  assert.doesNotMatch(
    planText,
    /\b(?:we|the prototype|the system) (?:sent|delivered|contacted|routed|queued)|\b(?:message|handoff) (?:sent|delivered|routed|queued)\b/i,
    "care plans must describe drafts and pending review, not transport"
  );
  for (const plan of plans) {
    assert.match(plan.clinicianDraft, /Draft only; pending manual review\. No clinician or service has been contacted\./i);
  }
});

test("seven-day trigger notes match the implemented state rules", () => {
  const plan = evaluateCheckIn(patient, buildCheckIn("normal"));
  const triggerText = plan.rescuePlan.map((day) => day.clinicianTrigger).join("\n");

  assert.match(triggerText, /missed dose with nausea at 6\/10 or higher/i);
  assert.match(triggerText, /Nausea alone can activate watch; it does not activate same-day review/i);
  assert.match(triggerText, /hydration is 2\/10 or lower/i);
  assert.match(triggerText, /No mood-only escalation rule is implemented/i);
  assert.doesNotMatch(
    triggerText,
    /Escalate if a dose is missed|Review if nausea reaches|No trigger unless mood|feels at risk|same trigger repeats twice/i
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
    ["possible overdose or poisoning", "I've taken an overdose."],
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

test("structured safety flags override neutral text and suppress coaching", () => {
  const cases = [
    ["chest-or-breathing", "chest pain or breathing difficulty", /call 999/i],
    ["faint-or-severe-dizziness", "fainting or severe dizziness", /call NHS 111/i],
    ["severe-abdominal-pain", "severe abdominal pain", /call NHS 111/i],
    ["unable-to-keep-fluids-down", "unable to keep fluids down", /call NHS 111/i],
    ["overdose-or-poisoning", "possible overdose or poisoning", /call 999|go to A&E/i],
    ["pregnancy-concern", "pregnancy concern", /call NHS 111/i],
    ["self-harm-thoughts", "self-harm language", /NHS 111|mental-health/i],
    ["cannot-stay-safe", "immediate self-harm language", /call 999|go to A&E/i]
  ];

  for (const [flag, ruleLabel, destination] of cases) {
    const plan = evaluateCheckIn(
      patient,
      buildBoundaryCheckIn({
        safetyFlags: [flag],
        sideEffects: "",
        biomarkerNote: "",
        freeText: ""
      })
    );

    assert.equal(plan.riskLevel, "urgent", flag);
    assert.equal(plan.escalation.urgency, "urgent", flag);
    assert.ok(plan.ruleHits.includes(`red flag: ${ruleLabel}`), flag);
    assert.match(`${plan.patientAction} ${plan.escalation.channel}`, destination, flag);
    assert.equal(plan.rescuePlan.length, 1, flag);
  }
});

test("secondary phrase matching catches common urgent paraphrases", () => {
  const cases = [
    ["I have crushing chest discomfort.", "chest pain", /call 999/i],
    ["I can't catch my breath.", "breathlessness", /call 999/i],
    ["I am thinking about suicide.", "self-harm language", /NHS 111|mental-health/i],
    ["I don't want to be alive.", "self-harm language", /NHS 111|mental-health/i]
  ];

  for (const [freeText, ruleLabel, destination] of cases) {
    const plan = evaluateCheckIn(patient, buildBoundaryCheckIn({ freeText }));

    assert.equal(plan.riskLevel, "urgent", freeText);
    assert.ok(plan.ruleHits.includes(`red flag: ${ruleLabel}`), freeText);
    assert.match(`${plan.patientAction} ${plan.escalation.channel}`, destination, freeText);
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
      freeText: "I am not sure why I have chest pain now.",
      labels: ["chest pain"],
      destination: /call 999/i
    },
    {
      freeText: "I do not have chest pain, but I can’t breathe.",
      labels: ["breathlessness"],
      absentLabels: ["chest pain"],
      destination: /call 999/i
    },
    {
      freeText: "There is no improvement and chest pain remains.",
      labels: ["chest pain"],
      destination: /call 999/i
    },
    {
      freeText: "I am not without chest pain.",
      labels: ["chest pain"],
      destination: /call 999/i
    },
    {
      freeText: "I want to kill myself.",
      labels: ["immediate self-harm language"],
      destination: /call 999|go to A&E/i
    },
    {
      freeText: "I can't keep myself safe.",
      labels: ["immediate self-harm language"],
      destination: /call 999|go to A&E/i
    },
    {
      freeText: "I don’t feel able to keep myself safe.",
      labels: ["immediate self-harm language"],
      destination: /call 999|go to A&E/i
    },
    {
      freeText: "I have a plan to harm myself.",
      labels: ["immediate self-harm language"],
      destination: /call 999|go to A&E/i
    },
    {
      freeText: "I've taken an overdose.",
      labels: ["possible overdose or poisoning"],
      destination: /call 999|go to A&E/i
    },
    {
      freeText: "I took too much medication.",
      labels: ["possible overdose or poisoning"],
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

  for (const { freeText, labels, absentLabels = [], destination } of cases) {
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
    for (const label of absentLabels) {
      assert.ok(!plan.ruleHits.includes(`red flag: ${label}`), `unexpected ${label}: ${freeText}`);
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
    "I have no thoughts of suicide.",
    "I have not taken an overdose.",
    "I did not swallow anything harmful.",
    "I am not experiencing chest pain.",
    "I have never had chest pain.",
    "No current chest pain.",
    "I have no more chest pain.",
    "I am no longer vomiting.",
    "I don't have chest pain.",
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
