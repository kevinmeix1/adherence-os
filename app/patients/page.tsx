import Link from "next/link";
import { ArrowRight, ClipboardCheck, UserRound } from "lucide-react";
import { buildPatientDashboardRows } from "@/app/lib/patientDashboard";
import { patients } from "@/app/lib/patients";
import type { RiskLevel } from "@/app/lib/types";
import { PatientDirectoryHeader, PatientRiskBadge, PatientSummaryMetric } from "./components";

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
            <p>Adherence, engagement, rule state and the next bounded action in one operational view.</p>
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
          <div
            className="directory-table"
            role="table"
            aria-label="Synthetic patient list"
            aria-colcount={6}
            aria-rowcount={rows.length + 1}
          >
            <div className="directory-row directory-row-head" role="row">
              <span role="columnheader">Patient</span>
              <span role="columnheader">Adherence</span>
              <span role="columnheader">Missed check-ins</span>
              <span role="columnheader">Risk</span>
              <span role="columnheader">Next recommended action</span>
              <span role="columnheader">Record</span>
            </div>
            {rows.map((row) => (
              <div className="directory-row" key={row.patient.id} role="row" aria-label={`${row.patient.name} patient summary`}>
                <span className="directory-patient-cell" role="cell">
                  <i>{row.patient.name.slice(0, 1)}</i>
                  <span>
                    <strong>{row.patient.name}</strong>
                    <small>{row.patient.conditionFocus}</small>
                  </span>
                </span>
                <strong role="cell">{row.adherencePct}%</strong>
                <span role="cell">{row.missedCheckIns}</span>
                <span className="directory-risk-cell" role="cell">
                  <PatientRiskBadge level={row.riskLevel} />
                </span>
                <span className="directory-next-action" role="cell">{row.nextAction}</span>
                <span className="directory-row-action-cell" role="cell">
                  <Link
                    className="directory-row-action"
                    href={`/patients/${row.patient.id}`}
                    aria-label={`Open ${row.patient.name} patient record`}
                  >
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
