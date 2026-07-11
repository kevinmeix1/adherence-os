const assert = require("node:assert/strict");
const test = require("node:test");

const patientData = require("../data/patients.json");
const { PatientDataValidationError, parsePatients, patients } = require("../app/lib/patients.ts");

function clonePatientData() {
  return structuredClone(patientData);
}

test("checked-in synthetic patient data passes runtime validation", () => {
  assert.equal(patients.length, 3);
  assert.deepEqual(parsePatients(patientData), patients);
});

test("patient validation reports a precise path for out-of-range values", () => {
  const invalidData = clonePatientData();
  invalidData[0].weeklyData[0].adherencePct = 120;

  assert.throws(
    () => parsePatients(invalidData),
    (error) => {
      assert.ok(error instanceof PatientDataValidationError);
      assert.match(error.message, /patients\[0\]\.weeklyData\[0\]\.adherencePct/);
      assert.match(error.message, /no greater than 100/);
      return true;
    }
  );
});

test("patient validation rejects inconsistent cohort identifiers", () => {
  const invalidData = clonePatientData();
  invalidData[1].id = invalidData[0].id;

  assert.throws(() => parsePatients(invalidData), /patients\[1\]\.id: duplicate patient id/);
});
