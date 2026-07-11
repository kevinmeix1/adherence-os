import { getPatientInsights } from "./careEngine";
import type { EdgeRiskResult, InterventionSimulation } from "./edgeModel";
import type { CarePlan, CheckInInput, Patient } from "./types";

export type KnowledgeGraphNodeType =
  | "patient"
  | "risk"
  | "symptom"
  | "routine"
  | "biomarker"
  | "intervention"
  | "safety"
  | "clinician"
  | "protective";

export type KnowledgeGraphStatus = "steady" | "watch" | "review" | "urgent" | "protective" | "action" | "neutral";

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  type: KnowledgeGraphNodeType;
  status: KnowledgeGraphStatus;
  weight: number;
  evidence: string;
};

export type KnowledgeGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  status: KnowledgeGraphStatus;
};

export type GraphCentrality = {
  nodeId: string;
  label: string;
  type: KnowledgeGraphNodeType;
  score: number;
};

export type RescuePathStep = {
  nodeId: string;
  label: string;
  summary: string;
};

export type GraphMlFeature = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  interpretation: string;
};

export type CohortPatternMatch = {
  patientId: string;
  name: string;
  similarity: number;
  sharedDrivers: string[];
  note: string;
};

export type GraphExplanationSource = "model" | "simulation" | "rule" | "context";

export type GraphNodeExplanation = {
  nodeId: string;
  source: GraphExplanationSource;
  contribution: number | null;
  contributionUnit: "log-odds" | "absolute-risk" | "none";
  direction: "raises risk" | "lowers risk" | "reduces risk" | "override" | "neutral";
  impactShare: number;
  featureNames: string[];
  featureLabels: string[];
  evidenceEdgeCount: number;
  summary: string;
};

export type GraphRouteAlternative = {
  rank: number;
  interventionNodeId: string;
  label: string;
  targetNodeId: string;
  targetLabel: string;
  absoluteReduction: number | null;
  newRisk: number | null;
  relativeStrength: number;
  status: "recommended" | "alternative" | "blocked-by-safety" | "not-ranked";
  rationale: string;
};

export type AdherenceKnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  centrality: GraphCentrality[];
  rescuePath: RescuePathStep[];
  mlFeatures: GraphMlFeature[];
  nodeExplanations: GraphNodeExplanation[];
  routeAlternatives: GraphRouteAlternative[];
  cohortMatches: CohortPatternMatch[];
  topDriver: GraphCentrality;
  pathMode: "coaching" | "escalation";
  summary: string;
};

