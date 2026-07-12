import { getPatientInsights } from "./careEngine";
import { adherenceModelData, type ModelArtifact } from "./modelArtifact";
import type { CheckInInput, Patient } from "./types";

export type FeatureContribution = {
  name: string;
  label: string;
  rawValue: number;
  zScore: number;
  contribution: number;
  direction: "raises risk" | "lowers risk";
};

export type RiskDecompositionStep = {
  id: string;
  label: string;
  contribution: number;
  direction: "raises risk" | "lowers risk";
  probabilityBefore: number;
  probabilityAfter: number;
  featureCount: number;
};

export type RiskExplanation = {
  baselineRisk: number;
  currentRisk: number;
  totalContribution: number;
  topRiskDriver: FeatureContribution | null;
  topProtectiveDriver: FeatureContribution | null;
  topFeatureCoverage: number;
  steps: RiskDecompositionStep[];
};

export type FeatureSensitivity = {
  name: string;
  label: string;
  currentValue: number;
  lowValue: number;
  highValue: number;
  lowRisk: number;
  highRisk: number;
  minRisk: number;
  maxRisk: number;
  span: number;
  direction: "higher raises risk" | "higher lowers risk" | "locally flat";
  perturbation: string;
};

export type RiskSensitivityAnalysis = {
  currentRisk: number;
  oneAtATimeLow: number;
  oneAtATimeHigh: number;
  stabilityScore: number;
  decisionThreshold: number;
  distanceToThreshold: number;
  perturbationStd: number;
  features: FeatureSensitivity[];
};

export type InterventionSimulation = {
  id: string;
  label: string;
  risk: number | null;
  absoluteReduction: number | null;
  rankable: boolean;
  note: string;
};

export type SupportViolation = {
  name: string;
  label: string;
  value: number;
  low: number;
  high: number;
};

export type FeatureVectorScore = {
  risk: number;
  logit: number;
  modelSpread: {
    p10: number;
    p90: number;
    memberCount: number;
  };
  support: {
    status: "supported" | "out-of-support";
    violations: SupportViolation[];
  };
};

export type EdgeRiskResult = {
  artifact: ModelArtifact;
  risk: number;
  logit: number;
  features: Record<string, number>;
  contributions: FeatureContribution[];
  interventions: InterventionSimulation[];
  modelSpread: FeatureVectorScore["modelSpread"];
  support: FeatureVectorScore["support"];
};

export function getModelArtifact() {
  return adherenceModelData.artifact;
}

export function getModelSampleRows() {
  return adherenceModelData.sampleRows;
}

