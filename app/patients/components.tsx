import Link from "next/link";
import { ArrowLeft, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";
import type { RiskLevel } from "@/app/lib/types";

export function PatientDirectoryHeader({ backHref = "/", backLabel = "Live twin" }: { backHref?: string; backLabel?: string }) {
  return (
    <header className="directory-bar">
      <Link className="directory-brand" href="/">
        <span>
          <HeartPulse size={19} />
        </span>
        <strong>Adherence OS</strong>
        <small>Patient directory</small>
      </Link>
      <Link className="directory-back" href={backHref}>
        <ArrowLeft size={16} /> {backLabel}
      </Link>
    </header>
  );
}

export function PatientSummaryMetric({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className={`directory-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export function PatientRiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`directory-risk ${level}`}>{level}</span>;
}

export function DirectorySection({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section className="directory-section">
      <header>
        <p>{kicker}</p>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
