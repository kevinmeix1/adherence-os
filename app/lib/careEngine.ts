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
import { SAFETY_FLAG_RULE_LABELS } from "./safetyFlags";

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
    safetyFlags: [],
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
    safetyFlags: [
      "faint-or-severe-dizziness",
      "severe-abdominal-pain",
      "unable-to-keep-fluids-down"
    ],
    sideEffects: "Vomiting twice today and struggling to keep fluids down.",
    biomarkerNote: "Weight dropped 1.2 kg since last week. Resting heart rate is higher than usual.",
    freeText:
      "I missed two doses this week. My stomach pain is getting worse and I feel lightheaded when I stand."
  }
};

type RedFlagPattern = {
  label: string;
  pattern: RegExp;
  ignoreResolvedHistory?: boolean;
};

type UrgentRoute = {
  headline: string;
  reason: string;
  channel: string;
  patientAction: string;
};

const redFlagPatterns: RedFlagPattern[] = [
  { label: "chest pain", pattern: /\b(?:chest pain|chest discomfort|crushing chest discomfort|tight chest|tightness (?:in|across) (?:my|the) chest|pressure (?:in|on) (?:my|the) chest)\b/i },
  { label: "breathlessness", pattern: /\b(?:short of breath|breathless|cannot breathe|can't breathe|cannot catch my breath|can't catch my breath|difficulty breathing|struggling to breathe)\b/i },
  { label: "fainting or severe dizziness", pattern: /\b(?:fainted|fainting|feel(?:ing)? faint|felt faint|nearly fainted|almost fainted|passed out|black(?:ed|ing)? out|blackout|lightheaded|severely dizzy|severe dizziness)\b/i },
  { label: "severe abdominal pain", pattern: /\b(?:(?:(?:severe|persistent|worsening|agonising|agonizing|unbearable|excruciating)\s+){1,2}(?:upper\s+)?(?:stomach|abdominal|belly|tummy)\s+pain|(?:upper\s+)?(?:stomach|abdominal|belly|tummy)\s+pain\s+(?:is\s+)?(?:getting worse|worsening|won't go away|will not go away|unbearable|agonising|agonizing|excruciating)|(?:upper\s+)?(?:stomach|abdominal|belly|tummy)\s+pain(?:\s+(?:that|which))?\s+(?:spreads?|spread|spreading|radiat(?:es|ed|ing))\s+(?:into|to)\s+(?:(?:my|the)\s+)?back|(?:upper\s+)?(?:stomach|abdomen|belly|tummy)\s+(?:hurt|hurts|is hurting)\s+(?:severely|unbearably|agonisingly|agonizingly|excruciatingly|(?:so\s+)?badly))\b/i },
  { label: "unable to keep fluids down", pattern: /\b(?:(?:(?:have|has|had)\s+not|haven't|hasn't|hadn't)\s+been\s+able\s+to\s+keep\s+(?:fluids?|water|anything|drinks?|sips?)\s+down|(?:cannot|can't|couldn't|unable to|struggl(?:e|ing) to)\s+keep\s+(?:fluids?|water|anything|drinks?|sips?)\s+down|(?:cannot|can't|couldn't|unable to|struggl(?:e|ing) to)\s+drink(?:\s+(?:anything|(?:any\s+)?(?:fluids?|water)))?(?=\s*(?:[,.!?;]|$|\b(?:and|because|without)\b))|(?:(?:every|each|any)\s+(?:sip|drink)|(?:even\s+(?:a|one|tiny)\s+)?sips?|(?:all\s+)?(?:fluids?|water))\s+(?:comes?|come|came|is coming|are coming)\s+(?:(?:straight|right)\s+)?back\s+up|vomit(?:ing|ed|s)?|throw(?:ing|s|threw|thrown)\s+up|being\s+sick)\b/i, ignoreResolvedHistory: true },
  {
    label: "possible overdose or poisoning",
    pattern: /\b(?:overdos(?:ed|ing)|(?:took|taken|swallowed)\s+(?:an?\s+)?overdose|(?:took|taken|swallowed)\s+too\s+(?:much|many)\s+(?:medicine|medication|tablets?|pills?|doses?)|swallowed\s+(?:something|a\s+substance)\s+(?:harmful|poisonous))\b/i
  },
  { label: "pregnancy concern", pattern: /\b(?:pregnant|positive pregnancy test|missed (?:my )?period)\b/i },
  {
    label: "immediate self-harm language",
    pattern: /\b(?:kill myself|end my life|want to die|(?:have|has|had)\s+(?:made\s+)?(?:a\s+)?plan\s+to\s+(?:kill|harm|hurt)\s+myself|(?:(?:cannot|can't|unable to)|(?:do not|don't) feel (?:able to|(?:that )?i can)|(?:will not|won't) be able to)\s+keep myself safe)\b/i
  },
  { label: "self-harm language", pattern: /\b(?:self[- ]harm|hurt(?:ing)? myself|suicidal|(?:thinking|thoughts?)\s+(?:about|of)\s+suicide|suicide\s+thoughts?|(?:do not|don't) want to be alive)\b/i }
];

const unsafeGeneratedTextPatterns = [
  /\b(?:increase|raise|reduce|lower|double|halve|skip|change)\s+(?:(?:my|your|the|their|his|her)\s+)?(?:next\s+)?dose\b/i,
  /\btwice\s+as\s+much\b/i,
  /\bstop\s+taking\b/i,
  /\brestart\s+(?:(?:my|your|the|their|his|her)\s+)?medication\b/i,
  /\bchange\s+(?:(?:my|your|the|their|his|her)\s+)?medication\b/i,
  /\bdiagnos(?:e|ed|es|ing|is)\b/i,
  /\b(?:you\s+(?:have|likely have|probably have)|this\s+(?:is|sounds like)|your symptoms\s+(?:mean|show))\s+(?:acute\s+)?pancreatitis\b/i
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
  const text = [input.sideEffects, input.biomarkerNote, input.freeText].join("\n");
  const structuredRedFlags = input.safetyFlags.map((flag) => SAFETY_FLAG_RULE_LABELS[flag]);
  const phraseRedFlags = redFlagPatterns
    .filter((flag) => hasNonNegatedMatch(text, flag.pattern, flag.ignoreResolvedHistory))
    .map((flag) => flag.label);
  const redFlags = [...new Set([...structuredRedFlags, ...phraseRedFlags])];
  const ruleHits: string[] = [];

  if (!input.medicationTaken) ruleHits.push("missed medication check-in");
  if (input.nauseaScore >= 7) ruleHits.push("high nausea burden");
  if (input.hydrationScore <= 2) ruleHits.push("possible dehydration risk");
  if (input.energyScore <= 3) ruleHits.push("low energy");
  if (insights.lastTwoAdherence < 85) ruleHits.push("two-week adherence below target");
  if (insights.nauseaTrend >= 2) ruleHits.push("nausea rising versus last week");
  if (redFlags.length > 0) ruleHits.push(...redFlags.map((flag) => `red flag: ${flag}`));

  const riskLevel = chooseRiskLevel(input, insights.latest, redFlags, ruleHits);
  const urgentRoute = buildUrgentRoute(redFlags);
  const escalation = buildEscalation(riskLevel, input, urgentRoute);
  const signals = buildSignals(patient, input, insights, redFlags);
  const clinicianSummary = buildClinicianSummary(patient, input, insights, riskLevel, redFlags);
  const clinicianDraft = buildClinicianDraft(patient, riskLevel, redFlags, urgentRoute);

  return {
    riskLevel,
    headline: buildHeadline(riskLevel, urgentRoute),
    patientAction: buildPatientAction(riskLevel, input, urgentRoute),
    explanation: buildExplanation(riskLevel, patient, input, insights, redFlags, urgentRoute),
    safetyNotice: SAFETY_NOTICE,
    escalation,
    clinicianSummary,
    clinicianDraft,
    signals,
    nextCheckInWindow: riskLevel === "urgent" ? "Now" : riskLevel === "steady" ? "Tomorrow morning" : riskLevel === "watch" ? "Tonight" : "Same day",
    ruleHits,
    agentTrace: buildAgentTrace(patient, input, insights, riskLevel, redFlags, ruleHits, clinicianSummary),
    judgeFit: buildJudgeFit(patient, riskLevel),
    adherenceTwin: buildAdherenceTwin(patient, input, insights, riskLevel, redFlags),
    rescuePlan: buildRescuePlan(patient, input, insights, riskLevel, redFlags, urgentRoute),
    unsafeRequestDemo: buildUnsafeRequestDemo(patient)
  };
}

function hasNonNegatedMatch(text: string, pattern: RegExp, ignoreResolvedHistory = false) {
  const normalizedText = normalizeSafetyText(text);
  const matcher = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
  let match = matcher.exec(normalizedText);

  while (match) {
    if (
      !isNegated(normalizedText, match.index) &&
      !(ignoreResolvedHistory && isResolvedHistoricalMatch(normalizedText, match.index, match[0].length))
    ) {
      return true;
    }
    match = matcher.exec(normalizedText);
  }

  return false;
}

function normalizeSafetyText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-");
}

function isNegated(text: string, matchIndex: number) {
  const prefix = text.slice(Math.max(0, matchIndex - 100), matchIndex);
  const clause = prefix.split(/[.!?;\n]|\b(?:but|however|although)\b/i).at(-1) ?? prefix;
  const negationScope = clause
    .replace(/\bno\s+(?:idea|clue)\b/gi, "uncertain")
    .replace(/\bnot\s+(?:sure|certain)\b/gi, "uncertain")
    .replace(/\b(?:do not|don't)\s+know\b/gi, "uncertain")
    .replace(/\bnot\s+(?:without|negative for)\b/gi, "present")
    .replace(/\b(?:do not|don't|does not|doesn't|did not|didn't)\s+den(?:y|ies|ied)\b/gi, "present");
  const directDenials = [
    /\bno\s+(?:(?:any|new|current|ongoing|active|recent|further|more)\s+)*(?:(?:thoughts?|signs?|symptoms?|evidence)\s+of\s+)?$/i,
    /\b(?:without|negative for)\s+(?:any\s+)?$/i,
    /\bden(?:y|ies|ied)\s+(?:(?:having|experiencing|feeling|reporting)\s+)?(?:any\s+)?$/i,
    /\b(?:do not|don't|does not|doesn't|did not|didn't)\s+(?:(?:currently|now|still)\s+)?(?:(?:have|feel|experience|report|notice)\s+(?:any\s+)?)?$/i,
    /\b(?:am|is|are|was|were)\s+(?:not|never)\s+(?:(?:currently|now|still|really)\s+)?(?:(?:having|experiencing|feeling|reporting)\s+)?(?:any\s+)?$/i,
    /\b(?:(?:have|has|had)\s+(?:not|never)|haven't|hasn't|hadn't)\s+(?:(?:currently|recently|ever|still)\s+)?(?:(?:had|felt|experienced|reported|noticed|been(?:\s+(?:having|feeling|experiencing|reporting))?)\s+)?(?:any\s+)?$/i,
    /\bno longer\s+(?:(?:have|having|experience|experiencing|feel|feeling|report|reporting)\s+(?:any\s+)?)?$/i,
    /\bno\s+(?:(?:chest|stomach|abdominal|belly|tummy)\s+(?:pain|pressure|tightness)|tight chest|shortness of breath|breathlessness|nausea|vomiting|throwing up|dizziness|fainting|self[- ]harm)\s+(?:or|and)\s+$/i
  ];

  return directDenials.some((pattern) => pattern.test(negationScope));
}

function isResolvedHistoricalMatch(text: string, matchIndex: number, matchLength: number) {
  const prefix = text.slice(0, matchIndex);
  const sentenceStart = Math.max(
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("?"),
    prefix.lastIndexOf("\n")
  ) + 1;
  const afterMatch = text.slice(matchIndex + matchLength);
  const boundaryOffset = afterMatch.search(/[.!?\n]/);
  const sentenceEnd = boundaryOffset === -1
    ? text.length
    : matchIndex + matchLength + boundaryOffset;
  const sentenceRemainder = text.slice(matchIndex + matchLength, sentenceEnd);
  const transition = sentenceRemainder.match(/\b(?:but|however)\b/i);

  if (!transition) return false;

  const transitionIndex = transition.index ?? 0;
  const symptomClause = text.slice(sentenceStart, matchIndex + matchLength) +
    sentenceRemainder.slice(0, transitionIndex);
  const resolutionClause = sentenceRemainder.slice(transitionIndex + transition[0].length);
  const isHistorical = /\b(?:earlier|previously|yesterday|last\s+(?:night|week|month)|\d+\s+days?\s+ago)\b/i.test(symptomClause);
  const isCurrent = /\b(?:today|currently|right now|still)\b/i.test(symptomClause);
  const isExplicitlyResolved = /^\s*[,\-:]?\s*(?:now\s+)?(?:(?:i\s+(?:am|was|feel)|i'm|it\s+(?:is|has)|(?:the\s+)?symptoms?\s+(?:are|have))\s+)?(?:fine|well|better|resolved|gone|settled)(?:\s+now)?\b/i.test(resolutionClause);

  return isHistorical && !isCurrent && isExplicitlyResolved;
}

export function applySafetyOverrides(
  aiPlan: CarePlan,
  patient: Patient,
  input: CheckInInput
): CarePlan {
  const rulesPlan = evaluateCheckIn(patient, input);
  const generatedText = [
    aiPlan.headline,
    aiPlan.patientAction,
    aiPlan.explanation,
    aiPlan.escalation.reason,
    aiPlan.escalation.channel,
    aiPlan.clinicianSummary,
    aiPlan.clinicianDraft,
    ...aiPlan.signals
  ].join("\n");
  const containsUnsafeGeneratedText = unsafeGeneratedTextPatterns.some((pattern) =>
    hasNonNegatedMatch(generatedText, pattern)
  );

  if (!containsUnsafeGeneratedText) return rulesPlan;

  return {
    ...rulesPlan,
    ruleHits: [
      ...rulesPlan.ruleHits,
      "guardrail removed unsafe medication or diagnosis language"
    ]
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

function buildUrgentRoute(redFlags: string[]): UrgentRoute {
  if (redFlags.includes("possible overdose or poisoning")) {
    return {
      headline: "Call 999 or go to A&E now",
      reason: "Possible overdose or poisoning needs emergency assessment; this prototype cannot assess what or how much was taken.",
      channel: "Emergency poisoning route: call 999 or go to A&E now. Do not drive yourself.",
      patientAction: "Call 999 now or go to A&E now because you may have taken too much medicine or swallowed something harmful. Do not drive yourself. Bring the medicine or packaging if possible."
    };
  }

  if (redFlags.includes("immediate self-harm language")) {
    return {
      headline: "Call 999 or go to A&E now",
      reason: "Immediate self-harm language indicates possible immediate danger, so coaching is suppressed.",
      channel: "Emergency mental-health route: call 999 or go to A&E now.",
      patientAction: "Call 999 now or go to A&E now because you may be in immediate danger. If possible, stay with a trusted person while you get help."
    };
  }

  if (
    redFlags.includes("chest pain") ||
    redFlags.includes("breathlessness") ||
    redFlags.includes("chest pain or breathing difficulty")
  ) {
    return {
      headline: "Call 999 now",
      reason: "Chest-pain or breathing language needs emergency assessment; this prototype cannot assess severity.",
      channel: "Emergency physical-health route: call 999 or go to A&E now. Do not drive yourself.",
      patientAction: "Call 999 now for chest pain or breathing difficulty. Do not drive yourself to A&E."
    };
  }

  if (
    redFlags.includes("severe abdominal pain") &&
    redFlags.includes("unable to keep fluids down")
  ) {
    return {
      headline: "Call NHS 111 now",
      reason: "Severe or persistent abdominal-pain language appears with vomiting or inability to keep fluids down.",
      channel: "Urgent physical-health route: call NHS 111 now. If the pain is sudden or so severe that it is hard to think or talk, call 999 or go to A&E now.",
      patientAction: "Call NHS 111 now for urgent assessment. If the pain is sudden or so severe that it is hard to think or talk, call 999 or go to A&E now."
    };
  }

  if (redFlags.includes("self-harm language")) {
    return {
      headline: "Call NHS 111 now",
      reason: "Self-harm language needs urgent mental-health support rather than in-app coaching.",
      channel: "Urgent mental-health route: call NHS 111 and select the mental-health option. If there is immediate danger, call 999 or go to A&E now.",
      patientAction: "Call NHS 111 now and select the mental-health option. If you might act now or cannot keep yourself safe, call 999 or go to A&E now."
    };
  }

  return {
    headline: "Call NHS 111 now",
    reason: redFlags.length > 0
      ? `Urgent symptom language detected: ${redFlags.join(", ")}.`
      : "The hydration score crossed the prototype's urgent boundary.",
    channel: "Urgent clinical route: call NHS 111 now; use 999 or A&E for immediate danger or severe symptoms.",
    patientAction: "Call NHS 111 now for urgent advice. If you are in immediate danger or symptoms are severe, call 999 or go to A&E."
  };
}

function buildEscalation(riskLevel: RiskLevel, input: CheckInInput, urgentRoute: UrgentRoute) {
  if (riskLevel === "urgent") {
    return {
      needed: true,
      urgency: "urgent" as const,
      reason: urgentRoute.reason,
      channel: urgentRoute.channel
    };
  }

  if (riskLevel === "review") {
    return {
      needed: true,
      urgency: "same_day" as const,
      reason: input.hydrationScore <= 2
        ? "Hydration is at the prototype's same-day review boundary."
        : "Missed medication plus nausea is at the prototype's same-day review boundary.",
      channel: "Same-day clinician-review draft prepared; pending manual review."
    };
  }

  if (riskLevel === "watch") {
    return {
      needed: false,
      urgency: "none" as const,
      reason: "A configured watch rule matched an adherence or symptom pattern.",
      channel: "No active handoff; re-evaluate configured rules at the next check-in."
    };
  }

  return {
    needed: false,
    urgency: "none" as const,
    reason: "No configured watch, same-day, or urgent rule matched this check-in.",
    channel: "No handoff triggered; continue normal daily check-ins."
  };
}

function buildHeadline(riskLevel: RiskLevel, urgentRoute: UrgentRoute) {
  if (riskLevel === "urgent") return urgentRoute.headline;
  if (riskLevel === "review") return "Same-day review rule matched";
  if (riskLevel === "watch") return "Monitor this adherence pattern";
  return "Coaching can continue";
}

function buildPatientAction(riskLevel: RiskLevel, input: CheckInInput, urgentRoute: UrgentRoute) {
  if (riskLevel === "urgent") {
    return urgentRoute.patientAction;
  }

  if (riskLevel === "review") {
    return "A same-day care-team review draft is pending manual review. Keep meals small and simple, sip fluids if tolerated, and avoid changing medication unless a clinician tells you to.";
  }

  if (riskLevel === "watch") {
    return input.medicationTaken
      ? "Keep the plan steady today. Pair the next planned-dose reminder with a meal cue and log nausea again tonight."
      : "Log the missed planned dose and set a cue for the next scheduled dose. The next check-in will be re-evaluated against configured rules; wait for clinician guidance before making medication changes.";
  }

  return "Keep today's routine. Add one fluid cue before midday tomorrow and log any side effects before they become a pattern.";
}

function buildExplanation(
  riskLevel: RiskLevel,
  patient: Patient,
  input: CheckInInput,
  insights: ReturnType<typeof getPatientInsights>,
  redFlags: string[],
  urgentRoute: UrgentRoute
) {
  if (riskLevel === "urgent") {
    return `${urgentRoute.patientAction} A deterministic urgent rule stopped coaching because the check-in matched: ${redFlags.join(", ") || "hydration at the urgent prototype boundary"}. This prototype cannot assess severity or contact services.`;
  }

  if (riskLevel === "review") {
    const reason = input.hydrationScore <= 2
      ? `hydration is ${input.hydrationScore}/10`
      : `medication was missed and nausea is ${input.nauseaScore}/10`;
    return `The prototype's same-day review rule matched because ${reason}. A clinician-review draft is available for manual review; no message has been sent. This is not a clinical assessment.`;
  }

  if (riskLevel === "watch") {
    return `A configured watch rule matched this check-in. Recent adherence is ${Math.round(
      insights.lastTwoAdherence
    )}% and nausea is ${input.nauseaScore}/10. No urgent or same-day rule matched, and no clinician handoff is active. This is not a clinical assessment.`;
  }

  return `${patient.name.split(" ")[0]}'s structured check-in records ${Math.round(
    insights.adherenceAvg
  )}% average adherence, nausea ${input.nauseaScore}/10, and hydration ${input.hydrationScore}/10. No configured watch, same-day, or urgent rule matched. This does not mean symptoms were assessed or found safe.`;
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
  )}%, missed weekly doses total ${insights.missedDoses}. Weight change ${insights.weightDelta.toFixed(1)} kg.${hba1c} Current check-in: planned dose ${
    input.medicationTaken ? "recorded" : "missed"
  }, nausea ${input.nauseaScore}/10, hydration ${input.hydrationScore}/10.${
    redFlags.length > 0 ? ` Red flags: ${redFlags.join(", ")}.` : ""
  }`;
}

function buildClinicianDraft(
  patient: Patient,
  riskLevel: RiskLevel,
  redFlags: string[],
  urgentRoute: UrgentRoute
) {
  const firstName = patient.name.split(" ")[0];

  if (riskLevel === "urgent") {
    return `Hi ${firstName}. ${urgentRoute.patientAction} This check-in matched the configured urgent rule${
      redFlags.length > 0 ? `: ${redFlags.join(", ")}` : " at the hydration boundary"
    }. Draft only; pending manual review. No clinician or service has been contacted.`;
  }

  if (riskLevel === "review") {
    return `Hi ${firstName}. A configured rule matched for same-day care-team review. Please do not change your medication unless a clinician advises it. Draft only; pending manual review. No clinician or service has been contacted.`;
  }

  if (riskLevel === "watch") {
    return `Hi ${firstName}. Today's check-in matched a configured watch rule. Please check in again tonight, and seek clinical help sooner for new, severe, or worrying symptoms. Draft only; pending manual review. No clinician or service has been contacted.`;
  }

  return `Hi ${firstName}. No configured watch or review rule matched today's check-in. Keep your current routine and log again tomorrow; seek clinical help for new, severe, or worrying symptoms. Draft only; pending manual review. No clinician or service has been contacted.`;
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
  const decisionMode = riskLevel === "steady" || riskLevel === "watch" ? "the coaching path" : "the review path";

  return [
    {
      id: "intake",
      label: "Check-in normaliser",
      role: "turns home language into structured care signals",
      status: "complete",
      summary: `${firstName}'s check-in was parsed into medication, symptom, biomarker and mood fields.`,
      evidence: [
        `Planned dose ${input.medicationTaken ? "recorded" : "missed"}`,
        `Nausea ${input.nauseaScore}/10`,
        `Hydration ${input.hydrationScore}/10`
      ]
    },
    {
      id: "trend",
      label: "Trend calculator",
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
      label: "Risk-mode rules",
      role: "applies coaching, watch, review or urgent thresholds",
      status: riskLevel === "urgent" || riskLevel === "review" ? "escalated" : "complete",
      summary: `Risk mode set to ${riskLevel} using configured rules over red flags, adherence and symptom fields.`,
      evidence: [
        `Red flags: ${redFlagSummary}`,
        ruleHits.length > 0 ? ruleHits.slice(0, 3).join("; ") : "No configured rule matched"
      ]
    },
    {
      id: "guardrail",
      label: "Safety boundary",
      role: "blocks diagnosis and medication-change advice",
      status: riskLevel === "urgent" || redFlags.length > 0 ? "guarded" : "complete",
      summary: `Safety rules selected ${decisionMode}; the prototype did not contact a clinician or change medication.`,
      evidence: [
        "No diagnosis",
        "No dose changes",
        riskLevel === "urgent" ? "Urgent language escalated" : "Patient action stayed behavioural"
      ]
    },
    {
      id: "handoff",
      label: "Handoff composer",
      role: "prepares a clinician-review draft from the current evidence",
      status: riskLevel === "urgent" || riskLevel === "review" ? "escalated" : "complete",
      summary:
        riskLevel === "urgent" || riskLevel === "review"
          ? "Prepared a concise clinical handoff draft; it remains pending manual review."
          : "Prepared a review-ready summary; no handoff is active.",
      evidence: [clinicianSummary]
    }
  ];
}

function buildJudgeFit(patient: Patient, riskLevel: RiskLevel): JudgeFit {
  const firstName = patient.name.split(" ")[0];
  const impact =
    riskLevel === "urgent"
      ? `${firstName} is kept out of self-coaching, shown an immediate safety route, and given a clinician-handoff draft that remains pending review.`
      : `${firstName} gets one bounded adherence action while clinical assessment remains outside the prototype.`;

  return {
    userImpact: impact,
    innovation:
      "The workflow combines deterministic intake, trend calculation, risk mode, guardrails and a pending clinician-handoff draft instead of relying on generated chat.",
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
  const urgentRescueMove = riskLevel === "urgent"
    ? "Follow the immediate safety action; coaching routes are suppressed."
    : undefined;

  const riskDrivers: AdherenceTwin["riskDrivers"] = [
    {
      label: "Side-effect spiral",
      impact: sideEffectImpact,
      evidence: `Nausea is ${input.nauseaScore}/10 today and ${insights.nauseaTrend >= 0 ? "up" : "down"} versus last week.`,
      rescueMove: urgentRescueMove ?? "Use small-meal and hydration prompts before the next dose reminder."
    },
    {
      label: hasTravel ? "Travel disruption" : hasShiftWork ? "Shift-work disruption" : hasCycleContext ? "Cycle-linked friction" : "Routine drift",
      impact: routineImpact,
      evidence: `${Math.round(insights.lastTwoAdherence)}% adherence over the last two weeks; ${insights.missedDoses} missed weekly dose${insights.missedDoses === 1 ? "" : "s"} across the programme.`,
      rescueMove: urgentRescueMove ?? (hasCycleContext
        ? "Use cycle-aware check-ins and avoid weight-only feedback during fatigue windows."
        : hasTravel
          ? "Move reminders to the travel packing moment and evening hotel routine."
          : "Anchor the reminder to the meal or work transition most likely to happen.")
    },
    {
      label: "Hydration and energy drag",
      impact: hydrationImpact,
      evidence: `Hydration is ${input.hydrationScore}/10 and energy is ${input.energyScore}/10 today.`,
      rescueMove: urgentRescueMove ?? (input.hydrationScore <= 2
          ? "Use the pending same-day review draft; new, severe, or worrying symptoms need clinical help sooner."
          : "Prompt fluids early in the day before symptoms make adherence feel harder.")
    }
  ];

  const predictedFailurePoint =
    redFlags.length > 0
      ? "Today: a configured urgent rule matched, so coaching is suppressed and clinical assessment remains outside the prototype."
      : input.nauseaScore >= 5
        ? "Next 48 hours: nausea may create dose anxiety or skipped meals."
        : !input.medicationTaken || insights.lastTwoAdherence < 90
          ? "Next dose window: routine disruption is the most likely adherence break."
          : "Next busy day: the main risk is small friction accumulating before it is visible.";

  return {
    summary: `${firstName}'s profile summarises the path from current friction to the next planned adherence event, then surfaces the smallest bounded support move.`,
    predictedFailurePoint,
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
  redFlags: string[],
  urgentRoute: UrgentRoute
): RescuePlanDay[] {
  if (riskLevel === "urgent") {
    return [
      {
        day: 1,
        label: "Immediate safety action",
        patientMicroAction: urgentRoute.patientAction,
        monitoringSignal: `Urgent rule active: ${redFlags.join(", ") || "hydration boundary"}.`,
        clinicianTrigger: "Clinical handoff draft prepared; pending manual review. The prototype does not contact services."
      }
    ];
  }

  const reviewTrigger = riskLevel === "review"
    ? "Same-day clinician-review draft remains pending manual review."
    : "Re-evaluate the configured rules after the next check-in; no handoff is active.";
  const routineAnchor = patient.riskFactors.some((factor) => /travel/i.test(factor))
    ? "travel packing routine"
    : patient.riskFactors.some((factor) => /shift/i.test(factor))
      ? "shift handover"
      : patient.conditionFocus.toLowerCase().includes("pcos")
        ? "cycle-aware evening check-in"
        : "breakfast or first drink";

  return [
    {
      day: 1,
      label: "Friction capture",
      patientMicroAction: "Log the one thing most likely to make the next check-in or scheduled dose harder.",
      monitoringSignal: `Nausea ${input.nauseaScore}/10, hydration ${input.hydrationScore}/10.`,
      clinicianTrigger: reviewTrigger
    },
    {
      day: 2,
      label: "Reminder anchor",
      patientMicroAction: `Attach the programme reminder to ${routineAnchor}.`,
      monitoringSignal: "Planned weekly dose status and check-in completion.",
      clinicianTrigger: "The same-day review rule requires a missed dose with nausea at 6/10 or higher."
    },
    {
      day: 3,
      label: "Side-effect prevention",
      patientMicroAction: "Use a smaller meal cue before the usual nausea window.",
      monitoringSignal: "Nausea and appetite scores.",
      clinicianTrigger: "Nausea alone can activate watch; it does not activate same-day review."
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
      clinicianTrigger: "No mood-only escalation rule is implemented in this prototype."
    },
    {
      day: 6,
      label: "Friction forecast",
      patientMicroAction: "Ask whether tomorrow feels easy, uncertain or at risk.",
      monitoringSignal: "Self-rated ease and free-text hesitation.",
      clinicianTrigger: "Re-evaluate configured rules at the next check-in; this rating alone does not create a handoff."
    },
    {
      day: 7,
      label: "Loop close",
      patientMicroAction: "Compare the week with the profile's likely friction point and update the plan.",
      monitoringSignal: "Adherence, symptoms and trigger match.",
      clinicianTrigger: "Repeated friction is context, not an implemented escalation rule."
    }
  ];
}

function buildUnsafeRequestDemo(patient: Patient): UnsafeRequestDemo {
  const firstName = patient.name.split(" ")[0];

  return {
    request: "I missed my dose. Should I double the next one or stop taking it until I feel better?",
    blocked: true,
    patientResponse: `${firstName}, I cannot advise doubling, stopping or changing medication. I can prepare a clinician-review draft and help you log what happened; the draft remains pending manual review.`,
    clinicianNote: `${patient.name} asked for medication-change advice after a missed planned dose. The system blocked dose guidance and prepared a clinician-review draft that remains pending manual review.`,
    guardrails: [
      "Medication-change advice blocked",
      "No diagnosis or dose instruction",
      "Clinician-review draft prepared",
      "Pending manual review; no message transport"
    ]
  };
}