export function scorePatientRisk(patient: Patient, checkIn: CheckInInput): EdgeRiskResult {
  const artifact = adherenceModelData.artifact;
  const features = extractFeatures(patient, checkIn);
  const baseScore = scoreFeatureVector(features, artifact);
  const contributions = artifact.features
    .map((feature) => {
      const rawValue = features[feature.name] ?? feature.mean;
      const z = (rawValue - feature.mean) / feature.std;
      const contribution = z * feature.weight;
      return {
        name: feature.name,
        label: feature.label,
        rawValue,
        zScore: z,
        contribution,
        direction: contribution >= 0 ? ("raises risk" as const) : ("lowers risk" as const)
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    artifact,
    risk: baseScore.risk,
    logit: baseScore.logit,
    features,
    contributions,
    interventions: simulateInterventions(features, artifact, baseScore),
    modelSpread: baseScore.modelSpread,
    support: baseScore.support
  };
}

export function scoreFeatureVector(
  features: Record<string, number>,
  artifact: ModelArtifact = adherenceModelData.artifact
): FeatureVectorScore {
  const consensus = scoreFeatures(features, artifact);
  const memberScores = artifact.ensemble.members
    .map((member) => {
      const logit = artifact.features.reduce((sum, feature, index) => {
        const rawValue = features[feature.name] ?? feature.mean;
        return sum + ((rawValue - feature.mean) / feature.std) * member.weights[index];
      }, member.intercept);
      return sigmoid(logit);
    })
    .sort((a, b) => a - b);
  const violations = artifact.features.flatMap((feature) => {
    const value = features[feature.name] ?? feature.mean;
    const outsideRange = value < feature.support.low || value > feature.support.high;
    const outsideBinarySet = feature.support.kind === "binary" && value !== 0 && value !== 1;
    return outsideRange || outsideBinarySet
      ? [
          {
            name: feature.name,
            label: feature.label,
            value,
            low: feature.support.low,
            high: feature.support.high
          }
        ]
      : [];
  });

  return {
    ...consensus,
    modelSpread: {
      p10: quantile(memberScores, 0.1),
      p90: quantile(memberScores, 0.9),
      memberCount: memberScores.length
    },
    support: {
      status: violations.length === 0 ? "supported" : "out-of-support",
      violations
    }
  };
}

export function explainRiskScore(result: EdgeRiskResult, maxFeatures = 6): RiskExplanation | null {
  if (result.support.status !== "supported") return null;

  const ranked = result.contributions;
  const top = ranked.slice(0, Math.max(1, maxFeatures));
  const remaining = ranked.slice(top.length);
  const totalAbsoluteContribution = ranked.reduce((sum, item) => sum + Math.abs(item.contribution), 0);
  const topAbsoluteContribution = top.reduce((sum, item) => sum + Math.abs(item.contribution), 0);
  const orderedSteps: Array<{
    id: string;
    label: string;
    contribution: number;
    direction: "raises risk" | "lowers risk";
    featureCount: number;
  }> = top.map((item) => ({
    id: item.name,
    label: item.label,
    contribution: item.contribution,
    direction: item.direction,
    featureCount: 1
  }));
  const remainingContribution = remaining.reduce((sum, item) => sum + item.contribution, 0);

  if (remaining.length > 0) {
    orderedSteps.push({
      id: "other-features",
      label: `${remaining.length} other features`,
      contribution: remainingContribution,
      direction: remainingContribution >= 0 ? "raises risk" : "lowers risk",
      featureCount: remaining.length
    });
  }

  let runningLogit = result.artifact.intercept;
  const steps = orderedSteps.map((step) => {
    const probabilityBefore = sigmoid(runningLogit);
    runningLogit += step.contribution;
    return {
      ...step,
      probabilityBefore,
      probabilityAfter: sigmoid(runningLogit)
    };
  });

  return {
    baselineRisk: sigmoid(result.artifact.intercept),
    currentRisk: result.risk,
    totalContribution: result.logit - result.artifact.intercept,
    topRiskDriver: result.contributions.find((item) => item.contribution > 0) ?? null,
    topProtectiveDriver: result.contributions.find((item) => item.contribution < 0) ?? null,
    topFeatureCoverage: totalAbsoluteContribution > 0 ? topAbsoluteContribution / totalAbsoluteContribution : 1,
    steps
  };
}

export function analyzeRiskSensitivity(
  result: EdgeRiskResult,
  perturbationStd = 0.5
): RiskSensitivityAnalysis | null {
  if (result.support.status !== "supported") return null;

  const features = result.artifact.features
    .map((feature) => {
      const currentValue = result.features[feature.name] ?? feature.mean;
      const bounds = featureBounds(feature.name);
      const isBinary = feature.support.kind === "binary";
      const lowValue = isBinary
        ? 0
        : clamp(currentValue - feature.std * perturbationStd, bounds[0], bounds[1]);
      const highValue = isBinary
        ? 1
        : clamp(currentValue + feature.std * perturbationStd, bounds[0], bounds[1]);
      const lowRisk = scoreFeatures({ ...result.features, [feature.name]: lowValue }, result.artifact).risk;
      const highRisk = scoreFeatures({ ...result.features, [feature.name]: highValue }, result.artifact).risk;
      const minRisk = Math.min(result.risk, lowRisk, highRisk);
      const maxRisk = Math.max(result.risk, lowRisk, highRisk);
      const difference = highRisk - lowRisk;

      return {
        name: feature.name,
        label: feature.label,
        currentValue,
        lowValue,
        highValue,
        lowRisk,
        highRisk,
        minRisk,
        maxRisk,
        span: maxRisk - minRisk,
        direction:
          Math.abs(difference) < 0.0005
            ? ("locally flat" as const)
            : difference > 0
              ? ("higher raises risk" as const)
              : ("higher lowers risk" as const),
        perturbation: isBinary ? "binary toggle" : `plus or minus ${perturbationStd.toFixed(1)} training SD`
      };
    })
    .sort((a, b) => b.span - a.span);
  const oneAtATimeLow = Math.min(result.risk, ...features.map((feature) => feature.minRisk));
  const oneAtATimeHigh = Math.max(result.risk, ...features.map((feature) => feature.maxRisk));
  const sensitivitySpan = oneAtATimeHigh - oneAtATimeLow;

  return {
    currentRisk: result.risk,
    oneAtATimeLow,
    oneAtATimeHigh,
    stabilityScore: clamp(1 - sensitivitySpan / 0.25, 0, 1),
    decisionThreshold: result.artifact.metrics.threshold,
    distanceToThreshold: result.artifact.metrics.threshold - result.risk,
    perturbationStd,
    features
  };
}

function extractFeatures(patient: Patient, checkIn: CheckInInput): Record<string, number> {
  const insights = getPatientInsights(patient);
  const latest = insights.latest;
  const priorWeek = insights.previous;
  const text = `${checkIn.freeText} ${checkIn.sideEffects}`.toLowerCase();
  const routineDisruption =
    Number(/work|shift|travel|busy|hectic|forgot|missed/.test(text)) * 0.44 +
    Number(patient.riskFactors.some((factor) => /shift|travel/i.test(factor))) * 0.22 +
    Number(!checkIn.medicationTaken) * 0.28;
  const moodAnxious = Number(/anxious|discouraged|worried|frustrated|tired/.test(checkIn.mood.toLowerCase() + text));
  const weightLossPct = Math.max(0, (-insights.weightDelta / patient.baseline.weightKg) * 100);
  const hba1cDelta =
    typeof insights.hba1cDelta === "number"
      ? insights.hba1cDelta
      : typeof patient.latestBiomarkers.hba1cPct === "number" && typeof patient.baseline.hba1cPct === "number"
        ? patient.latestBiomarkers.hba1cPct - patient.baseline.hba1cPct
        : -0.1;

  return {
    week: patient.currentWeek,
    adherence_last_2wk: insights.lastTwoAdherence,
    missed_doses_2wk:
      Math.max(0, latest.dosesExpected - latest.dosesTaken + priorWeek.dosesExpected - priorWeek.dosesTaken) +
      Number(!checkIn.medicationTaken),
    nausea_score: checkIn.nauseaScore,
    hydration_risk: Math.max(0, 10 - checkIn.hydrationScore),
    energy_risk: Math.max(0, 10 - checkIn.energyScore),
    appetite_suppression: Math.max(0, 10 - checkIn.appetiteScore),
    weight_loss_pct: weightLossPct,
    hba1c_delta: hba1cDelta,
    systolic_bp: patient.latestBiomarkers.systolicBp ?? patient.baseline.systolicBp ?? 130,
    routine_disruption: Math.min(1, routineDisruption + Number(/vomit|lightheaded|pain|worse/.test(text)) * 0.18),
    side_effect_spike: Math.max(0, checkIn.nauseaScore - priorWeek.nauseaScore + Number(/vomit|lightheaded|pain|worse/.test(text)) * 0.8),
    prior_failure: insights.lastTwoAdherence < 90 ? 1 : 0,
    mood_anxious: moodAnxious
  };
}

function scoreFeatures(features: Record<string, number>, artifact: ModelArtifact) {
  const logit = artifact.features.reduce((sum, feature) => {
    const rawValue = features[feature.name] ?? feature.mean;
    return sum + ((rawValue - feature.mean) / feature.std) * feature.weight;
  }, artifact.intercept);

  return { logit, risk: sigmoid(logit) };
}

function simulateInterventions(
  features: Record<string, number>,
  artifact: ModelArtifact,
  baseline: FeatureVectorScore
): InterventionSimulation[] {
  const interventions = [
    {
      id: "hydration",
      label: "Hydration nudge",
      note: "Reduce low-hydration risk and energy drag before symptoms build.",
      mutate: (next: Record<string, number>) => {
        next.hydration_risk = Math.max(0, next.hydration_risk - 2.5);
        next.energy_risk = Math.max(0, next.energy_risk - 0.6);
      }
    },
    {
      id: "meal",
      label: "Meal-timing prompt",
      note: "Target the nausea-to-skipped-meal loop.",
      mutate: (next: Record<string, number>) => {
        next.nausea_score = Math.max(0, next.nausea_score - 1.8);
        next.side_effect_spike = Math.max(0, next.side_effect_spike - 1.2);
        next.appetite_suppression = Math.max(0, next.appetite_suppression - 0.8);
      }
    },
    {
      id: "routine",
      label: "Reminder anchor",
      note: "Tie adherence to a reliable daily cue.",
      mutate: (next: Record<string, number>) => {
        next.routine_disruption = Math.max(0, next.routine_disruption - 0.38);
        next.missed_doses_2wk = Math.max(0, next.missed_doses_2wk - 1);
        next.adherence_last_2wk = Math.min(100, next.adherence_last_2wk + 5);
      }
    },
    {
      id: "clinician",
      label: "Async clinician message",
      note: "Human support for side-effect anxiety before dropout.",
      mutate: (next: Record<string, number>) => {
        next.routine_disruption = Math.max(0, next.routine_disruption - 0.24);
        next.mood_anxious = 0;
        next.prior_failure = next.adherence_last_2wk < 85 ? 1 : 0;
        next.nausea_score = Math.max(0, next.nausea_score - 0.9);
      }
    }
  ];

  return interventions
    .map((intervention) => {
      const nextFeatures = { ...features };
      intervention.mutate(nextFeatures);
      const nextScore = scoreFeatureVector(nextFeatures, artifact);
      const rankable = baseline.support.status === "supported" && nextScore.support.status === "supported";
      return {
        id: intervention.id,
        label: intervention.label,
        risk: rankable ? nextScore.risk : null,
        absoluteReduction: rankable ? Math.max(0, baseline.risk - nextScore.risk) : null,
        rankable,
        note: rankable
          ? intervention.note
          : `${intervention.note} Not ranked outside the synthetic training support.`
      };
    })
    .sort((a, b) => (b.absoluteReduction ?? -1) - (a.absoluteReduction ?? -1));
}

function featureBounds(name: string): [number, number] {
  if (["prior_failure", "mood_anxious"].includes(name)) return [0, 1];
  if (name === "routine_disruption") return [0, 1];
  if (name === "week") return [1, 12];
  if (name === "adherence_last_2wk") return [0, 100];
  if (name === "missed_doses_2wk") return [0, 14];
  if (["nausea_score", "hydration_risk", "energy_risk", "appetite_suppression"].includes(name)) return [0, 10];
  if (name === "weight_loss_pct") return [0, 30];
  if (name === "hba1c_delta") return [-4, 4];
  if (name === "systolic_bp") return [70, 230];
  if (name === "side_effect_spike") return [0, 10];
  return [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, value))));
}

function quantile(sortedValues: number[], probability: number) {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - fraction) + sortedValues[upperIndex] * fraction;
}
