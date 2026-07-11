import { z } from "zod";

const score = z.number().min(0).max(10);

export const CheckInInputSchema = z.object({
  patientId: z.string().min(1),
  date: z.string().min(1),
  scenario: z.enum(["normal", "escalation", "custom"]),
  medicationTaken: z.boolean(),
  nauseaScore: score,
  appetiteScore: score,
  energyScore: score,
  hydrationScore: score,
  mood: z.string().min(1).max(120),
  sideEffects: z.string().max(4000),
  biomarkerNote: z.string().max(4000),
  freeText: z.string().max(8000)
});

export const CarePlanRequestSchema = z.object({
  patientId: z.string().min(1),
  checkIn: CheckInInputSchema
});

export const CarePlanSchema = z.object({
  riskLevel: z.enum(["steady", "watch", "review", "urgent"]),
  headline: z.string(),
  patientAction: z.string(),
  explanation: z.string(),
  safetyNotice: z.string(),
  escalation: z.object({
    needed: z.boolean(),
    urgency: z.enum(["none", "routine_async", "same_day", "urgent"]),
    reason: z.string(),
    channel: z.string()
  }),
  clinicianSummary: z.string(),
  clinicianDraft: z.string(),
  signals: z.array(z.string()),
  nextCheckInWindow: z.string(),
  ruleHits: z.array(z.string()),
  agentTrace: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      role: z.string(),
      status: z.enum(["complete", "escalated", "guarded"]),
      summary: z.string(),
      evidence: z.array(z.string())
    })
  ),
  judgeFit: z.object({
    userImpact: z.string(),
    innovation: z.string(),
    feasibility: z.string(),
    demoQuality: z.string()
  }),
  adherenceTwin: z.object({
    summary: z.string(),
    predictedFailurePoint: z.string(),
    riskDrivers: z.array(
      z.object({
        label: z.string(),
        impact: z.enum(["low", "medium", "high"]),
        evidence: z.string(),
        rescueMove: z.string()
      })
    ),
    protectiveFactors: z.array(z.string())
  }),
  rescuePlan: z.array(
    z.object({
      day: z.number(),
      label: z.string(),
      patientMicroAction: z.string(),
      monitoringSignal: z.string(),
      clinicianTrigger: z.string()
    })
  ),
  unsafeRequestDemo: z.object({
    request: z.string(),
    blocked: z.boolean(),
    patientResponse: z.string(),
    clinicianNote: z.string(),
    guardrails: z.array(z.string())
  })
});
