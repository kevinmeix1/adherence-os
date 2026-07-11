import type {
  AdherenceTwin,
  AgentTraceStep,
  CarePlan,
  CheckInInput,
  JudgeFit,
  Patient,
  RescuePlanDay,
  RiskLevel,
  UnsafeRequestDemo,
  WeeklySnapshot
} from "./types";

export const SAFETY_NOTICE =
  "This prototype does not diagnose, change medication, or replace clinical care. New, severe, or worrying symptoms should be reviewed by a qualified clinician, and emergency symptoms need urgent help.";

export const DEMO_CHECK_INS: Record<"normal" | "escalation", Omit<CheckInInput, "patientId" | "date">> = {
  normal: {
    scenario: "normal",
    medicationTaken: true,
    nauseaScore: 3,
    appetiteScore: 5,
    energyScore: 6,
    hydrationScore: 7,
    mood: "steady",
    sideEffects: "Mild nausea after lunch, manageable with smaller meals.",
    biomarkerNote: "Weight is down 0.4 kg this week. No unusual blood pressure reading.",
    freeText:
      "I nearly skipped my dose because work was hectic, but I took it after setting a reminder. I feel okay today."
  },
  escalation: {
    scenario: "escalation",
    medicationTaken: false,
    nauseaScore: 8,
    appetiteScore: 2,
    energyScore: 3,
    hydrationScore: 2,
    mood: "anxious",
    sideEffects: "Vomiting twice today and struggling to keep fluids down.",
    biomarkerNote: "Weight dropped 1.2 kg since last week. Resting heart rate is higher than usual.",
    freeText:
      "I missed two doses this week. My stomach pain is getting worse and I feel lightheaded when I stand."
  }
};

