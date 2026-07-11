const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");
const { DEMO_CHECK_INS, evaluateCheckIn } = require("../app/lib/careEngine.ts");
const {
  buildClinicianDashboardRows,
  buildLatestCheckIn,
  buildPatientDashboardRows
} = require("../app/lib/patientDashboard.ts");

function buildDemoPlan(patient, scenario) {
  return evaluateCheckIn(patient, {
    patientId: patient.id,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  });
}

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

test("clinician queue follows the selected live demo scenario", () => {
  const maya = patients.find((patient) => patient.id === "maya-patel");
  const coachingRows = buildClinicianDashboardRows(
    patients,
    maya.id,
    buildDemoPlan(maya, "normal"),
    "2026-07-08"
  );
  const escalationRows = buildClinicianDashboardRows(
    patients,
    maya.id,
    buildDemoPlan(maya, "escalation"),
    "2026-07-08"
  );

  assert.equal(coachingRows.filter((row) => ["review", "urgent"].includes(row.plan.riskLevel)).length, 0);
  assert.equal(escalationRows.filter((row) => ["review", "urgent"].includes(row.plan.riskLevel)).length, 1);
  assert.equal(escalationRows.find((row) => row.patient.id === maya.id).plan.riskLevel, "urgent");
});
