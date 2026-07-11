const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

async function check(path, validate) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  await validate(response);
  console.log(`ok ${path}`);
}

async function checkStatus(path, expectedStatus, validate) {
  const response = await fetchWithTimeout(`${baseUrl}${path}`);

  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned HTTP ${response.status}; expected ${expectedStatus}`);
  }

  await validate(response);
  console.log(`ok ${path} (${expectedStatus})`);
}

async function checkCarePlan(scenario, checkIn, validate) {
  const response = await fetchWithTimeout(`${baseUrl}/api/care-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId: checkIn.patientId, checkIn })
  });

  if (!response.ok) {
    throw new Error(`/api/care-plan (${scenario}) returned HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!payload?.plan || !["deterministic-rules", "rules-fallback"].includes(payload.source)) {
    throw new Error(`/api/care-plan (${scenario}) returned an invalid response envelope`);
  }

  if (typeof payload.meta?.providerAttempted !== "boolean" || !Number.isInteger(payload.meta?.durationMs) || payload.meta.durationMs < 0) {
    throw new Error(`/api/care-plan (${scenario}) returned invalid timing metadata`);
  }

  if (payload.source === "deterministic-rules" && !payload.meta.providerAttempted) {
    throw new Error(`/api/care-plan (${scenario}) reported provider validation without a provider attempt`);
  }

  if (payload.fallbackReason === "openai-not-configured" && payload.meta.providerAttempted) {
    throw new Error(`/api/care-plan (${scenario}) reported an unexpected provider attempt`);
  }

  await validate(payload);
  console.log(`ok /api/care-plan (${scenario})`);
}

const sharedCheckIn = {
  patientId: "maya-patel",
  date: "2026-07-08",
  appetiteScore: 5,
  mood: "steady",
  biomarkerNote: "Synthetic smoke-test biomarker note."
};

const normalCheckIn = {
  ...sharedCheckIn,
  scenario: "normal",
  medicationTaken: true,
  nauseaScore: 3,
  energyScore: 6,
  hydrationScore: 7,
  sideEffects: "Mild nausea after lunch.",
  freeText: "Routine is steady and the reminder worked."
};

const escalationCheckIn = {
  ...sharedCheckIn,
  scenario: "escalation",
  medicationTaken: false,
  nauseaScore: 8,
  appetiteScore: 2,
  energyScore: 3,
  hydrationScore: 2,
  mood: "anxious",
  sideEffects: "Vomiting twice today and struggling to keep fluids down.",
  freeText: "My stomach pain is getting worse and I feel lightheaded when I stand."
};

await check("/", async (response) => {
  const html = await response.text();
  if (!html.includes("Adherence OS")) throw new Error("home page is missing the product name");
  if (!html.includes("Decision evidence map") || !html.includes("Supporting evidence")) {
    throw new Error("home page is missing the commercial decision-first surface");
  }
  if (!html.includes('property="og:title"') || !html.includes("adherence-os-live-twin.jpg")) {
    throw new Error("home page is missing social preview metadata");
  }
});

await check("/api/health", async (response) => {
  const payload = await response.json();
  if (payload.status !== "ok" || payload.dataMode !== "synthetic") {
    throw new Error("health response did not report a ready synthetic demo");
  }
});

await check("/patients", async (response) => {
  const html = await response.text();
  if (!html.includes("Patient overview") || !html.includes("Maya Patel")) {
    throw new Error("patient directory is missing expected synthetic records");
  }
});

await check("/patients/maya-patel", async (response) => {
  const html = await response.text();
  if (!html.includes("Eight-week timeline") || !html.includes("Next recommended action")) {
    throw new Error("patient record is missing its decision summary");
  }
});

await checkStatus("/patients/not-a-patient", 200, async (response) => {
  const html = await response.text();
  if (
    !html.includes("Patient not found") ||
    !html.includes("Return to patient overview") ||
    !html.includes('name="robots" content="noindex"')
  ) {
    throw new Error("unknown patient route is missing its recovery state");
  }
});

await checkCarePlan("normal", normalCheckIn, async ({ plan }) => {
  if (plan.riskLevel === "urgent" || plan.escalation?.urgency === "urgent") {
    throw new Error("normal care-plan smoke check unexpectedly entered urgent mode");
  }

  if (plan.unsafeRequestDemo?.blocked !== true || plan.rescuePlan?.length !== 7) {
    throw new Error("normal care-plan smoke check is missing safety or rescue-plan output");
  }
});

await checkCarePlan("escalation", escalationCheckIn, async ({ plan }) => {
  if (plan.riskLevel !== "urgent" || plan.escalation?.needed !== true || plan.escalation?.urgency !== "urgent") {
    throw new Error("escalation care-plan smoke check did not activate urgent handoff");
  }

  if (!plan.ruleHits?.some((hit) => hit.startsWith("red flag:"))) {
    throw new Error("escalation care-plan smoke check is missing deterministic red-flag evidence");
  }

  if (plan.rescuePlan?.length !== 1 || !/draft|pending/i.test(`${plan.escalation?.channel} ${plan.clinicianDraft}`)) {
    throw new Error("escalation care-plan smoke check did not suppress coaching or expose draft-only handoff state");
  }

  const guardedText = `${plan.patientAction} ${plan.explanation} ${plan.clinicianDraft}`;
  if (/double the|increase (?:the )?dose|stop taking|diagnos/i.test(guardedText)) {
    throw new Error("escalation care-plan smoke check returned unsafe medication or diagnosis language");
  }
});

console.log(`smoke checks passed for ${baseUrl}`);