export function buildAdherenceKnowledgeGraph({
  patient,
  checkIn,
  carePlan,
  edgeRisk,
  cohort
}: {
  patient: Patient;
  checkIn: CheckInInput;
  carePlan: CarePlan;
  edgeRisk: EdgeRiskResult;
  cohort: Patient[];
}): AdherenceKnowledgeGraph {
  const insights = getPatientInsights(patient);
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const riskStatus = carePlan.riskLevel;
  const hydrationRisk = clamp01((10 - checkIn.hydrationScore) / 10);
  const nauseaRisk = clamp01(checkIn.nauseaScore / 10);
  const appetiteRisk = clamp01((10 - checkIn.appetiteScore) / 10);
  const energyRisk = clamp01((10 - checkIn.energyScore) / 10);
  const routineRisk = clamp01(
    (Number(!checkIn.medicationTaken) * 0.36) +
      (insights.lastTwoAdherence < 90 ? 0.28 : 0) +
      (patient.riskFactors.some((factor) => /shift|travel/i.test(factor)) ? 0.18 : 0) +
      (/work|travel|busy|hectic|missed|forgot/i.test(`${checkIn.freeText} ${checkIn.sideEffects}`) ? 0.18 : 0)
  );
  const biomarkerRisk = clamp01(
    (Math.abs(insights.weightDelta) / patient.baseline.weightKg) * 3 +
      (patient.latestBiomarkers.restingHeartRate && patient.baseline.restingHeartRate
        ? Math.max(0, patient.latestBiomarkers.restingHeartRate - patient.baseline.restingHeartRate) / 25
        : 0)
  );

  addNode(nodes, {
    id: "patient",
    label: patient.name,
    type: "patient",
    status: "neutral",
    weight: 1,
    evidence: `Week ${patient.currentWeek} of ${patient.conditionFocus}.`
  });
  addNode(nodes, {
    id: "risk",
    label: "Next-week adherence risk",
    type: "risk",
    status: riskStatus,
    weight: edgeRisk.support.status === "supported" ? edgeRisk.risk : 0.2,
    evidence:
      edgeRisk.support.status === "supported"
        ? `${formatPercent(edgeRisk.risk)} edge-model risk; ${carePlan.headline.toLowerCase()}.`
        : `Model abstained outside synthetic training support; ${carePlan.headline.toLowerCase()}.`
  });
  addNode(nodes, {
    id: "nausea",
    label: "Nausea burden",
    type: "symptom",
    status: riskFromWeight(nauseaRisk),
    weight: nauseaRisk,
    evidence: `Today ${checkIn.nauseaScore}/10; trend ${insights.nauseaTrend >= 0 ? "+" : ""}${insights.nauseaTrend}.`
  });
  addNode(nodes, {
    id: "hydration",
    label: "Hydration risk",
    type: "symptom",
    status: riskFromWeight(hydrationRisk),
    weight: hydrationRisk,
    evidence: `Hydration ${checkIn.hydrationScore}/10 from home check-in.`
  });
  addNode(nodes, {
    id: "appetite-energy",
    label: "Appetite and energy drag",
    type: "symptom",
    status: riskFromWeight(Math.max(appetiteRisk, energyRisk)),
    weight: Math.max(appetiteRisk, energyRisk),
    evidence: `Appetite ${checkIn.appetiteScore}/10 and energy ${checkIn.energyScore}/10.`
  });
  addNode(nodes, {
    id: "routine",
    label: "Routine disruption",
    type: "routine",
    status: riskFromWeight(routineRisk),
    weight: routineRisk,
    evidence: `${Math.round(insights.lastTwoAdherence)}% recent adherence; medication ${checkIn.medicationTaken ? "taken" : "missed"} today.`
  });
  addNode(nodes, {
    id: "biomarkers",
    label: "Biomarker trend",
    type: "biomarker",
    status: biomarkerRisk > 0.45 ? "watch" : "protective",
    weight: biomarkerRisk,
    evidence: `${insights.weightDelta.toFixed(1)} kg since baseline; HbA1c ${formatSigned(insights.hba1cDelta)} pts where available.`
  });
  addNode(nodes, {
    id: "protective-progress",
    label: "Protective progress",
    type: "protective",
    status: "protective",
    weight: clamp01(insights.adherenceAvg / 100),
    evidence: `${Math.round(insights.adherenceAvg)}% average adherence and ${patient.goals[0].toLowerCase()}.`
  });

  edgeRisk.interventions.slice(0, 3).forEach((intervention) => {
    const reduction = intervention.absoluteReduction ?? 0;
    addNode(nodes, {
      id: interventionNodeId(intervention),
      label: intervention.label,
      type: "intervention",
      status: "action",
      weight: clamp01(reduction / Math.max(edgeRisk.risk, 0.01)),
      evidence: intervention.rankable
        ? `${formatPercent(reduction)} absolute modelled risk reduction.`
        : "Not ranked because the current input is outside synthetic training support."
    });
  });

  addNode(nodes, {
    id: "safety-guardrail",
    label: "Safety guardrail",
    type: "safety",
    status: carePlan.escalation.needed ? "urgent" : "protective",
    weight: carePlan.escalation.needed ? 1 : 0.35,
    evidence: carePlan.escalation.reason
  });
  addNode(nodes, {
    id: "clinician-handoff",
    label: "Clinician handoff",
    type: "clinician",
    status: carePlan.escalation.needed ? "urgent" : "neutral",
    weight: carePlan.escalation.needed ? 1 : 0.2,
    evidence: carePlan.escalation.channel
  });

  addEdge(edges, "patient", "nausea", "reports", nauseaRisk, riskFromWeight(nauseaRisk));
  addEdge(edges, "patient", "hydration", "reports", hydrationRisk, riskFromWeight(hydrationRisk));
  addEdge(edges, "patient", "appetite-energy", "reports", Math.max(appetiteRisk, energyRisk), riskFromWeight(Math.max(appetiteRisk, energyRisk)));
  addEdge(edges, "patient", "routine", "lives inside", routineRisk, riskFromWeight(routineRisk));
  addEdge(edges, "patient", "biomarkers", "streams", biomarkerRisk, biomarkerRisk > 0.45 ? "watch" : "protective");
  addEdge(edges, "protective-progress", "risk", "buffers", 0.46, "protective");

  addEdge(edges, "nausea", "risk", "raises dropout risk", nauseaRisk, riskFromWeight(nauseaRisk));
  addEdge(edges, "hydration", "risk", "raises safety risk", hydrationRisk, riskFromWeight(hydrationRisk));
  addEdge(edges, "appetite-energy", "risk", "adds friction", Math.max(appetiteRisk, energyRisk), riskFromWeight(Math.max(appetiteRisk, energyRisk)));
  addEdge(edges, "routine", "risk", "drives missed dose loop", routineRisk, riskFromWeight(routineRisk));
  addEdge(edges, "biomarkers", "risk", biomarkerRisk > 0.45 ? "needs context" : "shows progress", biomarkerRisk, biomarkerRisk > 0.45 ? "watch" : "protective");

  edgeRisk.interventions.slice(0, 3).forEach((intervention) => {
    addEdge(
      edges,
      interventionNodeId(intervention),
      targetDriverForIntervention(intervention),
      "breaks loop",
      clamp01((intervention.absoluteReduction ?? 0) / Math.max(edgeRisk.risk, 0.01)),
      "action"
    );
  });

  if (carePlan.escalation.needed) {
    addEdge(edges, "risk", "safety-guardrail", "crosses safety threshold", 1, "urgent");
    addEdge(edges, "safety-guardrail", "clinician-handoff", "routes async/urgent review", 1, "urgent");
  } else {
    addEdge(edges, "risk", "safety-guardrail", "stays inside coaching boundary", 0.28, "protective");
    addEdge(edges, "safety-guardrail", "clinician-handoff", "available if pattern repeats", 0.18, "neutral");
  }

  const centrality = calculateCentrality(nodes, edges);
  const nodeExplanations = buildNodeExplanations(nodes, edges, edgeRisk, carePlan);
  const topDriver =
    centrality.find((item) => ["symptom", "routine", "biomarker"].includes(item.type)) ??
    centrality.find((item) => item.nodeId === "risk") ??
    centrality[0];
  const bestIntervention = edgeRisk.interventions[0];
  const rescuePath = buildRescuePath(carePlan, topDriver, bestIntervention);
  const repeatedLoopScore = calculateRepeatedLoopScore(patient, checkIn);
  const cohortMatches = findCohortMatches(patient, cohort);
  const similarPatternScore = cohortMatches[0]?.similarity ?? 0;
  const rescuePathStrength = clamp01((bestIntervention?.absoluteReduction ?? 0) / Math.max(edgeRisk.risk, 0.01));
  const strongestReduction = Math.max(bestIntervention?.absoluteReduction ?? 0, 0.0001);
  const routeAlternatives: GraphRouteAlternative[] = edgeRisk.interventions.map((intervention, index) => {
    const targetNodeId = targetDriverForIntervention(intervention);
    return {
      rank: index + 1,
      interventionNodeId: interventionNodeId(intervention),
      label: intervention.label,
      targetNodeId,
      targetLabel: nodes.find((node) => node.id === targetNodeId)?.label ?? targetNodeId,
      absoluteReduction: intervention.absoluteReduction,
      newRisk: intervention.risk,
      relativeStrength: clamp01((intervention.absoluteReduction ?? 0) / strongestReduction),
      status: carePlan.escalation.needed
        ? "blocked-by-safety"
        : !intervention.rankable
          ? "not-ranked"
          : index === 0
            ? "recommended"
            : "alternative",
      rationale: carePlan.escalation.needed
        ? "Deterministic red flags suppress automated coaching even when the adherence simulation improves."
        : !intervention.rankable
          ? "No numeric comparison is shown outside the synthetic training support."
        : index === 0
          ? "Largest modelled risk reduction under the current explicit assumptions."
          : "Lower-ranked modelled option retained for clinician or patient review."
    };
  });
  const distanceToEscalation = carePlan.riskLevel === "urgent" ? 1 : carePlan.riskLevel === "review" ? 2 : carePlan.riskLevel === "watch" ? 3 : 4;
  const mlFeatures: GraphMlFeature[] = [
    {
      id: "risk_driver_centrality",
      label: "Risk-driver centrality",
      value: topDriver.score,
      displayValue: topDriver.score.toFixed(2),
      interpretation: `${topDriver.label} is the most connected active risk driver.`
    },
    {
      id: "distance_to_escalation",
      label: "Distance to escalation",
      value: distanceToEscalation,
      displayValue: `${distanceToEscalation} hop${distanceToEscalation === 1 ? "" : "s"}`,
      interpretation:
        distanceToEscalation === 1
          ? "The graph has reached the safety handoff route."
          : "The patient is still inside monitored coaching space."
    },
    {
      id: "rescue_path_strength",
      label: "Rescue path strength",
      value: rescuePathStrength,
      displayValue: formatPercent(rescuePathStrength),
      interpretation: `${bestIntervention?.label ?? "Best intervention"} has the strongest modelled path effect.`
    },
    {
      id: "repeated_loop_score",
      label: "Repeated loop score",
      value: repeatedLoopScore,
      displayValue: formatPercent(repeatedLoopScore),
      interpretation: "Measures repeated adherence, nausea and routine friction across recent weeks."
    },
    {
      id: "similar_pattern_score",
      label: "Similar pattern score",
      value: similarPatternScore,
      displayValue: formatPercent(similarPatternScore),
      interpretation: "Compares this patient journey with other synthetic patient patterns."
    }
  ];

  return {
    nodes,
    edges,
    centrality,
    rescuePath,
    mlFeatures,
    nodeExplanations,
    routeAlternatives,
    cohortMatches,
    topDriver,
    pathMode: carePlan.escalation.needed ? "escalation" : "coaching",
    summary:
      carePlan.escalation.needed
        ? `The graph routes ${patient.name.split(" ")[0]} from ${topDriver.label.toLowerCase()} into the safety handoff path.`
        : `The graph identifies ${topDriver.label.toLowerCase()} as the smallest loop to interrupt before adherence slips.`
  };
}

