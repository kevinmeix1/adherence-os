import type { SafetyFlagId } from "./safetyFlags";

export type RiskLevel = "steady" | "watch" | "review" | "urgent";

export type EscalationUrgency = "none" | "routine_async" | "same_day" | "urgent";

export type WeeklySnapshot = {
  week: number;
  date: string;
  weightKg: number;
  adherencePct: number;
  dosesTaken: number;
  dosesExpected: number;
  nauseaScore: number;
  appetiteScore: number;
  energyScore: number;
  mood: string;
  notes: string;
  biomarkers?: {
    hba1cPct?: number;
    fastingGlucoseMmol?: number;
    systolicBp?: number;
    diastolicBp?: number;
    restingHeartRate?: number;
  };
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  pronouns: string;
  conditionFocus: string;
  programme: string;
  startDate: string;
  currentWeek: number;
  engagement: {
    expectedCheckIns: number;
    completedCheckIns: number;
  };
  preferredTone: string;
  clinicalContext: string[];
  goals: string[];
  baseline: {
    weightKg: number;
    hba1cPct?: number;
    systolicBp?: number;
    diastolicBp?: number;
    restingHeartRate?: number;
  };
  riskFactors: string[];
  latestBiomarkers: {
    hba1cPct?: number;
    fastingGlucoseMmol?: number;
    systolicBp?: number;
    diastolicBp?: number;
    restingHeartRate?: number;
  };
  weeklyData: WeeklySnapshot[];
};

export type CheckInInput = {
  patientId: string;
  date: string;
  scenario: "normal" | "escalation" | "custom";
  medicationTaken: boolean;
  nauseaScore: number;
  appetiteScore: number;
  energyScore: number;
  hydrationScore: number;
  mood: string;
  safetyFlags: SafetyFlagId[];
  sideEffects: string;
  biomarkerNote: string;
  freeText: string;
};

export type AgentTraceStep = {
  id: string;
  label: string;
  role: string;
  status: "complete" | "escalated" | "guarded";
  summary: string;
  evidence: string[];
};

export type JudgeFit = {
  userImpact: string;
  innovation: string;
  feasibility: string;
  demoQuality: string;
};

export type AdherenceTwin = {
  summary: string;
  predictedFailurePoint: string;
  riskDrivers: Array<{
    label: string;
    impact: "low" | "medium" | "high";
    evidence: string;
    rescueMove: string;
  }>;
  protectiveFactors: string[];
};

export type RescuePlanDay = {
  day: number;
  label: string;
  patientMicroAction: string;
  monitoringSignal: string;
  clinicianTrigger: string;
};

export type UnsafeRequestDemo = {
  request: string;
  blocked: boolean;
  patientResponse: string;
  clinicianNote: string;
  guardrails: string[];
};

export type CarePlan = {
  riskLevel: RiskLevel;
  headline: string;
  patientAction: string;
  explanation: string;
  safetyNotice: string;
  escalation: {
    needed: boolean;
    urgency: EscalationUrgency;
    reason: string;
    channel: string;
  };
  clinicianSummary: string;
  clinicianDraft: string;
  signals: string[];
  nextCheckInWindow: string;
  ruleHits: string[];
  agentTrace: AgentTraceStep[];
  judgeFit: JudgeFit;
  adherenceTwin: AdherenceTwin;
  rescuePlan: RescuePlanDay[];
  unsafeRequestDemo: UnsafeRequestDemo;
};

export type CarePlanResponse = {
  source: "deterministic-rules" | "rules-fallback";
  fallbackReason?: "openai-not-configured" | "openai-error" | "invalid-openai-output";
  plan: CarePlan;
  meta?: {
    providerAttempted: boolean;
    durationMs: number;
  };
};
