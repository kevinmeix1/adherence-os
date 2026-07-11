import { applySafetyOverrides } from "@/app/lib/careEngine";
import type { CarePlan, CarePlanResponse, CheckInInput, Patient } from "@/app/lib/types";

export type CarePlanProviderContext = {
  patient: Patient;
  checkIn: CheckInInput;
  fallback: CarePlan;
};

export type CarePlanProvider = (context: CarePlanProviderContext) => Promise<CarePlan | null>;

export type ProviderResolution = {
  payload: CarePlanResponse;
  error?: unknown;
};

export async function resolveProviderCarePlan({
  patient,
  checkIn,
  fallback,
  provider
}: CarePlanProviderContext & { provider: CarePlanProvider }): Promise<ProviderResolution> {
  try {
    const generatedPlan = await provider({ patient, checkIn, fallback });

    if (!generatedPlan) {
      return {
        payload: {
          source: "rules-fallback",
          fallbackReason: "invalid-openai-output",
          plan: fallback
        }
      };
    }

    return {
      payload: {
        source: "deterministic-rules",
        plan: applySafetyOverrides(generatedPlan, patient, checkIn)
      }
    };
  } catch (error) {
    return {
      payload: {
        source: "rules-fallback",
        fallbackReason: "openai-error",
        plan: fallback
      },
      error
    };
  }
}
