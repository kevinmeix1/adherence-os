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

function buildNormalPlanMap() {
  return Object.fromEntries(patients.map((patient) => [patient.id, buildDemoPlan(patient, "normal")]));
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
  const james = rows.find((row) => row.patient.id === "james-oconnor");
  const aisha = rows.find((row) => row.patient.id === "aisha-rahman");

  assert.equal(maya.missedCheckIns, 1);
  assert.equal(maya.riskLevel, "watch");
  assert.equal(buildLatestCheckIn(maya.patient).medicationTaken, true);
  assert.ok(maya.modelRisk >= 0 && maya.modelRisk <= 1);
  assert.equal(james.modelRisk, null);
  assert.equal(aisha.modelRisk, null);
});

test("clinician queue preserves each patient's live plan independently", () => {
  const maya = patients.find((patient) => patient.id === "maya-patel");
  const coachingPlans = buildNormalPlanMap();
  const escalationPlans = {
    ...coachingPlans,
    [maya.id]: buildDemoPlan(maya, "escalation")
  };
  const coachingRows = buildClinicianDashboardRows(patients, coachingPlans);
  const escalationRows = buildClinicianDashboardRows(patients, escalationPlans);

  assert.equal(coachingRows.filter((row) => ["review", "urgent"].includes(row.plan.riskLevel)).length, 0);
  assert.equal(escalationRows.filter((row) => ["review", "urgent"].includes(row.plan.riskLevel)).length, 1);
  assert.equal(escalationRows.find((row) => row.patient.id === maya.id).plan.riskLevel, "urgent");
  assert.equal(escalationRows.find((row) => row.patient.id === "james-oconnor").plan.riskLevel, coachingPlans["james-oconnor"].riskLevel);
});
