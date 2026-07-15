import { getPatientInsights } from "./careEngine";
import { MODEL_FEATURE_CONTRACT_VERSION } from "./modelFeatureContract";
import type { ModelFeatureName } from "./modelArtifact";
import type { CheckInInput, Patient } from "./types";

export { MODEL_FEATURE_CONTRACT_VERSION } from "./modelFeatureContract";

type RecentWeekSource = {
  adherencePct: number;
  dosesTaken: number;
  dosesExpected: number;
};

export type ModelFeatureSource = {
  contractVersion: typeof MODEL_FEATURE_CONTRACT_VERSION;
  week: number;
  recentWeeks: [RecentWeekSource, RecentWeekSource];
  previousNauseaScore: number;
  baselineWeightKg: number;
  currentWeightKg: number;
  baselineHba1cPct: number | null;
  currentHba1cPct: number | null;
  baselineSystolicBp: number | null;
  currentSystolicBp: number | null;
  riskFactors: string[];
  checkIn: Pick<
    CheckInInput,
    | "medicationTaken"
    | "nauseaScore"
    | "hydrationScore"
    | "energyScore"
    | "appetiteScore"
    | "mood"
    | "freeText"
    | "sideEffects"
  >;
};

export class ModelFeatureContractError extends Error {
  constructor(message: string) {
    super(`Model feature source is invalid: ${message}`);
    this.name = "ModelFeatureContractError";
  }
}

export function buildModelFeatureSource(patient: Patient, checkIn: CheckInInput): ModelFeatureSource {
  const insights = getPatientInsights(patient);
  const recentWeeks = patient.weeklyData.slice(-2);
  const [olderWeek, newerWeek] = recentWeeks;

  return {
    contractVersion: MODEL_FEATURE_CONTRACT_VERSION,
    week: patient.currentWeek,
    recentWeeks: [
      {
        adherencePct: olderWeek?.adherencePct ?? Number.NaN,
        dosesTaken: olderWeek?.dosesTaken ?? Number.NaN,
        dosesExpected: olderWeek?.dosesExpected ?? Number.NaN
      },
      {
        adherencePct: newerWeek?.adherencePct ?? Number.NaN,
        dosesTaken: newerWeek?.dosesTaken ?? Number.NaN,
        dosesExpected: newerWeek?.dosesExpected ?? Number.NaN
      }
    ],
    previousNauseaScore: insights.latest?.nauseaScore ?? Number.NaN,
    baselineWeightKg: patient.baseline.weightKg,
    currentWeightKg: insights.latest?.weightKg ?? Number.NaN,
    baselineHba1cPct: patient.baseline.hba1cPct ?? null,
    currentHba1cPct: patient.latestBiomarkers.hba1cPct ?? null,
    baselineSystolicBp: patient.baseline.systolicBp ?? null,
    currentSystolicBp: patient.latestBiomarkers.systolicBp ?? null,
    riskFactors: patient.riskFactors,
    checkIn: {
      medicationTaken: checkIn.medicationTaken,
      nauseaScore: checkIn.nauseaScore,
      hydrationScore: checkIn.hydrationScore,
      energyScore: checkIn.energyScore,
      appetiteScore: checkIn.appetiteScore,
      mood: checkIn.mood,
      freeText: checkIn.freeText,
      sideEffects: checkIn.sideEffects
    }
  };
}

export function engineerModelFeatures(source: ModelFeatureSource): Record<ModelFeatureName, number> {
  if (source.contractVersion !== MODEL_FEATURE_CONTRACT_VERSION) {
    throw new ModelFeatureContractError(
      `expected contract ${MODEL_FEATURE_CONTRACT_VERSION}, received ${String(source.contractVersion)}`
    );
  }

  const text = `${source.checkIn.freeText} ${source.checkIn.sideEffects}`.toLowerCase();
  const routineDisruption =
    Number(/work|shift|travel|busy|hectic|forgot|missed/.test(text)) * 0.44 +
    Number(source.riskFactors.some((factor) => /shift|travel/i.test(factor))) * 0.22 +
    Number(!source.checkIn.medicationTaken) * 0.28;
  const acuteSymptomMentioned = Number(/vomit|lightheaded|pain|worse/.test(text));
  const moodAnxious = Number(
    /anxious|discouraged|worried|frustrated|tired/.test(`${source.checkIn.mood.toLowerCase()} ${text}`)
  );
  const recentAdherence =
    source.recentWeeks.reduce((sum, week) => sum + week.adherencePct, 0) / source.recentWeeks.length;
  const recentMissedDoses = source.recentWeeks.reduce(
    (sum, week) => sum + Math.max(0, week.dosesExpected - week.dosesTaken),
    0
  );
  const weightLossPct = Math.max(
    0,
    ((source.baselineWeightKg - source.currentWeightKg) / source.baselineWeightKg) * 100
  );
  const hba1cDelta =
    typeof source.currentHba1cPct === "number" && typeof source.baselineHba1cPct === "number"
      ? source.currentHba1cPct - source.baselineHba1cPct
      : Number.NaN;
  const systolicBp =
    typeof source.currentSystolicBp === "number"
      ? source.currentSystolicBp
      : typeof source.baselineSystolicBp === "number"
        ? source.baselineSystolicBp
        : Number.NaN;

  return {
    week: source.week,
    adherence_last_2wk: recentAdherence,
    missed_doses_2wk: recentMissedDoses,
    nausea_score: source.checkIn.nauseaScore,
    hydration_risk: Math.max(0, 10 - source.checkIn.hydrationScore),
    energy_risk: Math.max(0, 10 - source.checkIn.energyScore),
    appetite_suppression: Math.max(0, 10 - source.checkIn.appetiteScore),
    weight_loss_pct: weightLossPct,
    hba1c_delta: hba1cDelta,
    systolic_bp: systolicBp,
    routine_disruption: Math.min(1, routineDisruption + acuteSymptomMentioned * 0.18),
    side_effect_spike: Math.max(
      0,
      source.checkIn.nauseaScore - source.previousNauseaScore + acuteSymptomMentioned * 0.8
    ),
    prior_failure: Number(!source.checkIn.medicationTaken),
    mood_anxious: moodAnxious
  };
}

export function extractModelFeatures(patient: Patient, checkIn: CheckInInput): Record<ModelFeatureName, number> {
  return engineerModelFeatures(buildModelFeatureSource(patient, checkIn));
}
