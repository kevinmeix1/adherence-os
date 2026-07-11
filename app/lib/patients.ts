import patientData from "@/data/patients.json";
import type { Patient, WeeklySnapshot } from "./types";

type JsonObject = Record<string, unknown>;
type NumberRules = { min?: number; max?: number; integer?: boolean };
type Biomarkers = NonNullable<WeeklySnapshot["biomarkers"]>;

export class PatientDataValidationError extends Error {
  constructor(path: string, message: string) {
    super(`Synthetic patient data is invalid at ${path}: ${message}`);
    this.name = "PatientDataValidationError";
  }
}

function fail(path: string, message: string): never {
  throw new PatientDataValidationError(path, message);
}

function expectObject(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "expected an object");
  }

  return value as JsonObject;
}

function expectString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    fail(path, allowEmpty ? "expected a string" : "expected a non-empty string");
  }

  return value;
}

function expectNumber(value: unknown, path: string, rules: NumberRules = {}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "expected a finite number");
  }

  if (rules.integer && !Number.isInteger(value)) fail(path, "expected an integer");
  if (rules.min !== undefined && value < rules.min) fail(path, `expected a value of at least ${rules.min}`);
  if (rules.max !== undefined && value > rules.max) fail(path, `expected a value no greater than ${rules.max}`);

  return value;
}

function expectDate(value: unknown, path: string): string {
  const date = expectString(value, path);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(path, "expected an ISO date in YYYY-MM-DD format");

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    fail(path, "expected a valid calendar date");
  }

  return date;
}

function expectStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "expected an array");
  return value.map((item, index) => expectString(item, `${path}[${index}]`));
}

function optionalNumber(record: JsonObject, key: string, path: string, rules: NumberRules): number | undefined {
  const value = record[key];
  return value === undefined ? undefined : expectNumber(value, `${path}.${key}`, rules);
}

function parseBiomarkers(value: unknown, path: string): Biomarkers {
  const record = expectObject(value, path);

  return {
    hba1cPct: optionalNumber(record, "hba1cPct", path, { min: 2, max: 20 }),
    fastingGlucoseMmol: optionalNumber(record, "fastingGlucoseMmol", path, { min: 1, max: 40 }),
    systolicBp: optionalNumber(record, "systolicBp", path, { min: 50, max: 260 }),
    diastolicBp: optionalNumber(record, "diastolicBp", path, { min: 30, max: 180 }),
    restingHeartRate: optionalNumber(record, "restingHeartRate", path, { min: 20, max: 240 })
  };
}

function parseWeeklySnapshot(value: unknown, path: string): WeeklySnapshot {
  const record = expectObject(value, path);
  const dosesTaken = expectNumber(record.dosesTaken, `${path}.dosesTaken`, { min: 0, integer: true });
  const dosesExpected = expectNumber(record.dosesExpected, `${path}.dosesExpected`, { min: 1, integer: true });

  if (dosesTaken > dosesExpected) fail(`${path}.dosesTaken`, "cannot exceed dosesExpected");

  const snapshot: WeeklySnapshot = {
    week: expectNumber(record.week, `${path}.week`, { min: 1, max: 104, integer: true }),
    date: expectDate(record.date, `${path}.date`),
    weightKg: expectNumber(record.weightKg, `${path}.weightKg`, { min: 20, max: 400 }),
    adherencePct: expectNumber(record.adherencePct, `${path}.adherencePct`, { min: 0, max: 100 }),
    dosesTaken,
    dosesExpected,
    nauseaScore: expectNumber(record.nauseaScore, `${path}.nauseaScore`, { min: 0, max: 10 }),
    appetiteScore: expectNumber(record.appetiteScore, `${path}.appetiteScore`, { min: 0, max: 10 }),
    energyScore: expectNumber(record.energyScore, `${path}.energyScore`, { min: 0, max: 10 }),
    mood: expectString(record.mood, `${path}.mood`),
    notes: expectString(record.notes, `${path}.notes`, true)
  };

  if (record.biomarkers !== undefined) snapshot.biomarkers = parseBiomarkers(record.biomarkers, `${path}.biomarkers`);

  return snapshot;
}

function parsePatient(value: unknown, index: number): Patient {
  const path = `patients[${index}]`;
  const record = expectObject(value, path);
  const engagement = expectObject(record.engagement, `${path}.engagement`);
  const baseline = expectObject(record.baseline, `${path}.baseline`);
  const currentWeek = expectNumber(record.currentWeek, `${path}.currentWeek`, { min: 1, max: 104, integer: true });

  if (!Array.isArray(record.weeklyData) || record.weeklyData.length === 0) {
    fail(`${path}.weeklyData`, "expected at least one weekly snapshot");
  }

  const weeklyData = record.weeklyData.map((snapshot, weekIndex) =>
    parseWeeklySnapshot(snapshot, `${path}.weeklyData[${weekIndex}]`)
  );

  weeklyData.forEach((snapshot, weekIndex) => {
    const expectedWeek = weekIndex + 1;
    if (snapshot.week !== expectedWeek) {
      fail(`${path}.weeklyData[${weekIndex}].week`, `expected sequential week ${expectedWeek}`);
    }

    if (weekIndex > 0 && snapshot.date <= weeklyData[weekIndex - 1].date) {
      fail(`${path}.weeklyData[${weekIndex}].date`, "must be later than the previous snapshot date");
    }
  });

  if (weeklyData.at(-1)?.week !== currentWeek) {
    fail(`${path}.currentWeek`, "must match the final weekly snapshot");
  }

  const expectedCheckIns = expectNumber(engagement.expectedCheckIns, `${path}.engagement.expectedCheckIns`, {
    min: 0,
    max: 104,
    integer: true
  });
  const completedCheckIns = expectNumber(engagement.completedCheckIns, `${path}.engagement.completedCheckIns`, {
    min: 0,
    max: 104,
    integer: true
  });

  if (completedCheckIns > expectedCheckIns) {
    fail(`${path}.engagement.completedCheckIns`, "cannot exceed expectedCheckIns");
  }

  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
    age: expectNumber(record.age, `${path}.age`, { min: 18, max: 120, integer: true }),
    pronouns: expectString(record.pronouns, `${path}.pronouns`),
    conditionFocus: expectString(record.conditionFocus, `${path}.conditionFocus`),
    programme: expectString(record.programme, `${path}.programme`),
    startDate: expectDate(record.startDate, `${path}.startDate`),
    currentWeek,
    engagement: { expectedCheckIns, completedCheckIns },
    preferredTone: expectString(record.preferredTone, `${path}.preferredTone`),
    clinicalContext: expectStringArray(record.clinicalContext, `${path}.clinicalContext`),
    goals: expectStringArray(record.goals, `${path}.goals`),
    baseline: {
      weightKg: expectNumber(baseline.weightKg, `${path}.baseline.weightKg`, { min: 20, max: 400 }),
      ...parseBiomarkers(baseline, `${path}.baseline`)
    },
    riskFactors: expectStringArray(record.riskFactors, `${path}.riskFactors`),
    latestBiomarkers: parseBiomarkers(record.latestBiomarkers, `${path}.latestBiomarkers`),
    weeklyData
  };
}

export function parsePatients(value: unknown): Patient[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("patients", "expected a non-empty array");
  }

  const parsed = value.map(parsePatient);
  const seenIds = new Set<string>();

  parsed.forEach((patient, index) => {
    if (seenIds.has(patient.id)) fail(`patients[${index}].id`, `duplicate patient id "${patient.id}"`);
    seenIds.add(patient.id);
  });

  return parsed;
}

export const patients = parsePatients(patientData);