function buildNodeExplanations(
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[],
  edgeRisk: EdgeRiskResult,
  carePlan: CarePlan
): GraphNodeExplanation[] {
  const featureNamesByNode: Record<string, string[]> = {
    patient: ["week"],
    risk: edgeRisk.contributions.map((item) => item.name),
    nausea: ["nausea_score", "side_effect_spike"],
    hydration: ["hydration_risk"],
    "appetite-energy": ["appetite_suppression", "energy_risk"],
    routine: ["routine_disruption", "adherence_last_2wk", "missed_doses_2wk"],
    biomarkers: ["weight_loss_pct", "hba1c_delta", "systolic_bp"],
    "protective-progress": ["adherence_last_2wk", "weight_loss_pct"]
  };
  const totalAbsoluteContribution = edgeRisk.contributions.reduce(
    (sum, item) => sum + Math.abs(item.contribution),
    0
  );

  return nodes.map((node) => {
    const evidenceEdgeCount = edges.filter((edge) => edge.source === node.id || edge.target === node.id).length;

    if (node.id === "safety-guardrail" || node.id === "clinician-handoff") {
      return {
        nodeId: node.id,
        source: "rule",
        contribution: null,
        contributionUnit: "none",
        direction: carePlan.escalation.needed ? "override" : "neutral",
        impactShare: 0,
        featureNames: [],
        featureLabels: [],
        evidenceEdgeCount,
        summary:
          node.id === "safety-guardrail"
            ? carePlan.escalation.needed
              ? "A deterministic red-flag rule overrides adherence coaching; this decision is outside the ML score."
              : "No deterministic red-flag threshold is active, so bounded coaching remains available."
            : "The graph terminates at human review; the clinician owns assessment and treatment decisions."
      };
    }

    if (node.id.startsWith("intervention-")) {
      const intervention = edgeRisk.interventions.find((item) => interventionNodeId(item) === node.id);
      return {
        nodeId: node.id,
        source: "simulation",
        contribution: intervention?.absoluteReduction ?? 0,
        contributionUnit: "absolute-risk",
        direction: "reduces risk",
        impactShare: intervention
          ? clamp01((intervention.absoluteReduction ?? 0) / Math.max(edgeRisk.risk, 0.01))
          : 0,
        featureNames: [],
        featureLabels: [],
        evidenceEdgeCount,
        summary: intervention?.rankable
          ? "An explicit feature perturbation rescores the same model. The delta is a what-if estimate, not causal evidence."
          : "The route is not numerically ranked because the observed or simulated input is outside synthetic training support."
      };
    }

    const featureNames = featureNamesByNode[node.id] ?? [];
    const mappedContributions = featureNames
      .map((name) => edgeRisk.contributions.find((item) => item.name === name))
      .filter((item): item is EdgeRiskResult["contributions"][number] => Boolean(item));

    if (mappedContributions.length > 0) {
      const contribution = mappedContributions.reduce((sum, item) => sum + item.contribution, 0);
      const mappedAbsoluteContribution = mappedContributions.reduce(
        (sum, item) => sum + Math.abs(item.contribution),
        0
      );
      const activeFeatures = mappedContributions.filter((item) => Math.abs(item.contribution) >= 0.005);
      const featureLabels = (activeFeatures.length ? activeFeatures : mappedContributions).map((item) => item.label);
      const impactShare = totalAbsoluteContribution > 0
        ? clamp01(mappedAbsoluteContribution / totalAbsoluteContribution)
        : 0;

      return {
        nodeId: node.id,
        source: "model",
        contribution,
        contributionUnit: "log-odds",
        direction: contribution > 0.005 ? "raises risk" : contribution < -0.005 ? "lowers risk" : "neutral",
        impactShare,
        featureNames,
        featureLabels,
        evidenceEdgeCount,
        summary: `${node.label} maps to ${mappedContributions.length} structured model feature${mappedContributions.length === 1 ? "" : "s"} and ${impactShare >= 0.005 ? `covers ${formatPercent(impactShare)} of absolute local attribution` : "has negligible local attribution"}.`
      };
    }

    return {
      nodeId: node.id,
      source: "context",
      contribution: null,
      contributionUnit: "none",
      direction: "neutral",
      impactShare: 0,
      featureNames: [],
      featureLabels: [],
      evidenceEdgeCount,
      summary: "Contextual evidence supports graph navigation but does not directly enter the adherence risk score."
    };
  });
}

