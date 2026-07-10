import { notFound } from "next/navigation";
import { Activity, CalendarDays, Scale, ShieldCheck } from "lucide-react";
import patientsData from "@/data/patients.json";
import { buildPatientDashboardRows } from "@/app/lib/patientDashboard";
import type { Patient } from "@/app/lib/types";
import { DirectorySection, PatientDirectoryHeader, PatientRiskBadge, PatientSummaryMetric } from "../components";

const patients = patientsData as Patient[];

export function generateStaticParams() {
  return patients.map((patient) => ({ patientId: patient.id }));
}

export default async function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const row = buildPatientDashboardRows(patients).find((candidate) => candidate.patient.id === patientId);

  if (!row) notFound();

  const patient = row.patient;

  return (
    <main className="directory-shell">
      <PatientDirectoryHeader backHref="/patients" backLabel="Patient overview" />
      <div className="directory-content">
        <header className="patient-record-hero">
          <div className="patient-record-identity">
            <span>{patient.name.slice(0, 1)}</span>
            <div>
              <p className="directory-kicker">Week {patient.currentWeek} / synthetic record</p>
              <h1>{patient.name}</h1>
              <p>{patient.programme}</p>
            </div>
          </div>
          <PatientRiskBadge level={row.riskLevel} />
        </header>

        <section className="directory-metrics patient-record-metrics" aria-label="Patient summary">
          <PatientSummaryMetric label="Adherence" value={`${row.adherencePct}%`} note="Eight-week average" tone="steady" />
          <PatientSummaryMetric label="Missed check-ins" value={String(row.missedCheckIns)} note={`${patient.engagement.completedCheckIns}/${patient.engagement.expectedCheckIns} completed`} tone="watch" />
          <PatientSummaryMetric label="Risk level" value={row.riskLevel} note={`${Math.round(row.modelRisk * 100)}% ML adherence risk`} tone={row.riskLevel} />
          <PatientSummaryMetric label="Weight change" value={`${row.weightChangeKg.toFixed(1)} kg`} note={`Last check-in ${formatDate(row.lastCheckInDate)}`} tone="action" />
        </section>

        <section className={`patient-next-action ${row.riskLevel}`}>
          <div>
            <ShieldCheck size={21} />
            <span>Next recommended action</span>
          </div>
          <strong>{row.nextAction}</strong>
          <p>The recommendation supports adherence only. Diagnosis and medication changes remain with the clinical team.</p>
        </section>

        <div className="patient-record-grid">
          <DirectorySection kicker="Care context" title="What matters to this patient">
            <div className="patient-context-list">
              {patient.clinicalContext.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="patient-tag-group">
              {patient.riskFactors.map((factor) => (
                <span key={factor}>{factor}</span>
              ))}
            </div>
          </DirectorySection>

          <DirectorySection kicker="Programme goals" title="Outcomes being protected">
            <div className="patient-goal-list">
              {patient.goals.map((goal, index) => (
                <div key={goal}>
                  <span>{index + 1}</span>
                  <strong>{goal}</strong>
                </div>
              ))}
            </div>
          </DirectorySection>

          <section className="directory-section patient-timeline-section">
            <header>
              <p>Longitudinal record</p>
              <h2>Eight-week timeline</h2>
            </header>
            <div className="patient-timeline">
              {patient.weeklyData.map((week) => (
                <article key={week.week}>
                  <div className="patient-week-marker">
                    <span>W{week.week}</span>
                    <i />
                  </div>
                  <div>
                    <strong>{formatDate(week.date)}</strong>
                    <p>{week.notes}</p>
                  </div>
                  <div className="patient-week-stats">
                    <span><Activity size={14} /> {week.adherencePct}%</span>
                    <span><Scale size={14} /> {week.weightKg} kg</span>
                    <span><CalendarDays size={14} /> nausea {week.nauseaScore}/10</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
