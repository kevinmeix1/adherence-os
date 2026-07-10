import Link from "next/link";
import { ArrowRight, ClipboardCheck, UserRound } from "lucide-react";
import patientsData from "@/data/patients.json";
import { buildPatientDashboardRows } from "@/app/lib/patientDashboard";
import type { Patient, RiskLevel } from "@/app/lib/types";
import { PatientDirectoryHeader, PatientRiskBadge, PatientSummaryMetric } from "./components";

const patients = patientsData as Patient[];
const riskRank: Record<RiskLevel, number> = { steady: 0, watch: 1, review: 2, urgent: 3 };

export default function PatientsPage() {
  const rows = buildPatientDashboardRows(patients);

  if (rows.length === 0) {
    return (
      <main className="directory-shell">
        <PatientDirectoryHeader />
        <section className="directory-empty">
          <UserRound size={28} />
          <h1>No synthetic patients loaded</h1>
          <p>Check the local data file before starting the demo.</p>
        </section>
      </main>
    );
  }

  const averageAdherence = Math.round(rows.reduce((sum, row) => sum + row.adherencePct, 0) / rows.length);
  const missedCheckIns = rows.reduce((sum, row) => sum + row.missedCheckIns, 0);
  const needsReview = rows.filter((row) => row.riskLevel !== "steady").length;
  const topPriority = [...rows].sort((a, b) => riskRank[b.riskLevel] - riskRank[a.riskLevel])[0];

  return (
    <main className="directory-shell">
      <PatientDirectoryHeader />
      <div className="directory-content">
        <header className="directory-hero">
          <div>
            <p className="directory-kicker">Synthetic care cohort</p>
            <h1>Patient overview</h1>
            <p>Adherence, engagement, risk and the next safe action in one operational view.</p>
          </div>
          <span className="directory-data-badge">
            <ClipboardCheck size={16} /> Synthetic data only
          </span>
        </header>

        <section className="directory-metrics" aria-label="Patient dashboard summary">
          <PatientSummaryMetric label="Adherence" value={`${averageAdherence}%`} note="Eight-week cohort average" tone="steady" />
          <PatientSummaryMetric label="Missed check-ins" value={String(missedCheckIns)} note="Across active programmes" tone="watch" />
          <PatientSummaryMetric label="Risk level" value={`${needsReview} watch`} note={`${rows.length} active patients`} tone={needsReview > 0 ? "watch" : "steady"} />
          <PatientSummaryMetric label="Next action" value={`Review ${topPriority.patient.name.split(" ")[0]}`} note={topPriority.nextAction} tone="action" />
        </section>

        <section className="directory-table-wrap">
          <header>
            <div>
              <p className="directory-kicker">Care-team queue</p>
              <h2>Active patients</h2>
            </div>
            <span>{rows.length} records</span>
          </header>
          <div className="directory-table" role="table" aria-label="Synthetic patient list">
            <div className="directory-row directory-row-head" role="row">
              <span>Patient</span>
              <span>Adherence</span>
              <span>Missed check-ins</span>
              <span>Risk</span>
              <span>Next recommended action</span>
              <span aria-hidden="true" />
            </div>
            {rows.map((row) => (
              <Link className="directory-row" href={`/patients/${row.patient.id}`} key={row.patient.id} role="row">
                <span className="directory-patient-cell">
                  <i>{row.patient.name.slice(0, 1)}</i>
                  <span>
                    <strong>{row.patient.name}</strong>
                    <small>{row.patient.conditionFocus}</small>
                  </span>
                </span>
                <strong>{row.adherencePct}%</strong>
                <span>{row.missedCheckIns}</span>
                <PatientRiskBadge level={row.riskLevel} />
                <span className="directory-next-action">{row.nextAction}</span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