function addNode(nodes: KnowledgeGraphNode[], node: KnowledgeGraphNode) {
  if (!nodes.some((existing) => existing.id === node.id)) nodes.push(node);
}

function addEdge(
  edges: KnowledgeGraphEdge[],
  source: string,
  target: string,
  label: string,
  weight: number,
  status: KnowledgeGraphStatus
) {
  edges.push({
    id: `${source}-${target}-${label}`,
    source,
    target,
    label,
    weight: clamp01(weight),
    status
  });
}

function calculateCentrality(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]): GraphCentrality[] {
  return nodes
    .map((node) => {
      const incidentWeight = edges
        .filter((edge) => edge.source === node.id || edge.target === node.id)
        .reduce((sum, edge) => sum + edge.weight, 0);
      return {
        nodeId: node.id,
        label: node.label,
        type: node.type,
        score: roundToTwo(node.weight + incidentWeight)
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildRescuePath(
  carePlan: CarePlan,
  topDriver: GraphCentrality,
  bestIntervention: InterventionSimulation | undefined
): RescuePathStep[] {
  if (carePlan.escalation.needed) {
    return [
      {
        nodeId: topDriver.nodeId,
        label: topDriver.label,
        summary: "Active driver is no longer handled as self-coaching."
      },
      {
        nodeId: "safety-guardrail",
        label: "Safety guardrail",
        summary: "Rules block diagnosis or medication changes and switch mode."
      },
      {
        nodeId: "clinician-handoff",
        label: "Clinician handoff",
        summary: carePlan.escalation.channel
      }
    ];
  }

  return [
    {
      nodeId: topDriver.nodeId,
      label: topDriver.label,
      summary: "Most connected risk driver in the current journey graph."
    },
    {
      nodeId: bestIntervention ? interventionNodeId(bestIntervention) : "protective-progress",
      label: bestIntervention?.label ?? "Protective progress",
      summary: bestIntervention?.note ?? "Keep the current routine stable."
    },
    {
      nodeId: "risk",
      label: "Lower adherence risk",
      summary: "The care moment targets the loop before it becomes a clinical queue item."
    }
  ];
}

function findCohortMatches(patient: Patient, cohort: Patient[]): CohortPatternMatch[] {
  const currentProfile = patientPatternProfile(patient);

  return cohort
    .filter((candidate) => candidate.id !== patient.id)
    .map((candidate) => {
      const candidateProfile = patientPatternProfile(candidate);
      const sharedDrivers = currentProfile.filter((item) => candidateProfile.includes(item));
      const allDrivers = new Set([...currentProfile, ...candidateProfile]);
      const similarity = allDrivers.size ? sharedDrivers.length / allDrivers.size : 0;

      return {
        patientId: candidate.id,
        name: candidate.name,
        similarity: roundToTwo(similarity),
        sharedDrivers: sharedDrivers.length ? sharedDrivers : ["metabolic programme"],
        note: `${candidate.name.split(" ")[0]} shares ${sharedDrivers.length || 1} journey signal${sharedDrivers.length === 1 ? "" : "s"} with ${patient.name.split(" ")[0]}.`
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

function patientPatternProfile(patient: Patient) {
  const insights = getPatientInsights(patient);
  const profile = new Set<string>();
  const riskText = patient.riskFactors.join(" ").toLowerCase();
  const condition = patient.conditionFocus.toLowerCase();

  if (/shift/.test(riskText)) profile.add("shift-work disruption");
  if (/travel/.test(riskText)) profile.add("travel disruption");
  if (/nausea/.test(riskText) || patient.weeklyData.slice(-3).some((week) => week.nauseaScore >= 5)) profile.add("nausea-led friction");
  if (/hypertension|blood pressure|cardio/.test(riskText) || condition.includes("cardio")) profile.add("cardiometabolic monitoring");
  if (/pcos|women/.test(condition)) profile.add("women's health context");
  if (insights.lastTwoAdherence < 90) profile.add("recent adherence dip");
  if (insights.weightDelta < 0) profile.add("weight progress");

  return [...profile];
}

function targetDriverForIntervention(intervention: InterventionSimulation) {
  if (intervention.id === "hydration") return "hydration";
  if (intervention.id === "meal") return "nausea";
  if (intervention.id === "routine") return "routine";
  return "safety-guardrail";
}

function interventionNodeId(intervention: InterventionSimulation) {
  return `intervention-${intervention.id}`;
}

function calculateRepeatedLoopScore(patient: Patient, checkIn: CheckInInput) {
  const recent = patient.weeklyData.slice(-3);
  const adherenceDips = recent.filter((week) => week.adherencePct < 90).length;
  const symptomRepeats = recent.filter((week) => week.nauseaScore >= 5).length;
  const routineLanguage = /work|travel|busy|hectic|missed|forgot/i.test(`${checkIn.freeText} ${checkIn.sideEffects}`) ? 1 : 0;

  return clamp01((adherenceDips + symptomRepeats + routineLanguage + Number(!checkIn.medicationTaken)) / 7);
}

function riskFromWeight(value: number): KnowledgeGraphStatus {
  if (value >= 0.75) return "urgent";
  if (value >= 0.55) return "review";
  if (value >= 0.32) return "watch";
  return "steady";
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSigned(value: number | undefined) {
  if (typeof value !== "number") return "not tracked";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}