const redFlagPatterns = [
  { label: "chest pain", pattern: /\b(?:chest pain|tight chest|tightness (?:in|across) (?:my|the) chest|pressure (?:in|on) (?:my|the) chest)\b/i },
  { label: "breathlessness", pattern: /\b(?:short of breath|breathless|cannot breathe|can't breathe|difficulty breathing|struggling to breathe)\b/i },
  { label: "fainting or severe dizziness", pattern: /\b(?:fainted|fainting|feel(?:ing)? faint|felt faint|nearly fainted|almost fainted|passed out|black(?:ed|ing)? out|blackout|lightheaded|severely dizzy|severe dizziness)\b/i },
  { label: "severe abdominal pain", pattern: /\b(?:(?:severe|persistent|worsening) (?:stomach|abdominal|tummy) pain|(?:stomach|abdominal|tummy) pain (?:is )?(?:getting worse|worsening|won't go away|will not go away|radiat(?:es|ing) to (?:my|the) back))\b/i },
  { label: "unable to keep fluids down", pattern: /\b(?:(?:cannot|can't|couldn't|unable to|struggl(?:e|ing) to) keep (?:fluids|water|anything) down|vomit(?:ing|ed|s)?)\b/i },
  { label: "pregnancy concern", pattern: /\b(?:pregnant|positive pregnancy test|missed (?:my )?period)\b/i },
  { label: "self-harm language", pattern: /\b(?:self[- ]harm|hurt(?:ing)? myself|suicidal|end my life)\b/i }
];

const unsafeMedicationPatterns = [
  /increase (my )?dose/i,
  /double (my )?dose/i,
  /skip (the )?dose/i,
  /stop taking/i,
  /change (my )?medication/i,
  /diagnos/i
];

export function getPatientInsights(patient: Patient) {
  const weekly = patient.weeklyData;
  const first = weekly[0];
  const latest = weekly[weekly.length - 1];
  const previous = weekly[weekly.length - 2] ?? latest;
  const lastTwo = weekly.slice(-2);
  const adherenceAvg =
    weekly.reduce((sum, week) => sum + week.adherencePct, 0) / Math.max(weekly.length, 1);
  const missedDoses = weekly.reduce(
    (sum, week) => sum + Math.max(week.dosesExpected - week.dosesTaken, 0),
    0
  );
  const lastTwoAdherence =
    lastTwo.reduce((sum, week) => sum + week.adherencePct, 0) / Math.max(lastTwo.length, 1);
  const weightDelta = latest.weightKg - first.weightKg;
  const hba1cDelta =
    typeof latest.biomarkers?.hba1cPct === "number" && typeof first.biomarkers?.hba1cPct === "number"
      ? latest.biomarkers.hba1cPct - first.biomarkers.hba1cPct
      : undefined;

  return {
    latest,
    previous,
    adherenceAvg,
    missedDoses,
    lastTwoAdherence,
    weightDelta,
    hba1cDelta,
    adherenceDip: latest.adherencePct - previous.adherencePct,
    nauseaTrend: latest.nauseaScore - previous.nauseaScore
  };
}

export function evaluateCheckIn(patient: Patient, input: CheckInInput): CarePlan {
  const insights = getPatientInsights(patient);
  const text = `${input.sideEffects} ${input.biomarkerNote} ${input.freeText}`;
  const redFlags = redFlagPatterns
    .filter((flag) => hasNonNegatedMatch(text, flag.pattern))
    .map((flag) => flag.label);
  const ruleHits: string[] = [];

  if (!input.medicationTaken) ruleHits.push("missed medication check-in");
  if (input.nauseaScore >= 7) ruleHits.push("high nausea burden");
  if (input.hydrationScore <= 2) ruleHits.push("possible dehydration risk");
  if (input.energyScore <= 3) ruleHits.push("low energy");
  if (insights.lastTwoAdherence < 85) ruleHits.push("two-week adherence below target");
  if (insights.nauseaTrend >= 2) ruleHits.push("nausea rising versus last week");
  if (redFlags.length > 0) ruleHits.push(...redFlags.map((flag) => `red flag: ${flag}`));

  const riskLevel = chooseRiskLevel(input, insights.latest, redFlags, ruleHits);
  const escalation = buildEscalation(riskLevel, redFlags, input);
  const signals = buildSignals(patient, input, insights, redFlags);
  const clinicianSummary = buildClinicianSummary(patient, input, insights, riskLevel, redFlags);
  const clinicianDraft = buildClinicianDraft(patient, riskLevel, redFlags);

  return {
    riskLevel,
    headline: buildHeadline(riskLevel),
    patientAction: buildPatientAction(riskLevel, input, redFlags),
    explanation: buildExplanation(riskLevel, patient, input, insights, redFlags),
    safetyNotice: SAFETY_NOTICE,
    escalation,
    clinicianSummary,
    clinicianDraft,
    signals,
    confidence: redFlags.length > 0 ? 0.91 : riskLevel === "steady" ? 0.82 : 0.86,
    nextCheckInWindow: riskLevel === "steady" ? "Tomorrow morning" : riskLevel === "watch" ? "Tonight" : "Same day",
    ruleHits,
    agentTrace: buildAgentTrace(patient, input, insights, riskLevel, redFlags, ruleHits, clinicianSummary),
    judgeFit: buildJudgeFit(patient, riskLevel),
    adherenceTwin: buildAdherenceTwin(patient, input, insights, riskLevel, redFlags),
    rescuePlan: buildRescuePlan(patient, input, insights, riskLevel, redFlags),
    unsafeRequestDemo: buildUnsafeRequestDemo(patient)
  };
}

function hasNonNegatedMatch(text: string, pattern: RegExp) {
  const matcher = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
  let match = matcher.exec(text);

  while (match) {
    if (!isNegated(text, match.index)) return true;
    match = matcher.exec(text);
  }

  return false;
}

function isNegated(text: string, matchIndex: number) {
  const prefix = text.slice(Math.max(0, matchIndex - 100), matchIndex);
  const clause = prefix.split(/[.!?;\n]|\b(?:but|however|although)\b/i).at(-1) ?? prefix;
  return /\b(?:no|not|never|without|deny|denies|denied|negative for)\b(?:[\s,:-]+[\w'-]+){0,8}[\s,:-]*$/i.test(clause);
}

export function applySafetyOverrides(
  aiPlan: CarePlan,
  patient: Patient,
  input: CheckInInput
): CarePlan {
  const rulesPlan = evaluateCheckIn(patient, input);
  const containsUnsafeMedicationAdvice = unsafeMedicationPatterns.some((pattern) =>
    pattern.test(`${aiPlan.patientAction} ${aiPlan.clinicianDraft} ${aiPlan.explanation}`)
  );
  const rulesFoundUrgent = rulesPlan.riskLevel === "urgent";

  if (rulesFoundUrgent || containsUnsafeMedicationAdvice) {
    return {
      ...aiPlan,
      riskLevel: rulesFoundUrgent ? "urgent" : aiPlan.riskLevel,
      headline: rulesFoundUrgent ? rulesPlan.headline : aiPlan.headline,
      patientAction: rulesFoundUrgent || containsUnsafeMedicationAdvice ? rulesPlan.patientAction : aiPlan.patientAction,
      explanation: rulesFoundUrgent || containsUnsafeMedicationAdvice ? rulesPlan.explanation : aiPlan.explanation,
      safetyNotice: SAFETY_NOTICE,
      escalation: rulesFoundUrgent ? rulesPlan.escalation : aiPlan.escalation,
      clinicianSummary: rulesFoundUrgent ? rulesPlan.clinicianSummary : aiPlan.clinicianSummary,
      clinicianDraft: containsUnsafeMedicationAdvice ? rulesPlan.clinicianDraft : aiPlan.clinicianDraft,
      agentTrace: rulesPlan.agentTrace,
      judgeFit: rulesPlan.judgeFit,
      adherenceTwin: rulesPlan.adherenceTwin,
      rescuePlan: rulesPlan.rescuePlan,
      unsafeRequestDemo: rulesPlan.unsafeRequestDemo,
      ruleHits: [
        ...new Set([
          ...aiPlan.ruleHits,
          ...rulesPlan.ruleHits,
          containsUnsafeMedicationAdvice ? "guardrail removed unsafe medication or diagnosis language" : ""
        ].filter(Boolean))
      ]
    };
  }

  return {
    ...aiPlan,
    safetyNotice: SAFETY_NOTICE,
    agentTrace: aiPlan.agentTrace?.length ? aiPlan.agentTrace : rulesPlan.agentTrace,
    judgeFit: aiPlan.judgeFit ?? rulesPlan.judgeFit,
    adherenceTwin: aiPlan.adherenceTwin ?? rulesPlan.adherenceTwin,
    rescuePlan: aiPlan.rescuePlan?.length ? aiPlan.rescuePlan : rulesPlan.rescuePlan,
    unsafeRequestDemo: aiPlan.unsafeRequestDemo ?? rulesPlan.unsafeRequestDemo,
    ruleHits: [...new Set([...aiPlan.ruleHits, ...rulesPlan.ruleHits])]
  };
}

function chooseRiskLevel(
  input: CheckInInput,
  latest: WeeklySnapshot,
  redFlags: string[],
  ruleHits: string[]
): RiskLevel {
  if (redFlags.length > 0 || input.hydrationScore <= 1) return "urgent";
  if ((!input.medicationTaken && input.nauseaScore >= 6) || input.hydrationScore <= 2) return "review";
  if (latest.adherencePct < 85 || input.nauseaScore >= 5 || ruleHits.length >= 2) return "watch";
  return "steady";
}

function buildEscalation(riskLevel: RiskLevel, redFlags: string[], input: CheckInInput) {
  if (riskLevel === "urgent") {
    return {
      needed: true,
      urgency: "urgent" as const,
      reason:
        redFlags.length > 0
          ? `Red flag signal detected: ${redFlags.join(", ")}.`
          : "Hydration and symptom scores suggest urgent review.",
      channel: "Escalate to clinical team now; advise urgent help if symptoms feel severe."
    };
  }

  if (riskLevel === "review") {
    return {
      needed: true,
      urgency: "same_day" as const,
      reason: !input.medicationTaken
        ? "Missed medication plus high side-effect burden."
        : "Side-effect burden may affect adherence.",
      channel: "Create same-day async clinician review."
    };
  }

  if (riskLevel === "watch") {
    return {
      needed: true,
      urgency: "routine_async" as const,
      reason: "Early adherence or side-effect pattern is forming.",
      channel: "Queue for care-team review if repeated tomorrow."
    };
  }

  return {
    needed: false,
    urgency: "none" as const,
    reason: "No escalation threshold crossed today.",
    channel: "Continue normal daily check-ins."
  };
}

function buildHeadline(riskLevel: RiskLevel) {
  if (riskLevel === "urgent") return "Same-day clinical attention needed";
  if (riskLevel === "review") return "Care-team review recommended today";
  if (riskLevel === "watch") return "A small adherence risk is forming";
  return "On track today";
}

function buildPatientAction(riskLevel: RiskLevel, input: CheckInInput, redFlags: string[]) {
  if (riskLevel === "urgent") {
    return redFlags.length > 0
      ? "Stop self-troubleshooting and contact the clinical team now. If symptoms are severe, worsening, or you cannot keep fluids down, seek urgent medical help."
      : "Contact the clinical team today and focus on fluids if tolerated. Do not change medication without clinician guidance.";
  }

  if (riskLevel === "review") {
    return "Send this check-in to the care team for same-day review. Keep meals small and simple, sip fluids, and avoid changing medication unless a clinician tells you to.";
  }

  if (riskLevel === "watch") {
    return input.medicationTaken
      ? "Keep the plan steady today. Pair tomorrow's dose reminder with a meal cue and log nausea again tonight."
      : "Log the missed dose and send an async update. Use a reminder cue tomorrow and wait for clinician guidance before making medication changes.";
  }

  return "Keep today's routine. Repeat the same reminder tomorrow and log any side effects before they become a pattern.";
}

function buildExplanation(
  riskLevel: RiskLevel,
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  redFlags: string[]
) {
  if (riskLevel === "urgent") {
    return `The check-in mentions ${redFlags.join(", ") || "a high symptom burden"}, while ${patient.name.split(" ")[0]}'s recent programme data shows ${Math.round(
      insights.lastTwoAdherence
    )}% adherence over the last two weeks. The safest next step is clinical escalation rather than coaching.`;
  }

  if (riskLevel === "review") {
    return `Side effects are high enough to threaten adherence. The model is prioritising a clinician review because ${input.medicationTaken ? "symptoms are rising" : "a dose was missed"} and hydration is ${input.hydrationScore}/10.`;
  }

  if (riskLevel === "watch") {
    return `The patient is not in crisis, but the combination of ${Math.round(
      insights.lastTwoAdherence
    )}% recent adherence, nausea ${input.nauseaScore}/10, and today's note suggests a preventable dropout risk.`;
  }

  return `${patient.name.split(" ")[0]}'s check-in is consistent with the current programme trend: adherence is ${Math.round(
    insights.adherenceAvg
  )}% and symptoms are manageable today.`;
}

function buildClinicianSummary(
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  riskLevel: RiskLevel,
  redFlags: string[]
) {
  const hba1c = typeof insights.hba1cDelta === "number" ? ` HbA1c change: ${insights.hba1cDelta.toFixed(1)} pts.` : "";
  return `${patient.name}, week ${patient.currentWeek}, ${patient.conditionFocus}. Risk: ${riskLevel}. Recent adherence ${Math.round(
    insights.lastTwoAdherence
  )}%, missed doses total ${insights.missedDoses}. Weight change ${insights.weightDelta.toFixed(1)} kg.${hba1c} Today: medication ${
    input.medicationTaken ? "taken" : "missed"
  }, nausea ${input.nauseaScore}/10, hydration ${input.hydrationScore}/10.${
    redFlags.length > 0 ? ` Red flags: ${redFlags.join(", ")}.` : ""
  }`;
}

function buildClinicianDraft(patient: Patient, riskLevel: RiskLevel, redFlags: string[]) {
  const firstName = patient.name.split(" ")[0];

  if (riskLevel === "urgent") {
    return `Hi ${firstName}, thanks for logging this. Some of what you described needs clinical review now${
      redFlags.length > 0 ? ` (${redFlags.join(", ")})` : ""
    }. Please contact the care team now, and seek urgent help if symptoms are severe or worsening.`;
  }

  if (riskLevel === "review") {
    return `Hi ${firstName}, thanks for the detail. Your side effects may be getting in the way of the programme, so I have sent this to the clinical team for review today. Please do not change your medication unless they advise it.`;
  }

  if (riskLevel === "watch") {
    return `Hi ${firstName}, this looks manageable today, but we can see an early adherence pattern. Please check in again tonight so the team can spot whether this is settling or building.`;
  }

  return `Hi ${firstName}, today's check-in looks steady. Keep your current routine and log again tomorrow so we can keep tracking the trend.`;
}

function buildSignals(
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  redFlags: string[]
) {
  const signals = [
    `${Math.round(insights.adherenceAvg)}% average adherence over 8 weeks`,
    `${insights.weightDelta.toFixed(1)} kg weight change since baseline`,
    `Today nausea ${input.nauseaScore}/10 and hydration ${input.hydrationScore}/10`,
    `${patient.currentWeek} weeks in programme`
  ];

  if (typeof insights.hba1cDelta === "number") {
    signals.push(`HbA1c ${insights.hba1cDelta.toFixed(1)} point change`);
  }

  if (redFlags.length > 0) {
    signals.unshift(`Red flag signal: ${redFlags.join(", ")}`);
  }

  return signals;
}

function buildAgentTrace(
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  riskLevel: RiskLevel,
  redFlags: string[],
  ruleHits: string[],
  clinicianSummary: string
): AgentTraceStep[] {
  const firstName = patient.name.split(" ")[0];
  const redFlagSummary = redFlags.length > 0 ? redFlags.join(", ") : "none";
  const coachingMode = riskLevel === "steady" || riskLevel === "watch" ? "coaching allowed" : "clinical review mode";

  return [
    {
      id: "intake",
      label: "Intake Agent",
      role: "turns messy home language into structured care signals",
      status: "complete",
      summary: `${firstName}'s check-in was parsed into medication, symptom, biomarker and mood fields.`,
      evidence: [
        `Medication ${input.medicationTaken ? "taken" : "missed"}`,
        `Nausea ${input.nauseaScore}/10`,
        `Hydration ${input.hydrationScore}/10`
      ]
    },
    {
      id: "trend",
      label: "Trend Tool",
      role: "calculates longitudinal change without model guesswork",
      status: "complete",
      summary: `The deterministic trend layer compared today against ${patient.currentWeek} weeks of programme data.`,
      evidence: [
        `${Math.round(insights.lastTwoAdherence)}% adherence over the last two weeks`,
        `${insights.weightDelta.toFixed(1)} kg since baseline`,
        `${insights.nauseaTrend >= 0 ? "+" : ""}${insights.nauseaTrend} nausea trend`
      ]
    },
    {
      id: "risk",
      label: "Risk Agent",
      role: "chooses coaching, watch, review or urgent mode",
      status: riskLevel === "urgent" || riskLevel === "review" ? "escalated" : "complete",
      summary: `Risk mode set to ${riskLevel} using red flags, adherence and symptom burden.`,
      evidence: [
        `Red flags: ${redFlagSummary}`,
        ruleHits.length > 0 ? ruleHits.slice(0, 3).join("; ") : "No rule threshold crossed"
      ]
    },
    {
      id: "guardrail",
      label: "Safety Guardrail",
      role: "blocks diagnosis and medication-change advice",
      status: riskLevel === "urgent" || redFlags.length > 0 ? "guarded" : "complete",
      summary: `Safety layer selected ${coachingMode} and preserved clinician oversight.`,
      evidence: [
        "No diagnosis",
        "No dose changes",
        riskLevel === "urgent" ? "Urgent language escalated" : "Patient action stayed behavioural"
      ]
    },
    {
      id: "handoff",
      label: "Clinician Briefing Agent",
      role: "compresses the case into an async review packet",
      status: riskLevel === "urgent" || riskLevel === "review" ? "escalated" : "complete",
      summary: "Generated a concise clinical handoff with patient trend, current risk and suggested channel.",
      evidence: [clinicianSummary]
    }
  ];
}

function buildJudgeFit(patient: Patient, riskLevel: RiskLevel): JudgeFit {
  const firstName = patient.name.split(" ")[0];
  const impact =
    riskLevel === "urgent"
      ? `${firstName} is moved out of self-coaching and into clinical review before a risky at-home pattern gets missed.`
      : `${firstName} gets one small next action that protects adherence without needing another appointment.`;

  return {
    userImpact: impact,
    innovation:
      "The product is an agentic care workflow: intake, trend calculation, risk mode, guardrail and clinician handoff work together instead of a single chatbot response.",
    feasibility:
      "The prototype keeps deterministic rules for safety-critical thresholds, uses structured outputs for the UI and leaves clinical decisions with the care team.",
    demoQuality:
      "The normal and escalation scenarios show a clear mode switch from supportive coaching to clinician escalation in one live walkthrough."
  };
}

function buildAdherenceTwin(
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  riskLevel: RiskLevel,
  redFlags: string[]
): AdherenceTwin {
  const firstName = patient.name.split(" ")[0];
  const hasTravel = patient.riskFactors.some((factor) => /travel/i.test(factor));
  const hasShiftWork = patient.riskFactors.some((factor) => /shift/i.test(factor));
  const hasCycleContext = patient.conditionFocus.toLowerCase().includes("pcos");
  const sideEffectImpact = input.nauseaScore >= 7 ? "high" : input.nauseaScore >= 5 ? "medium" : "low";
  const routineImpact = !input.medicationTaken || insights.lastTwoAdherence < 90 ? "high" : "medium";
  const hydrationImpact = input.hydrationScore <= 2 ? "high" : input.hydrationScore <= 5 ? "medium" : "low";

  const riskDrivers: AdherenceTwin["riskDrivers"] = [
    {
      label: "Side-effect spiral",
      impact: sideEffectImpact,
      evidence: `Nausea is ${input.nauseaScore}/10 today and ${insights.nauseaTrend >= 0 ? "up" : "down"} versus last week.`,
      rescueMove:
        riskLevel === "urgent"
          ? "Switch from coaching to clinical review because symptoms may be unsafe."
          : "Use small-meal and hydration prompts before the next dose reminder."
    },
    {
      label: hasTravel ? "Travel disruption" : hasShiftWork ? "Shift-work disruption" : hasCycleContext ? "Cycle-linked friction" : "Routine drift",
      impact: routineImpact,
      evidence: `${Math.round(insights.lastTwoAdherence)}% adherence over the last two weeks; ${insights.missedDoses} total missed dose or habit events.`,
      rescueMove: hasCycleContext
        ? "Use cycle-aware check-ins and avoid weight-only feedback during fatigue windows."
        : hasTravel
          ? "Move reminders to the travel packing moment and evening hotel routine."
          : "Anchor the reminder to the meal or work transition most likely to happen."
    },
    {
      label: "Hydration and energy drag",
      impact: hydrationImpact,
      evidence: `Hydration is ${input.hydrationScore}/10 and energy is ${input.energyScore}/10 today.`,
      rescueMove:
        input.hydrationScore <= 2
          ? "Escalate if poor fluid intake continues or lightheadedness appears."
          : "Prompt fluids early in the day before symptoms make adherence feel harder."
    }
  ];

  const predictedFailurePoint =
    redFlags.length > 0
      ? "Today: symptoms have crossed from adherence support into clinical safety review."
      : input.nauseaScore >= 5
        ? "Next 48 hours: nausea may create dose anxiety or skipped meals."
        : !input.medicationTaken || insights.lastTwoAdherence < 90
          ? "Next dose window: routine disruption is the most likely adherence break."
          : "Next busy day: the main risk is small friction accumulating before it is visible.";

  return {
    summary: `${firstName}'s twin models the personal path from daily friction to dropout risk, then picks the smallest safe rescue move.`,
    predictedFailurePoint,
    confidence: riskLevel === "urgent" ? 0.91 : 0.84,
    riskDrivers,
    protectiveFactors: [
      `${Math.round(insights.adherenceAvg)}% average adherence across the programme`,
      `${insights.weightDelta.toFixed(1)} kg progress since baseline`,
      patient.preferredTone,
      patient.goals[0]
    ]
  };
}

function buildRescuePlan(
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  riskLevel: RiskLevel,
  redFlags: string[]
): RescuePlanDay[] {
  const firstName = patient.name.split(" ")[0];
  const reviewTrigger =
    riskLevel === "urgent"
      ? "Clinical team reviews now; urgent help if symptoms are severe or worsening."
      : "Escalate if nausea rises, hydration drops, or another dose is missed.";
  const routineAnchor = patient.riskFactors.some((factor) => /travel/i.test(factor))
    ? "travel packing routine"
    : patient.riskFactors.some((factor) => /shift/i.test(factor))
      ? "shift handover"
      : patient.conditionFocus.toLowerCase().includes("pcos")
        ? "cycle-aware evening check-in"
        : "breakfast or first drink";

  if (redFlags.length > 0 || riskLevel === "urgent") {
    return [
      {
        day: 1,
        label: "Safety handoff",
        patientMicroAction: "Contact the care team now and stop trying to self-adjust the programme.",
        monitoringSignal: `Red flags detected: ${redFlags.join(", ") || "urgent symptom burden"}.`,
        clinicianTrigger: reviewTrigger
      },
      {
        day: 2,
        label: "Stabilise",
        patientMicroAction: "Log whether fluids, dizziness and stomach pain are improving.",
        monitoringSignal: `Hydration ${input.hydrationScore}/10, nausea ${input.nauseaScore}/10.`,
        clinicianTrigger: "Same-day follow-up if symptoms persist or worsen."
      },
      {
        day: 3,
        label: "Rebuild routine",
        patientMicroAction: `Restart only clinician-approved routine steps and pair check-in with ${routineAnchor}.`,
        monitoringSignal: `${Math.round(insights.lastTwoAdherence)}% recent adherence.`,
        clinicianTrigger: "Clinician confirms whether the normal coaching pathway is safe."
      },
      {
        day: 4,
        label: "Food and fluids",
        patientMicroAction: "Use the smallest tolerable meal and fluid cue before logging symptoms.",
        monitoringSignal: "Appetite, hydration and nausea scores.",
        clinicianTrigger: "Review if appetite stays below 3/10."
      },
      {
        day: 5,
        label: "Confidence check",
        patientMicroAction: `Tell the app what would make ${firstName} hesitate before the next dose window.`,
        monitoringSignal: "Free-text anxiety or avoidance language.",
        clinicianTrigger: "Care team message if avoidance language appears."
      },
      {
        day: 6,
        label: "Progress story",
        patientMicroAction: "Review one non-scale win and one biomarker or adherence trend.",
        monitoringSignal: `${insights.weightDelta.toFixed(1)} kg trend and programme adherence.`,
        clinicianTrigger: "No trigger unless symptoms return."
      },
      {
        day: 7,
        label: "Next-week prevention",
        patientMicroAction: `Choose one reminder tied to ${routineAnchor} for the next week.`,
        monitoringSignal: "Reminder completion and check-in consistency.",
        clinicianTrigger: "Routine async review if adherence falls below 85%."
      }
    ];
  }

  return [
    {
      day: 1,
      label: "Friction capture",
      patientMicroAction: "Log the one thing most likely to make tomorrow's check-in or dose harder.",
      monitoringSignal: `Nausea ${input.nauseaScore}/10, hydration ${input.hydrationScore}/10.`,
      clinicianTrigger: reviewTrigger
    },
    {
      day: 2,
      label: "Reminder anchor",
      patientMicroAction: `Attach the programme reminder to ${routineAnchor}.`,
      monitoringSignal: "Medication taken and check-in completed.",
      clinicianTrigger: "Escalate if a dose is missed."
    },
    {
      day: 3,
      label: "Side-effect prevention",
      patientMicroAction: "Use a smaller meal cue before the usual nausea window.",
      monitoringSignal: "Nausea and appetite scores.",
      clinicianTrigger: "Review if nausea reaches 7/10."
    },
    {
      day: 4,
      label: "Hydration nudge",
      patientMicroAction: "Complete one fluid cue before midday and log energy.",
      monitoringSignal: "Hydration and energy scores.",
      clinicianTrigger: "Review if hydration is 2/10 or lower."
    },
    {
      day: 5,
      label: "Motivation reset",
      patientMicroAction: "Show the patient one trend that is improving and one thing to keep steady.",
      monitoringSignal: `${insights.weightDelta.toFixed(1)} kg weight trend and ${Math.round(insights.adherenceAvg)}% adherence.`,
      clinicianTrigger: "No trigger unless mood drops for two check-ins."
    },
    {
      day: 6,
      label: "Dropout forecast",
      patientMicroAction: "Ask whether tomorrow feels easy, uncertain or at risk.",
      monitoringSignal: "Self-rated confidence and free-text hesitation.",
      clinicianTrigger: "Queue async care message if confidence is low."
    },
    {
      day: 7,
      label: "Loop close",
      patientMicroAction: "Compare the week to the twin's predicted failure point and update the plan.",
      monitoringSignal: "Adherence, symptoms and trigger match.",
      clinicianTrigger: "Review if the same trigger repeats twice."
    }
  ];
}

function buildUnsafeRequestDemo(patient: Patient): UnsafeRequestDemo {
  const firstName = patient.name.split(" ")[0];

  return {
    request: "I missed my dose. Should I double the next one or stop taking it until I feel better?",
    blocked: true,
    patientResponse: `${firstName}, I cannot advise doubling, stopping or changing medication. I can send this to the clinical team and help you log what happened so they can review it safely.`,
    clinicianNote: `${patient.name} asked for medication-change advice after a missed dose. The assistant blocked dose guidance and routed to clinician review.`,
    guardrails: [
      "Medication-change advice blocked",
      "No diagnosis or dose instruction",
      "Async clinician review created",
      "Patient receives safe logging guidance only"
    ]
  };
}
