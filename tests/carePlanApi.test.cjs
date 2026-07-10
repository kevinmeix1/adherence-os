const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { POST } = require("../app/api/care-plan/route.ts");
const { DEMO_CHECK_INS } = require("../app/lib/careEngine.ts");

const patient = patients[0];

function requestFor(body) {
  return new Request("http://localhost/api/care-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function validBody() {
  return {
    patientId: patient.id,
    checkIn: {
      patientId: patient.id,
      date: "2026-07-08",
      ...DEMO_CHECK_INS.normal
    }
  };
}

test("care-plan API rejects invalid JSON", async () => {
  const request = new Request("http://localhost/api/care-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });

  const response = await POST(request);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid JSON/i);
});

test("care-plan API rejects invalid scores and mismatched patients", async () => {
  const invalidScore = validBody();
  invalidScore.checkIn.nauseaScore = 11;

  const scoreResponse = await POST(requestFor(invalidScore));
  assert.equal(scoreResponse.status, 400);
  assert.match((await scoreResponse.json()).error, /invalid care-plan request/i);

  const mismatch = validBody();
  mismatch.checkIn.patientId = patients[1].id;

  const mismatchResponse = await POST(requestFor(mismatch));
  assert.equal(mismatchResponse.status, 400);
  assert.match((await mismatchResponse.json()).error, /identifiers do not match/i);
});

test("care-plan API returns a disclosed deterministic fallback without an API key", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await POST(requestFor(validBody()));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.source, "rules-fallback");
    assert.equal(payload.fallbackReason, "openai-not-configured");
    assert.equal(payload.plan.riskLevel, "steady");
  } finally {
    if (originalApiKey) process.env.OPENAI_API_KEY = originalApiKey;
  }
});
