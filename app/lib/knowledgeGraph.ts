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
  const riskStatus: KnowledgeGraphStatus =
    edgeRisk.support.status === "out-of-support"
      ? "neutral"
      : edgeRisk.risk >= edgeRisk.artifact.metrics.threshold
        ? "watch"
        : "steady";
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
  const nauseaSignal = describeModelFeatureGroup(edgeRisk, ["nausea_score", "side_effect_spike"]);
  const hydrationSignal = describeModelFeatureGroup(edgeRisk, ["hydration_risk"]);
  const appetiteEnergySignal = describeModelFeatureGroup(edgeRisk, ["appetite_suppression", "energy_risk"]);
  const routineSignal = describeModelFeatureGroup(edgeRisk, ["routine_disruption", "adherence_last_2wk", "missed_doses_2wk"]);
  const biomarkerSignal = describeModelFeatureGroup(edgeRisk, ["weight_loss_pct", "hba1c_delta", "systolic_bp"]);

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
        : `Model abstained outside marginal synthetic feature bounds; ${carePlan.headline.toLowerCase()}.`
  });
  addNode(nodes, {
    id: "nausea",
    label: "Nausea burden",
    type: "symptom",
    status: nauseaSignal.status,
    weight: nauseaRisk,
    evidence: `Today ${checkIn.nauseaScore}/10; trend ${insights.nauseaTrend >= 0 ? "+" : ""}${insights.nauseaTrend}.`
  });
  addNode(nodes, {
    id: "hydration",
    label: "Hydration level",
    type: "symptom",
    status: hydrationSignal.status,
    weight: hydrationRisk,
    evidence: `Hydration ${checkIn.hydrationScore}/10 from home check-in.`
  });
  addNode(nodes, {
    id: "appetite-energy",
    label: "Appetite and energy",
    type: "symptom",
    status: appetiteEnergySignal.status,
    weight: Math.max(appetiteRisk, energyRisk),
    evidence: `Appetite ${checkIn.appetiteScore}/10 and energy ${checkIn.energyScore}/10.`
  });
  addNode(nodes, {
    id: "routine",
    label: "Routine and dose continuity",
    type: "routine",
    status: routineSignal.status,
    weight: routineRisk,
    evidence: `${Math.round(insights.lastTwoAdherence)}% recent adherence; planned weekly dose ${checkIn.medicationTaken ? "recorded" : "missed"} in this check-in.`
  });
  addNode(nodes, {
    id: "biomarkers",
    label: "Biomarker trend",
    type: "biomarker",
    status: biomarkerSignal.status,
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
        ? `${formatPercentagePoints(reduction)} scenario-score decrease under explicit assumptions.`
        : "Not ranked because the current input is outside configured marginal feature bounds."
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

  addEdge(edges, "patient", "nausea", "reports", nauseaRisk, nauseaSignal.status);
  addEdge(edges, "patient", "hydration", "reports", hydrationRisk, hydrationSignal.status);
  addEdge(edges, "patient", "appetite-energy", "reports", Math.max(appetiteRisk, energyRisk), appetiteEnergySignal.status);
  addEdge(edges, "patient", "routine", "lives inside", routineRisk, routineSignal.status);
  addEdge(edges, "patient", "biomarkers", "streams", biomarkerRisk, biomarkerSignal.status);
  addEdge(edges, "protective-progress", "risk", "buffers", 0.46, "protective");

  addEdge(edges, "nausea", "risk", nauseaSignal.relationship, nauseaRisk, nauseaSignal.status);
  addEdge(edges, "hydration", "risk", hydrationSignal.relationship, hydrationRisk, hydrationSignal.status);
  addEdge(edges, "appetite-energy", "risk", appetiteEnergySignal.relationship, Math.max(appetiteRisk, energyRisk), appetiteEnergySignal.status);
  addEdge(edges, "routine", "risk", routineSignal.relationship, routineRisk, routineSignal.status);
  addEdge(edges, "biomarkers", "risk", biomarkerSignal.relationship, biomarkerRisk, biomarkerSignal.status);

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
  const riskRaisingNodeIds = new Set(
    nodeExplanations
      .filter((explanation) => explanation.direction === "raises risk")
      .map((explanation) => explanation.nodeId)
  );
  const topDriver =
    centrality.find((item) => ["symptom", "routine", "biomarker"].includes(item.type) && riskRaisingNodeIds.has(item.nodeId)) ??
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
          ? "No numeric comparison is shown outside configured marginal feature bounds."
        : index === 0
          ? "Largest supported scenario-score decrease under the current explicit assumptions."
          : "Lower-ranked modelled option retained for clinician or patient review."
    };
  });
  const mlFeatures: GraphMlFeature[] = [
    {
      id: "top_driver_graph_score",
      label: riskRaisingNodeIds.has(topDriver.nodeId) ? "Top risk-raising signal score" : "Top context-signal score",
      value: topDriver.score,
      displayValue: topDriver.score.toFixed(2),
      interpretation: riskRaisingNodeIds.has(topDriver.nodeId)
        ? `${topDriver.label} ranks highest among locally risk-raising model groups under the authored graph weights.`
        : `${topDriver.label} ranks highest under the authored node and edge weights.`
    },
    {
      id: "safety_route_state",
      label: "Deterministic safety route",
      value: carePlan.escalation.needed ? 1 : 0,
      displayValue: carePlan.escalation.needed ? "Handoff draft" : "Coaching",
      interpretation: carePlan.escalation.needed
        ? "A fixed safety rule suppresses coaching and prepares a handoff draft."
        : "No fixed red-flag rule is active, so bounded coaching remains available."
    },
    {
      id: "scenario_route_ratio",
      label: "Tested-action strength",
      value: rescuePathStrength,
      displayValue: bestIntervention?.rankable ? formatPercent(rescuePathStrength) : "Not ranked",
      interpretation: bestIntervention?.rankable
        ? `${bestIntervention.label} has the largest supported scenario-score change.`
        : "The model abstains from tested-action comparison outside marginal feature bounds."
    },
    {
      id: "recent_friction_index",
      label: "Recent friction index",
      value: repeatedLoopScore,
      displayValue: formatPercent(repeatedLoopScore),
      interpretation: "Measures repeated adherence, nausea and routine friction across recent weeks."
    },
    {
      id: "synthetic_tag_overlap",
      label: "Synthetic tag overlap",
      value: similarPatternScore,
      displayValue: formatPercent(similarPatternScore),
      interpretation: "Jaccard overlap across authored context tags for the other two synthetic records."
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
        ? `The evidence map links ${patient.name.split(" ")[0]}'s active signals to a deterministic safety handoff draft.`
        : riskRaisingNodeIds.has(topDriver.nodeId)
          ? `The evidence map surfaces ${topDriver.label.toLowerCase()} as the highest-ranked locally risk-raising signal under its authored graph weights.`
          : `The evidence map surfaces ${topDriver.label.toLowerCase()} as the highest-ranked context signal under its authored weights.`
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
      const reduction = intervention?.rankable === true ? intervention.absoluteReduction : null;
      const rankable = reduction !== null;
      return {
        nodeId: node.id,
        source: "simulation",
        contribution: reduction,
        contributionUnit: rankable ? "absolute-risk" : "none",
        direction: rankable ? "reduces risk" : "neutral",
        impactShare: rankable
          ? clamp01(reduction / Math.max(edgeRisk.risk, 0.01))
          : 0,
        featureNames: [],
        featureLabels: [],
        evidenceEdgeCount,
        summary: intervention?.rankable
          ? "An explicit feature perturbation rescores the same model. The delta is a what-if estimate, not causal evidence."
          : "The route is not numerically ranked because the observed or simulated input is outside configured marginal feature bounds."
      };
    }

    const featureNames = featureNamesByNode[node.id] ?? [];
    const mappedContributions = featureNames
      .map((name) => edgeRisk.contributions.find((item) => item.name === name))
      .filter((item): item is EdgeRiskResult["contributions"][number] => Boolean(item));

    if (mappedContributions.length > 0 && edgeRisk.support.status !== "supported") {
      return {
        nodeId: node.id,
        source: "model",
        contribution: null,
        contributionUnit: "none",
        direction: "neutral",
        impactShare: 0,
        featureNames: [],
        featureLabels: [],
        evidenceEdgeCount,
        summary: "Patient-specific model attribution is withheld because this input is outside marginal feature bounds."
      };
    }

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

function describeModelFeatureGroup(edgeRisk: EdgeRiskResult, featureNames: string[]) {
  if (edgeRisk.support.status !== "supported") {
    return {
      relationship: "model attribution withheld",
      status: "neutral" as const
    };
  }

  const contribution = featureNames.reduce(
    (sum, name) => sum + (edgeRisk.contributions.find((item) => item.name === name)?.contribution ?? 0),
    0
  );

  if (contribution > 0.005) {
    return { relationship: "raises model risk", status: "watch" as const };
  }
  if (contribution < -0.005) {
    return { relationship: "lowers model risk", status: "protective" as const };
  }
  return { relationship: "neutral model contribution", status: "neutral" as const };
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
        summary: "The active context signal is no longer handled as self-coaching."
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
      summary: "Highest-ranked context signal under authored graph weights."
    },
    {
      nodeId: bestIntervention ? interventionNodeId(bestIntervention) : "protective-progress",
      label: bestIntervention?.label ?? "Protective progress",
      summary: bestIntervention?.note ?? "Keep the current routine stable."
    },
    {
      nodeId: "risk",
      label: "Lower adherence risk",
      summary: "The support plan targets current friction before the next planned adherence event."
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

function formatPercentagePoints(value: number) {
  const points = value * 100;
  return `${points < 1 ? points.toFixed(1) : Math.round(points)} pp`;
}

function formatSigned(value: number | undefined) {
  if (typeof value !== "number") return "not tracked";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}
