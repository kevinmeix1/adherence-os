const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { buildLatestCheckIn, buildPatientDashboardRows } = require("../app/lib/patientDashboard.ts");

test("patient dashboard creates a typed summary for every synthetic patient", () => {
  const rows = buildPatientDashboardRows(patients);

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.patient.id), patients.map((patient) => patient.id));
  assert.ok(rows.every((row) => row.adherencePct >= 0 && row.adherencePct <= 100));
  assert.ok(rows.every((row) => row.nextAction.length > 0));
});

test("patient dashboard surfaces engagement and latest-snapshot risk", () => {
  const rows = buildPatientDashboardRows(patients);
  const maya = rows.find((row) => row.patient.id === "maya-patel");

  assert.equal(maya.missedCheckIns, 1);
  assert.equal(maya.riskLevel, "watch");
  assert.equal(buildLatestCheckIn(maya.patient).medicationTaken, false);
  assert.ok(maya.modelRisk >= 0 && maya.modelRisk <= 1);
});
