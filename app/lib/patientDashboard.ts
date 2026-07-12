import { DEMO_CHECK_INS, evaluateCheckIn, getPatientInsights } from "./careEngine";
import { scorePatientRisk } from "./edgeModel";
import type { CarePlan, CheckInInput, Patient, RiskLevel } from "./types";

export type PatientDashboardRow = {
  patient: Patient;
  adherencePct: number;
  missedCheckIns: number;
  riskLevel: RiskLevel;
  modelRisk: number | null;
  nextAction: string;
  weightChangeKg: number;
  lastCheckInDate: string;
};

export type ClinicianDashboardRow = {
  patient: Patient;
  plan: CarePlan;
  insights: ReturnType<typeof getPatientInsights>;
};

export function buildClinicianDashboardRows(
  patients: Patient[],
  selectedPatientId: string,
  selectedPlan: CarePlan,
  date: string
): ClinicianDashboardRow[] {
  return patients.map((patient) => ({
    patient,
    plan:
      patient.id === selectedPatientId
        ? selectedPlan
        : evaluateCheckIn(patient, {
            patientId: patient.id,
            date,
            ...DEMO_CHECK_INS.normal
          }),
    insights: getPatientInsights(patient)
  }));
}

export function buildPatientDashboardRows(patients: Patient[]): PatientDashboardRow[] {
  return patients.map((patient) => {
    const checkIn = buildLatestCheckIn(patient);
    const insights = getPatientInsights(patient);
    const plan = evaluateCheckIn(patient, checkIn);
    const edgeRisk = scorePatientRisk(patient, checkIn);

    return {
      patient,
      adherencePct: Math.round(insights.adherenceAvg),
      missedCheckIns: Math.max(0, patient.engagement.expectedCheckIns - patient.engagement.completedCheckIns),
      riskLevel: plan.riskLevel,
      modelRisk: edgeRisk.support.status === "supported" ? edgeRisk.risk : null,
      nextAction: plan.patientAction,
      weightChangeKg: insights.weightDelta,
      lastCheckInDate: insights.latest.date
    };
  });
}

export function buildLatestCheckIn(patient: Patient): CheckInInput {
  const latest = patient.weeklyData[patient.weeklyData.length - 1];
  const hydrationScore = Math.max(2, Math.min(10, Math.round(9 - latest.nauseaScore * 0.4)));

  return {
    patientId: patient.id,
    date: latest.date,
    scenario: "custom",
    medicationTaken: latest.dosesTaken >= latest.dosesExpected,
    nauseaScore: latest.nauseaScore,
    appetiteScore: latest.appetiteScore,
    energyScore: latest.energyScore,
    hydrationScore,
    mood: latest.mood,
    safetyFlags: [],
    sideEffects: latest.notes,
    biomarkerNote: latest.biomarkers ? "Latest at-home biomarker snapshot received." : "No new biomarker snapshot this week.",
    freeText: latest.notes
  };
}
