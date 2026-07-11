const assert = require("node:assert/strict");
const test = require("node:test");

const patients = require("../data/patients.json");

test("weekly snapshots use one planned weekly medication dose", () => {
  for (const patient of patients) {
    for (const snapshot of patient.weeklyData) {
      const context = `${patient.id} week ${snapshot.week}`;

      assert.equal(snapshot.dosesExpected, 1, `${context}: expected one planned dose`);
      assert.ok(
        snapshot.dosesTaken === 0 || snapshot.dosesTaken === 1,
        `${context}: dosesTaken must be zero or one`
      );
      assert.equal(
        snapshot.adherencePct,
        snapshot.dosesTaken * 100,
        `${context}: adherencePct must match the weekly dose outcome`
      );
    }
  }
});

test("Maya's two latest recorded weeks remain medication-adherent", () => {
  const maya = patients.find((patient) => patient.id === "maya-patel");
  const latestWeeks = maya.weeklyData.slice(-2);

  assert.equal(latestWeeks.length, 2);
  for (const snapshot of latestWeeks) {
    assert.equal(snapshot.dosesTaken, 1, `maya-patel week ${snapshot.week}: planned dose taken`);
    assert.equal(snapshot.adherencePct, 100, `maya-patel week ${snapshot.week}: fully adherent`);
  }
});
