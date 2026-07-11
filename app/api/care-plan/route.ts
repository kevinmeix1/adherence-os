import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { evaluateCheckIn, SAFETY_NOTICE } from "@/app/lib/careEngine";
import { resolveProviderCarePlan } from "@/app/lib/carePlanProvider";
import { patients } from "@/app/lib/patients";
import { CarePlanRequestSchema, CarePlanSchema } from "@/app/lib/schemas";
import type { CarePlan, CarePlanResponse } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const OPENAI_TIMEOUT_MS = 8_000;

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsedRequest = CarePlanRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid care-plan request.",
        issues: parsedRequest.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      },
      { status: 400 }
    );
  }

  const body = parsedRequest.data;

  if (body.patientId !== body.checkIn.patientId) {
    return NextResponse.json({ error: "Patient identifiers do not match." }, { status: 400 });
  }

  const patient = patients.find((candidate) => candidate.id === body.patientId);

  if (!patient) {
    return NextResponse.json({ error: "Unknown patient" }, { status: 404 });
  }

  const fallback = evaluateCheckIn(patient, body.checkIn);

  if (!process.env.OPENAI_API_KEY) {
    return carePlanResponse(
      { source: "rules-fallback", fallbackReason: "openai-not-configured", plan: fallback },
      startedAt,
      false
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: OPENAI_TIMEOUT_MS
  });
  const resolution = await resolveProviderCarePlan({
    patient,
    checkIn: body.checkIn,
    fallback,
    provider: async () => {
      const response = await client.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.5",
        reasoning: { effort: "low" },
        input: [
          {
            role: "developer",
            content:
              "You are a chronic-care support assistant for an at-home GLP-1 metabolic care prototype. You support adherence and clinical triage. Never diagnose. Never recommend medication dose changes, stopping medication, restarting medication, or changing treatment. If symptoms may be urgent, escalate to a clinician or urgent care. Keep patient guidance simple, human, and action-oriented. Produce concise structured output only."
          },
          {
            role: "user",
            content: JSON.stringify({
              patient,
              checkIn: body.checkIn,
              deterministicSafetyAssessment: fallback,
              safetyNotice: SAFETY_NOTICE
            })
          }
        ],
        text: {
          format: zodTextFormat(CarePlanSchema, "care_plan")
        }
      });

      return response.output_parsed as CarePlan | null;
    }
  });

  if (resolution.error) {
    console.error(
      "OpenAI care plan generation failed",
      resolution.error instanceof Error ? resolution.error.message : "unknown provider error"
    );
  }

  return carePlanResponse(resolution.payload, startedAt, true);
}

function carePlanResponse(payload: CarePlanResponse, startedAt: number, providerAttempted: boolean) {
  return NextResponse.json({
    ...payload,
    meta: {
      providerAttempted,
      durationMs: Math.max(0, Date.now() - startedAt)
    }
  });
}
