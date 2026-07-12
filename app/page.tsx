"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  HeartPulse,
  Home,
  MessageSquareText,
  Mic,
  MoreHorizontal,
  Network,
  PenLine,
  Pill,
  RotateCcw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_CHECK_INS, evaluateCheckIn, getPatientInsights, SAFETY_NOTICE } from "@/app/lib/careEngine";
import { SAFETY_FLAG_OPTIONS, type SafetyFlagId } from "@/app/lib/safetyFlags";
import { analyzeRiskSensitivity, explainRiskScore, getModelSampleRows, scorePatientRisk } from "@/app/lib/edgeModel";
import { buildAdherenceKnowledgeGraph } from "@/app/lib/knowledgeGraph";
import { buildClinicianDashboardRows } from "@/app/lib/patientDashboard";
import { patients } from "@/app/lib/patients";
import type { AgentTraceStep, CarePlan, CarePlanResponse, CheckInInput, Patient, RiskLevel, WeeklySnapshot } from "@/app/lib/types";
import type { EdgeRiskResult } from "@/app/lib/edgeModel";
import type { AdherenceKnowledgeGraph, KnowledgeGraphNode } from "@/app/lib/knowledgeGraph";

type View = "patient" | "clinician" | "model" | "graph" | "scorecard" | "scripts" | "safety";
type GraphFocusMode = "decision" | "neighborhood" | "attribution" | "all";

const riskLabels: Record<RiskLevel, string> = {
  steady: "Steady",
  watch: "Watch",
  review: "Review",
  urgent: "Urgent"
};

export default function HomePage() {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0].id);
  const [view, setView] = useState<View>("graph");
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];
  const [checkIn, setCheckIn] = useState<CheckInInput>(() => buildCheckIn(selectedPatient.id, "normal"));
  const [carePlan, setCarePlan] = useState<CarePlan>(() => evaluateCheckIn(selectedPatient, checkIn));
  const [source, setSource] = useState<CarePlanResponse["source"]>("rules-fallback");
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [carePlanAnnouncement, setCarePlanAnnouncement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [graphResetVersion, setGraphResetVersion] = useState(0);
  const requestVersionRef = useRef(0);

  const patientInsights = useMemo(() => getPatientInsights(selectedPatient), [selectedPatient]);
  const edgeRisk = useMemo(() => scorePatientRisk(selectedPatient, checkIn), [selectedPatient, checkIn]);
  const knowledgeGraph = useMemo(
    () =>
      buildAdherenceKnowledgeGraph({
        patient: selectedPatient,
        checkIn,
        carePlan,
        edgeRisk,
        cohort: patients
      }),
    [selectedPatient, checkIn, carePlan, edgeRisk]
  );
  const clinicianPlans = useMemo(
    () => buildClinicianDashboardRows(patients, selectedPatient.id, carePlan, checkIn.date),
    [carePlan, checkIn.date, selectedPatient.id]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  function selectPatient(patientId: string) {
    const patient = patients.find((candidate) => candidate.id === patientId) ?? patients[0];
    if (patient.id === selectedPatientId) return;
    const nextCheckIn = buildCheckIn(patient.id, "normal");
    requestVersionRef.current += 1;
    setSelectedPatientId(patient.id);
    setCheckIn(nextCheckIn);
    setCarePlan(evaluateCheckIn(patient, nextCheckIn));
    setSource("rules-fallback");
    setGenerationNotice(null);
    setCarePlanAnnouncement("");
    setIsLoading(false);
  }

  function loadScenario(scenario: "normal" | "escalation") {
    const nextCheckIn = buildCheckIn(selectedPatient.id, scenario);
    requestVersionRef.current += 1;
    setCheckIn(nextCheckIn);
    const nextPlan = evaluateCheckIn(selectedPatient, nextCheckIn);
    setCarePlan(nextPlan);
    setSource("rules-fallback");
    setGenerationNotice(null);
    setCarePlanAnnouncement(buildCarePlanAnnouncement(nextPlan));
    setIsLoading(false);
  }

  function updateCheckIn(nextCheckIn: CheckInInput) {
    requestVersionRef.current += 1;
    const nextPlan = evaluateCheckIn(selectedPatient, nextCheckIn);
    setCheckIn(nextCheckIn);
    setCarePlan(nextPlan);
    setSource("rules-fallback");
    setGenerationNotice("Check-in changed. The deterministic safety result updated immediately.");
    setCarePlanAnnouncement(buildCarePlanAnnouncement(nextPlan));
    setIsLoading(false);
  }

  function navigateTo(nextView: View) {
    setView(nextView);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      document.getElementById("main-workspace")?.focus({ preventScroll: true });
    });
  }

  function resetDemo() {
    const patient = patients[0];
    const nextCheckIn = buildCheckIn(patient.id, "normal");
    requestVersionRef.current += 1;
    setSelectedPatientId(patient.id);
    setCheckIn(nextCheckIn);
    setCarePlan(evaluateCheckIn(patient, nextCheckIn));
    setSource("rules-fallback");
    setGenerationNotice(null);
    setCarePlanAnnouncement("");
    setIsLoading(false);
    setView("graph");
    setGraphResetVersion((version) => version + 1);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function skipToWorkspace(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const workspace = document.getElementById("main-workspace");
    workspace?.focus({ preventScroll: true });
    workspace?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  async function submitCheckIn() {
    const requestVersion = ++requestVersionRef.current;
    setIsLoading(true);
    setCarePlanAnnouncement("");
    try {
      const response = await fetch("/api/care-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient.id, checkIn })
      });

      if (!response.ok) throw new Error("Care plan request failed");
      const payload = (await response.json()) as CarePlanResponse;
      if (requestVersion !== requestVersionRef.current) return;
      setCarePlan(payload.plan);
      setSource(payload.source);
      setGenerationNotice(getGenerationNotice(payload.fallbackReason, payload.meta));
      setCarePlanAnnouncement(buildCarePlanAnnouncement(payload.plan));
    } catch {
      if (requestVersion !== requestVersionRef.current) return;
      const fallbackPlan = evaluateCheckIn(selectedPatient, checkIn);
      setCarePlan(fallbackPlan);
      setSource("rules-fallback");
      setGenerationNotice("Care-plan API unavailable. The deterministic local safety engine produced this result.");
      setCarePlanAnnouncement(buildCarePlanAnnouncement(fallbackPlan));
    } finally {
      if (requestVersion === requestVersionRef.current) setIsLoading(false);
    }
  }

  return (
    <main className={`app-shell product-shell ${view === "graph" ? "graph-first-shell" : ""}`}>
      <a className="skip-link" href="#main-workspace" onClick={skipToWorkspace}>
        Skip to main content
      </a>
      <ProductHeader view={view} patient={selectedPatient} onNavigate={navigateTo} onReset={resetDemo} />

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {carePlanAnnouncement}
      </p>

      <section
        aria-label="Current care workspace"
        className="workspace product-workspace"
        id="main-workspace"
        tabIndex={-1}
      >
        {view !== "graph" && (
          <header className="topbar">
            <div>
              <p className="section-kicker">
                {view === "patient" ? "Home check-in" : view === "clinician" ? "Review queue" : "Model record"}
              </p>
              <h1>{selectedPatient.name}</h1>
              <p>{selectedPatient.programme}</p>
            </div>
            <div className="topbar-actions">
              <RiskPill level={carePlan.riskLevel} />
              <div className="ai-source">
                <ShieldCheck size={16} />
                Rules own safety
              </div>
            </div>
          </header>
        )}

        {view === "patient" && (
          <PatientView
            patient={selectedPatient}
            insights={patientInsights}
            checkIn={checkIn}
            carePlan={carePlan}
            isLoading={isLoading}
            generationNotice={generationNotice}
            onChange={updateCheckIn}
            onScenario={loadScenario}
            onSubmit={submitCheckIn}
          />
        )}
        {view === "clinician" && <ClinicianView rows={clinicianPlans} selectedPatientId={selectedPatient.id} onSelect={selectPatient} />}
        {view === "model" && <ModelLabView patient={selectedPatient} checkIn={checkIn} edgeRisk={edgeRisk} />}
        {view === "graph" && (
          <KnowledgeGraphView
            key={graphResetVersion}
            graph={knowledgeGraph}
            patient={selectedPatient}
            patients={patients}
            source={source}
            riskLevel={carePlan.riskLevel}
            carePlan={carePlan}
            edgeRisk={edgeRisk}
            onScenario={loadScenario}
            onSelectPatient={selectPatient}
            onNavigate={navigateTo}
          />
        )}
        {view === "scorecard" && <ScorecardView patient={selectedPatient} carePlan={carePlan} />}
        {view === "scripts" && <ScriptsView />}
        {view === "safety" && <SafetyView unsafeRequest={carePlan.unsafeRequestDemo} />}
      </section>
    </main>
  );
}

function buildCheckIn(patientId: string, scenario: "normal" | "escalation"): CheckInInput {
  return {
    patientId,
    date: "2026-07-08",
    ...DEMO_CHECK_INS[scenario]
  };
}

function NavButton({
  label,
  active,
  icon,
  onClick
}: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button aria-pressed={active} className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProductHeader({
  view,
  patient,
  onNavigate,
  onReset
}: {
  view: View;
  patient: Patient;
  onNavigate: (view: View) => void;
  onReset: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && menuRef.current?.open && !menuRef.current.contains(target)) {
        menuRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  function navigateFromMenu(nextView: View) {
    closeMenu();
    onNavigate(nextView);
  }

  function resetFromHeader() {
    closeMenu();
    onReset();
  }

  return (
    <header className="product-bar">
      <button className="product-brand" onClick={() => onNavigate("graph")} title="Open decision map">
        <span className="brand-mark" aria-hidden="true">A/</span>
        <span>
          <strong>Adherence OS</strong>
          <small>Care decision ledger</small>
        </span>
      </button>

      <nav className="product-nav" aria-label="Product navigation">
        <NavButton label="Decision map" active={view === "graph"} icon={<Network size={17} />} onClick={() => onNavigate("graph")} />
        <NavButton label="Check-in" active={view === "patient"} icon={<Home size={17} />} onClick={() => onNavigate("patient")} />
        <NavButton
          label="Review queue"
          active={view === "clinician"}
          icon={<Stethoscope size={17} />}
          onClick={() => onNavigate("clinician")}
        />
      </nav>

      <div className="product-bar-meta">
        <span className="demo-status">
          <i />
          Synthetic / local
        </span>
        <span className="current-patient">{patient.name}</span>
        <button className="demo-reset" aria-label="Reset demo" title="Reset demo" onClick={resetFromHeader}>
          <RotateCcw size={17} />
        </button>
        <details
          className="product-more"
          ref={menuRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeMenu();
              menuRef.current?.querySelector<HTMLElement>("summary")?.focus();
            }
          }}
        >
          <summary title="Open resources" aria-label="Open resources">
            <MoreHorizontal size={19} />
          </summary>
          <div>
            <Link href="/patients" onClick={closeMenu}>
              <UserRound size={16} /> Patient directory
            </Link>
            <button onClick={() => navigateFromMenu("safety")}>
              <ShieldCheck size={16} /> Safety boundary
            </button>
            <button onClick={() => navigateFromMenu("model")}>
              <BarChart3 size={16} /> Model record
            </button>
            <button onClick={() => navigateFromMenu("scripts")}>
              <ClipboardList size={16} /> Demo guide
            </button>
            <button onClick={() => navigateFromMenu("scorecard")}>
              <ClipboardCheck size={16} /> Evaluation brief
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}

function PatientView({
  patient,
  insights,
  checkIn,
  carePlan,
  isLoading,
  generationNotice,
  onChange,
  onScenario,
  onSubmit
}: {
  patient: Patient;
  insights: ReturnType<typeof getPatientInsights>;
  checkIn: CheckInInput;
  carePlan: CarePlan;
  isLoading: boolean;
  generationNotice: string | null;
  onChange: (input: CheckInInput) => void;
  onScenario: (scenario: "normal" | "escalation") => void;
  onSubmit: () => void;
}) {
  const handoffPending = carePlan.riskLevel === "urgent" || carePlan.riskLevel === "review";

  function updateSafetyFlag(flagId: SafetyFlagId, checked: boolean) {
    const safetyFlags = checked
      ? [...new Set([...checkIn.safetyFlags, flagId])]
      : checkIn.safetyFlags.filter((candidate) => candidate !== flagId);

    onChange({ ...checkIn, safetyFlags, scenario: "custom" });
  }

  return (
    <div className="patient-grid">
      <section className="panel checkin-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">60 second home check-in</p>
            <h2>Today</h2>
          </div>
          <div className="scenario-actions">
            <button
              aria-pressed={checkIn.scenario === "normal"}
              className={`icon-button text-button ${checkIn.scenario === "normal" ? "active" : ""}`}
              onClick={() => onScenario("normal")}
              title="Load normal demo"
            >
              <CheckCircle2 size={17} />
              Normal
            </button>
            <button
              aria-pressed={checkIn.scenario === "escalation"}
              className={`icon-button text-button danger ${checkIn.scenario === "escalation" ? "active" : ""}`}
              onClick={() => onScenario("escalation")}
              title="Load escalation demo"
            >
              <AlertTriangle size={17} />
              Escalation
            </button>
            {checkIn.scenario === "custom" && (
              <span className="scenario-custom-state" aria-label="Custom check-in">
                <PenLine size={15} /> Custom
              </span>
            )}
          </div>
        </div>

        <div className="form-grid">
          <label className="toggle-row wide">
            <span>
              <Pill size={18} />
              Planned weekly dose recorded
            </span>
            <input
              type="checkbox"
              checked={checkIn.medicationTaken}
              onChange={(event) => onChange({ ...checkIn, medicationTaken: event.target.checked, scenario: "custom" })}
            />
          </label>

          <fieldset className="safety-checklist">
            <legend>Symptoms needing urgent help now</legend>
            <p>Select any that are happening now.</p>
            <div className="safety-checklist-options">
              {SAFETY_FLAG_OPTIONS.map((option) => (
                <label className="safety-check-option" key={option.id}>
                  <input
                    type="checkbox"
                    checked={checkIn.safetyFlags.includes(option.id)}
                    onChange={(event) => updateSafetyFlag(option.id, event.target.checked)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Slider
            label="Nausea"
            value={checkIn.nauseaScore}
            icon={<Gauge size={18} />}
            onChange={(value) => onChange({ ...checkIn, nauseaScore: value, scenario: "custom" })}
          />
          <Slider
            label="Appetite"
            value={checkIn.appetiteScore}
            icon={<Activity size={18} />}
            onChange={(value) => onChange({ ...checkIn, appetiteScore: value, scenario: "custom" })}
          />
          <Slider
            label="Energy"
            value={checkIn.energyScore}
            icon={<Sparkles size={18} />}
            onChange={(value) => onChange({ ...checkIn, energyScore: value, scenario: "custom" })}
          />
          <Slider
            label="Hydration"
            value={checkIn.hydrationScore}
            icon={<HeartPulse size={18} />}
            onChange={(value) => onChange({ ...checkIn, hydrationScore: value, scenario: "custom" })}
          />

          <label className="field wide">
            <span>Mood</span>
            <select value={checkIn.mood} onChange={(event) => onChange({ ...checkIn, mood: event.target.value, scenario: "custom" })}>
              <option value="steady">steady</option>
              <option value="hopeful">hopeful</option>
              <option value="anxious">anxious</option>
              <option value="tired">tired</option>
              <option value="discouraged">discouraged</option>
            </select>
          </label>

          <label className="field wide">
            <span>Side effects</span>
            <textarea
              value={checkIn.sideEffects}
              onChange={(event) => onChange({ ...checkIn, sideEffects: event.target.value, scenario: "custom" })}
            />
          </label>

          <label className="field wide">
            <span>Biomarker note</span>
            <textarea
              value={checkIn.biomarkerNote}
              onChange={(event) => onChange({ ...checkIn, biomarkerNote: event.target.value, scenario: "custom" })}
            />
          </label>

          <label className="field wide">
            <span>
              <Mic size={16} />
              Voice note transcript
            </span>
            <textarea
              value={checkIn.freeText}
              onChange={(event) => onChange({ ...checkIn, freeText: event.target.value, scenario: "custom" })}
            />
          </label>
        </div>

        <button className="primary-action" onClick={onSubmit} disabled={isLoading}>
          <Send size={18} />
          {isLoading ? "Reviewing..." : "Review care plan"}
        </button>
        {generationNotice && (
          <div className="generation-notice">
            <ShieldCheck size={17} />
            <span>{generationNotice}</span>
          </div>
        )}
      </section>

      <section className="panel result-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Care plan</p>
            <h2>{carePlan.headline}</h2>
          </div>
          <RiskPill level={carePlan.riskLevel} />
        </div>

        <div className="care-moment">
          <div className={`care-index ${carePlan.riskLevel}`} aria-hidden="true">
            <span>Current plan</span>
            <strong>{riskLabels[carePlan.riskLevel]}</strong>
            <small>Week {patient.currentWeek}</small>
          </div>
          <div>
            <p className="patient-action">{carePlan.patientAction}</p>
            <p className="explanation">{carePlan.explanation}</p>
          </div>
        </div>

        <div className="metric-row">
          <Metric icon={<Scale size={18} />} label="Weight change" value={`${insights.weightDelta.toFixed(1)} kg`} />
          <Metric icon={<ClipboardCheck size={18} />} label="Adherence" value={`${Math.round(insights.adherenceAvg)}%`} />
          <Metric icon={<CalendarDays size={18} />} label="Next check-in" value={carePlan.nextCheckInWindow} />
        </div>

        <div className="signal-list">
          {carePlan.signals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>

        <div className={`escalation-strip ${carePlan.escalation.needed ? "active" : ""}`}>
          <ShieldCheck size={18} />
          <span>{carePlan.escalation.channel}</span>
        </div>

        <p className="safety-note">{carePlan.safetyNotice}</p>
      </section>

      <AdherenceTwinPanel twin={carePlan.adherenceTwin} />

      <RescuePlanPanel plan={carePlan.rescuePlan} />

      <AgentTracePanel trace={carePlan.agentTrace} title="Decision pipeline" kicker="Inspectable rule path" />

      <section className="panel trend-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Longitudinal context</p>
            <h2>8 week trend</h2>
          </div>
        </div>
        <TrendChart data={patient.weeklyData} metric="weightKg" label="Weight kg" />
        <TrendChart data={patient.weeklyData} metric="adherencePct" label="Adherence %" />
        <TrendChart data={patient.weeklyData} metric="nauseaScore" label="Nausea score" />
      </section>

      <section className="panel clinician-note-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">{handoffPending ? "Handoff draft" : "Care-team summary"}</p>
            <h2>{handoffPending ? "Pending care-team review" : "Available if review is needed"}</h2>
          </div>
          <MessageSquareText size={22} />
        </div>
        <p>{carePlan.clinicianSummary}</p>
        <blockquote>{carePlan.clinicianDraft}</blockquote>
      </section>
    </div>
  );
}

function AdherenceTwinPanel({ twin }: { twin: CarePlan["adherenceTwin"] }) {
  return (
    <section className="panel twin-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Adherence profile</p>
          <h2>Likely friction point</h2>
        </div>
        <Sparkles size={24} />
      </div>

      <p className="twin-summary">{twin.summary}</p>
      <div className="prediction-box">
        <strong>Heuristic pattern summary</strong>
        <span>{twin.predictedFailurePoint}</span>
      </div>

      <div className="driver-list">
        {twin.riskDrivers.map((driver) => (
          <article className={`driver-card ${driver.impact}`} key={driver.label}>
            <div className="driver-card-head">
              <strong>{driver.label}</strong>
              <span>{driver.impact}</span>
            </div>
            <p>{driver.evidence}</p>
            <small>{driver.rescueMove}</small>
          </article>
        ))}
      </div>

      <div className="protective-row">
        {twin.protectiveFactors.map((factor) => (
          <span key={factor}>{factor}</span>
        ))}
      </div>
    </section>
  );
}

function RescuePlanPanel({ plan }: { plan: CarePlan["rescuePlan"] }) {
  const coachingPaused = plan.length === 1;
  return (
    <section className="panel rescue-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">{coachingPaused ? "Immediate safety step" : "7-day support plan"}</p>
          <h2>{coachingPaused ? "Coaching paused pending review" : "Support the next adherence event"}</h2>
        </div>
        <CalendarDays size={24} />
      </div>

      <div className="rescue-strip">
        {plan.map((day) => (
          <article className="rescue-day" key={`${day.day}-${day.label}`}>
            <div className="rescue-day-number">D{day.day}</div>
            <strong>{day.label}</strong>
            <p>{day.patientMicroAction}</p>
            <small>{day.monitoringSignal}</small>
            <span>{day.clinicianTrigger}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ClinicianView({
  rows,
  selectedPatientId,
  onSelect
}: {
  rows: { patient: Patient; plan: CarePlan; insights: ReturnType<typeof getPatientInsights> }[];
  selectedPatientId: string;
  onSelect: (patientId: string) => void;
}) {
  const urgentCount = rows.filter((row) => row.plan.riskLevel === "urgent" || row.plan.riskLevel === "review").length;
  const selectedRow = rows.find((row) => row.patient.id === selectedPatientId) ?? rows[0];
  const selectedNeedsReview = selectedRow.plan.riskLevel === "urgent" || selectedRow.plan.riskLevel === "review";

  return (
    <div className="clinician-grid">
      <section className={`panel wide-panel clinician-review-hero ${selectedNeedsReview ? selectedRow.plan.riskLevel : "steady"}`}>
        <div className="clinician-review-heading">
          <div>
            <p className="section-kicker">Selected patient</p>
            <h2>{selectedRow.patient.name}</h2>
            <p>{selectedRow.patient.conditionFocus}</p>
          </div>
          <span className={`review-state ${selectedNeedsReview ? "pending" : "clear"}`}>
            {selectedNeedsReview ? "Pending review" : "No active review"}
          </span>
        </div>

        <div className="clinician-review-facts" aria-label="Selected review facts">
          <div>
            <span>Safety mode</span>
            <strong>{riskLabels[selectedRow.plan.riskLevel]}</strong>
          </div>
          <div>
            <span>Trigger</span>
            <strong>{selectedRow.plan.escalation.reason}</strong>
          </div>
          <div>
            <span>Ownership</span>
            <strong>{selectedNeedsReview ? "Unassigned" : "No active review"}</strong>
          </div>
          <div>
            <span>Delivery</span>
            <strong>{selectedNeedsReview ? "Draft only / not sent" : "No handoff created"}</strong>
          </div>
        </div>

        <div className="clinician-review-brief">
          <div>
            <span>Deterministic summary</span>
            <p>{selectedRow.plan.clinicianSummary}</p>
          </div>
          <blockquote>{selectedRow.plan.clinicianDraft}</blockquote>
        </div>
      </section>

      <section className="panel queue-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Clinical inbox</p>
            <h2>{urgentCount} pending review</h2>
          </div>
          <Stethoscope size={24} />
        </div>

        <div className="queue-list">
          {rows.map(({ patient, plan, insights }) => (
            <button
              key={patient.id}
              className={`queue-item ${patient.id === selectedPatientId ? "active" : ""}`}
              onClick={() => onSelect(patient.id)}
            >
              <div>
                <strong>{patient.name}</strong>
                <span>{patient.conditionFocus}</span>
              </div>
              <RiskPill level={plan.riskLevel} />
              <small>{Math.round(insights.lastTwoAdherence)}% recent adherence</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel population-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Population view</p>
            <h2>Signals before appointments</h2>
          </div>
          <BarChart3 size={24} />
        </div>

        <div className="metric-row">
          <Metric icon={<UserRound size={18} />} label="Active patients" value={String(rows.length)} />
          <Metric icon={<AlertTriangle size={18} />} label="Escalations" value={String(urgentCount)} />
          <Metric
            icon={<TrendingDown size={18} />}
            label="Avg weight change"
            value={`${(rows.reduce((sum, row) => sum + row.insights.weightDelta, 0) / rows.length).toFixed(1)} kg`}
          />
        </div>

        <div
          aria-label="Patient review table"
          className="clinician-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table className="clinician-table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Trend</th>
                <th scope="col">Safety mode</th>
                <th scope="col">Next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ patient, plan, insights }) => (
                <tr key={patient.id}>
                  <th scope="row">{patient.name}</th>
                  <td>{insights.weightDelta.toFixed(1)} kg, {Math.round(insights.adherenceAvg)}% adherence</td>
                  <td>{riskLabels[plan.riskLevel]}</td>
                  <td>{plan.escalation.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AgentTracePanel trace={selectedRow.plan.agentTrace} title={`${selectedRow.patient.name} trace`} kicker="Care-team audit trail" />

      <section className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Handoff drafts</p>
            <h2>Review before delivery</h2>
          </div>
        </div>
        <div className="handoff-grid">
          {rows.map(({ patient, plan }) => (
            <article key={patient.id} className="handoff-card">
              <div className="handoff-card-head">
                <strong>{patient.name}</strong>
                <RiskPill level={plan.riskLevel} />
              </div>
              <p>{plan.clinicianSummary}</p>
              <blockquote>{plan.clinicianDraft}</blockquote>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModelLabView({
  patient,
  checkIn,
  edgeRisk
}: {
  patient: Patient;
  checkIn: CheckInInput;
  edgeRisk: EdgeRiskResult;
}) {
  const artifact = edgeRisk.artifact;
  const modelSupported = edgeRisk.support.status === "supported";
  const explanation = explainRiskScore(edgeRisk, 6);
  const sensitivity = analyzeRiskSensitivity(edgeRisk);
  const topSensitivityFeatures = sensitivity?.features.slice(0, 5) ?? [];
  const maxSensitivitySpan = Math.max(...topSensitivityFeatures.map((feature) => feature.span), 0.001);
  const maxStepContribution = Math.max(...(explanation?.steps ?? []).map((step) => Math.abs(step.contribution)), 0.01);
  const parityRows = getModelSampleRows();
  const sampleRows = [...parityRows.slice(0, 3), ...parityRows.slice(-3)];
  const bestIntervention = edgeRisk.interventions.find((intervention) => intervention.rankable) ?? edgeRisk.interventions[0];

  return (
    <div className="model-grid">
      <section className="panel wide-panel model-hero">
        <div>
          <p className="section-kicker">Model record</p>
          <h2>Edge ML predicts next-week adherence interruption risk</h2>
          <p>
            A leakage-safe monotonic model scores structured home-care features in the browser. Sixteen patient-bootstrap members expose model spread while deterministic rules own safety.
          </p>
        </div>
        <div className="risk-dial">
          <span>{modelSupported ? formatPercent(edgeRisk.risk) : "Abstained"}</span>
          <strong>{modelSupported ? riskBand(edgeRisk.risk, artifact.metrics.threshold) : "Outside support"}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Training artifact</p>
            <h2>{artifact.target}</h2>
          </div>
          <BarChart3 size={24} />
        </div>
        <div className="metric-row compact-metrics">
          <Metric icon={<UserRound size={18} />} label="Patients" value={String(artifact.cohort.patients)} />
          <Metric icon={<ClipboardCheck size={18} />} label="Samples" value={artifact.metrics.samples.toLocaleString()} />
          <Metric icon={<TrendingDown size={18} />} label="Synthetic AUPRC" value={artifact.metrics.testAuprc.toFixed(3)} />
          <Metric icon={<Gauge size={18} />} label="Test recall" value={formatPercent(artifact.metrics.recallAtThreshold)} />
        </div>
        <p className="model-note">{artifact.cohort.description}</p>
        <div className="model-method-strip">
          <ShieldCheck size={17} />
          <div>
            <span>Constrained training</span>
            <strong>{artifact.constraints.method}</strong>
          </div>
          <small>{Object.keys(artifact.constraints.featureDirections).length} directional features</small>
        </div>
        <div className="model-provenance-grid" aria-label="Model artifact provenance">
          <div>
            <span>Version</span>
            <strong>{artifact.version}</strong>
          </div>
          <div>
            <span>Trained</span>
            <strong>{artifact.trainedAt}</strong>
          </div>
          <div>
            <span>Seed</span>
            <strong>{artifact.cohort.generationSeed}</strong>
          </div>
          <div>
            <span>Rows</span>
            <strong>{artifact.metrics.samples.toLocaleString()}</strong>
          </div>
          <div>
            <span>Threshold</span>
            <strong>{formatPercent(artifact.metrics.threshold)}</strong>
          </div>
          <div>
            <span>Precision</span>
            <strong>{formatPercent(artifact.metrics.precisionAtThreshold)}</strong>
          </div>
          <div>
            <span>Review rate</span>
            <strong>{formatPercent(artifact.metrics.reviewRateAtThreshold)}</strong>
          </div>
          <div>
            <span>Brier skill</span>
            <strong>{formatPercent(artifact.metrics.brierSkill)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Current patient inference</p>
            <h2>{patient.name}</h2>
          </div>
          <span className={`model-support-status ${modelSupported ? "supported" : "abstained"}`}>
            {modelSupported ? "Within training support" : "Model abstained"}
          </span>
        </div>
        <div className="inference-list">
          <span>Week {patient.currentWeek}</span>
          <span>Planned dose {checkIn.medicationTaken ? "recorded" : "missed"}</span>
          <span>Nausea {checkIn.nauseaScore}/10</span>
          <span>Hydration {checkIn.hydrationScore}/10</span>
        </div>
        <div className="prediction-box">
          <strong>Tested action status</strong>
          <span>
            {bestIntervention.rankable && bestIntervention.absoluteReduction !== null
              ? `${bestIntervention.label}: ${formatPercentagePoints(bestIntervention.absoluteReduction)} scenario-score decrease.`
              : "Numeric tested-action ranking is disabled outside synthetic training support."}
          </span>
        </div>
        {modelSupported ? (
          <div className="inference-list" aria-label="Bootstrap model spread">
            <span>{artifact.ensemble.members.length} bootstrap members</span>
            <span>Spread {formatPercent(edgeRisk.modelSpread.p10)}-{formatPercent(edgeRisk.modelSpread.p90)}</span>
            <span>No support exceptions</span>
          </div>
        ) : (
          <div className="inference-list" aria-label="Abstention reason">
            <span>Patient spread withheld</span>
            <span>Attribution and sensitivity withheld</span>
            <span>{edgeRisk.support.violations.map((violation) => violation.label).join(", ")}</span>
          </div>
        )}
      </section>

      {modelSupported && explanation && sensitivity ? (
        <>
      <section className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Explainability</p>
            <h2>Exact local risk decomposition</h2>
          </div>
          <Sparkles size={24} />
        </div>
        <div className="explanation-summary" aria-label="Risk explanation summary">
          <div>
            <span>Model baseline</span>
            <strong>{formatPercent(explanation.baselineRisk)}</strong>
            <small>Intercept probability</small>
          </div>
          <div className="explanation-shift">
            <ArrowRight size={18} />
            <strong>{formatSignedPercentagePoints(explanation.currentRisk - explanation.baselineRisk)}</strong>
            <small>Local feature shift</small>
          </div>
          <div>
            <span>Patient score</span>
            <strong>{formatPercent(explanation.currentRisk)}</strong>
            <small>All 14 features</small>
          </div>
          <div>
            <span>Top-six coverage</span>
            <strong>{formatPercent(explanation.topFeatureCoverage)}</strong>
            <small>Absolute attribution</small>
          </div>
        </div>
        <div className="contribution-list signed-contribution-list">
          {explanation.steps.map((step) => {
            const feature = edgeRisk.contributions.find((item) => item.name === step.id);
            const barWidth = Math.min(48, (Math.abs(step.contribution) / maxStepContribution) * 48);
            return (
            <div className="contribution-row" key={step.id}>
              <div>
                <strong>{step.label}</strong>
                <small>
                  {feature
                    ? `${formatFeatureValue(feature.rawValue)} / ${formatSignedNumber(feature.zScore, 1)} SD from baseline`
                    : `${step.featureCount} smaller effects combined`}
                </small>
              </div>
              <div className="contribution-track signed-track" aria-label={`${step.label} ${step.direction}`}>
                <i />
                <span
                  className={step.contribution >= 0 ? "risk-up" : "risk-down"}
                  style={{
                    left: step.contribution >= 0 ? "50%" : `${50 - barWidth}%`,
                    width: `${barWidth}%`
                  }}
                />
              </div>
              <div className="contribution-value">
                <strong>{formatSignedNumber(step.contribution, 2)}</strong>
                <small>{formatProbability(step.probabilityBefore)} to {formatProbability(step.probabilityAfter)}</small>
              </div>
            </div>
            );
          })}
        </div>
        <p className="attribution-footnote">
          {artifact.modelCard.explainability} Bars are signed log-odds contributions; probability changes are shown at right.
        </p>
      </section>

      <section className="panel wide-panel sensitivity-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Local sensitivity</p>
            <h2>How stable is this score when one input moves?</h2>
          </div>
          <Activity size={24} />
        </div>
        <div className="sensitivity-summary" aria-label="Local sensitivity summary">
          <div>
            <span>Current risk</span>
            <strong>{formatPercent(sensitivity.currentRisk)}</strong>
            <small>Patient score</small>
          </div>
          <div>
            <span>One-at-a-time range</span>
            <strong>{formatProbability(sensitivity.oneAtATimeLow)} to {formatProbability(sensitivity.oneAtATimeHigh)}</strong>
            <small>Single feature perturbed</small>
          </div>
          <div>
            <span>Bootstrap spread</span>
            <strong>
              {modelSupported
                ? `${formatProbability(edgeRisk.modelSpread.p10)} to ${formatProbability(edgeRisk.modelSpread.p90)}`
                : "Not reported"}
            </strong>
            <small>{edgeRisk.modelSpread.memberCount} patient-bootstrap models</small>
          </div>
          <div>
            <span>Decision threshold</span>
            <strong>{formatPercent(sensitivity.decisionThreshold)}</strong>
            <small>{formatThresholdDistance(sensitivity.distanceToThreshold)}</small>
          </div>
        </div>
        <div className="sensitivity-list">
          {topSensitivityFeatures.map((feature) => (
            <div className="sensitivity-row" key={feature.name}>
              <div>
                <strong>{feature.label}</strong>
                <small>{feature.direction} / {feature.perturbation}</small>
              </div>
              <div className="sensitivity-track" aria-label={`${feature.label} sensitivity span`}>
                <span style={{ width: formatBarWidth(feature.span / maxSensitivitySpan, 4) }} />
              </div>
              <div>
                <strong>{formatProbability(feature.minRisk)} to {formatProbability(feature.maxRisk)}</strong>
                <small>{formatSignedPercentagePoints(feature.maxRisk - feature.minRisk)} span</small>
              </div>
            </div>
          ))}
        </div>
        <p className="attribution-footnote">
          One feature is varied at a time within bounded synthetic ranges. This is a local sensitivity test, not a confidence interval or clinical uncertainty estimate.
        </p>
      </section>
        </>
      ) : (
        <section className="panel wide-panel model-abstention-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Patient-specific ML boundary</p>
              <h2>Attribution and sensitivity withheld</h2>
            </div>
            <ShieldCheck size={24} />
          </div>
          <div className="model-abstention-record">
            <AlertTriangle size={22} />
            <div>
              <strong>Outside synthetic training support</strong>
              <p>
                This record does not show a patient score, feature decomposition, bootstrap spread, or local sensitivity. Unsupported features: {edgeRisk.support.violations.map((violation) => violation.label).join(", ")}.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">What-if simulator</p>
            <h2>How does risk change under explicit assumptions?</h2>
          </div>
          <Activity size={24} />
        </div>
        <div className="simulation-grid">
          {edgeRisk.interventions.map((intervention) => (
            <article className="simulation-card" key={intervention.id}>
              <div className="simulation-card-head">
                <strong>{intervention.label}</strong>
                <span>
                  {intervention.absoluteReduction === null ? "Not ranked" : `-${formatPercentagePoints(intervention.absoluteReduction)}`}
                </span>
              </div>
              <p>{intervention.note}</p>
              <div className="sim-risk-row">
                <small>New risk</small>
                <strong>{intervention.risk === null ? "Outside support" : formatPercent(intervention.risk)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Held-out reliability</p>
            <h2>Predicted vs observed bins</h2>
          </div>
          <Gauge size={24} />
        </div>
        <div className="calibration-list">
          {artifact.metrics.calibration.map((bin) => (
            <div className="calibration-row" key={bin.bin}>
              <span>{bin.bin}</span>
              <div className="calibration-bars">
                <i style={{ width: formatBarWidth(bin.predicted) }} />
                <b style={{ width: formatBarWidth(bin.observed) }} />
              </div>
              <small>{bin.count} samples</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Model card</p>
            <h2>{artifact.modelType}</h2>
          </div>
          <ShieldCheck size={24} />
        </div>
        <p>{artifact.modelCard.intendedUse}</p>
        <blockquote>{artifact.modelCard.edgeInference}</blockquote>
        <div className="signal-list vertical">
          {artifact.modelCard.limitations.map((limitation) => (
            <span key={limitation}>{limitation}</span>
          ))}
        </div>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Synthetic cohort sample</p>
            <h2>Data in, prediction out</h2>
          </div>
          <ClipboardList size={24} />
        </div>
        <div className="sample-table">
          <div className="sample-row sample-head">
            <span>Week</span>
            <span>Adherence</span>
            <span>Nausea</span>
            <span>Hydration risk</span>
            <span>Routine</span>
            <span>Next-week miss</span>
          </div>
          {sampleRows.map((row, index) => (
            <div className="sample-row" key={`${row.patient_id}-${row.week}-${index}`}>
              <span>{row.week}</span>
              <span>{Math.round(row.adherence_last_2wk)}%</span>
              <span>{row.nausea_score.toFixed(1)}</span>
              <span>{row.hydration_risk.toFixed(1)}</span>
              <span>{row.routine_disruption.toFixed(2)}</span>
              <span>{row.target ? "yes" : "no"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KnowledgeGraphView({
  graph,
  patient,
  patients,
  source,
  riskLevel,
  carePlan,
  edgeRisk,
  onScenario,
  onSelectPatient,
  onNavigate
}: {
  graph: AdherenceKnowledgeGraph;
  patient: Patient;
  patients: Patient[];
  source: CarePlanResponse["source"];
  riskLevel: RiskLevel;
  carePlan: CarePlan;
  edgeRisk: EdgeRiskResult;
  onScenario: (scenario: "normal" | "escalation") => void;
  onSelectPatient: (patientId: string) => void;
  onNavigate: (view: View) => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<GraphFocusMode>("decision");
  const topMatch = graph.cohortMatches[0];
  const insights = getPatientInsights(patient);
  const bestIntervention = edgeRisk.interventions.find((intervention) => intervention.rankable) ?? edgeRisk.interventions[0];
  const firstName = patient.name.split(" ")[0];
  const selectedNode =
    graph.nodes.find((node) => node.id === selectedNodeId) ??
    graph.nodes.find((node) => node.id === graph.topDriver.nodeId) ??
    graph.nodes[0];

  useEffect(() => {
    setSelectedNodeId(null);
    setFocusMode("decision");
  }, [patient.id, graph.pathMode]);

  function handleSelectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
  }

  return (
    <div className={`decision-page ${graph.pathMode}`}>
      <section className="decision-intro">
        <div className="decision-copy">
          <p className="decision-eyebrow">
            Case {patient.id} / Week {patient.currentWeek} / Synthetic record
          </p>
          <h1>{patient.name}</h1>
          <strong className="decision-statement">
            {graph.pathMode === "escalation"
              ? `${firstName}'s check-in requires clinical review.`
              : `${firstName}'s check-in remains on the coaching path.`}
          </strong>
          <p className="decision-summary">{graph.summary}</p>
        </div>
        <div className="decision-controls">
          <div className="graph-patient-strip" aria-label="Demo patients">
            {patients.map((candidate) => (
              <button
                aria-label={`Select ${candidate.name}`}
                aria-pressed={candidate.id === patient.id}
                key={candidate.id}
                className={candidate.id === patient.id ? "active" : ""}
                onClick={() => onSelectPatient(candidate.id)}
              >
                <span aria-hidden="true">{candidate.name.slice(0, 1)}</span>
                <strong>
                  <span className="patient-name-full">{candidate.name}</span>
                  <span aria-hidden="true" className="patient-name-short">{candidate.name.split(" ")[0]}</span>
                </strong>
              </button>
            ))}
          </div>
          <div className="scenario-switch" aria-label="Demo scenario">
            <button
              aria-pressed={graph.pathMode === "coaching"}
              className={graph.pathMode === "coaching" ? "active" : ""}
              onClick={() => onScenario("normal")}
            >
              <CheckCircle2 size={16} /> Coaching
            </button>
            <button
              aria-pressed={graph.pathMode === "escalation"}
              className={graph.pathMode === "escalation" ? "active danger" : ""}
              onClick={() => onScenario("escalation")}
            >
              <AlertTriangle size={16} /> Escalation
            </button>
          </div>
        </div>
      </section>

      <section className="decision-workbench">
        <article className="graph-evidence-panel">
          <header className="graph-evidence-head">
            <div>
              <p className="section-kicker">Evidence chain</p>
              <h2>Observed signals to bounded action</h2>
              <p>Home inputs, local score, support assumption, and deterministic handoff.</p>
            </div>
            <div className="graph-evidence-meta">
              <span>
                <ShieldCheck size={15} /> {source === "deterministic-rules" ? "Validated output / rules" : "Local score / rules"}
              </span>
              <RiskPill level={riskLevel} />
            </div>
          </header>
          <KnowledgeGraphCanvas
            graph={graph}
            selectedNodeId={selectedNode.id}
            focusMode={focusMode}
            onFocusMode={setFocusMode}
            onSelectNode={handleSelectNode}
          />
        </article>

        <GraphNodeInspector
          graph={graph}
          node={selectedNode}
          carePlan={carePlan}
          edgeRisk={edgeRisk}
          onNavigate={onNavigate}
        />
      </section>

      <section className="decision-metrics" aria-label="Current patient summary">
        <DecisionMetric
          label="Interruption risk"
          value={edgeRisk.support.status === "supported" ? formatPercent(edgeRisk.risk) : "Abstained"}
          note={
            edgeRisk.support.status === "supported"
              ? carePlan.escalation.needed
                ? "Safety rule overrides model"
                : riskBand(edgeRisk.risk, edgeRisk.artifact.metrics.threshold)
              : "Outside synthetic support"
          }
          tone={edgeRisk.support.status === "supported" ? "action" : "watch"}
        />
        <DecisionMetric label="Recent adherence" value={`${Math.round(insights.lastTwoAdherence)}%`} note="Previous 2 weeks" tone="steady" />
        <DecisionMetric
          label="Bounded scenario"
          value={
            graph.pathMode === "escalation"
              ? "Suppressed"
              : bestIntervention.absoluteReduction === null
                ? "Not ranked"
                : `-${formatPercentagePoints(bestIntervention.absoluteReduction)}`
          }
          note={
            graph.pathMode === "escalation"
              ? "Safety override"
              : bestIntervention.rankable
                ? bestIntervention.label
                : "Outside synthetic support"
          }
          tone={graph.pathMode === "escalation" ? "urgent" : "action"}
        />
        <DecisionMetric
          label="Rule state"
          value={graph.pathMode === "escalation" ? "Handoff draft" : "Coaching path"}
          note={graph.pathMode === "escalation" ? "Pending human review" : "No configured urgent rule matched"}
          tone={graph.pathMode === "escalation" ? "urgent" : "protective"}
        />
      </section>

      <section className="decision-proof-strip" aria-label="Technical credibility">
        <div>
          <BarChart3 size={19} />
          <span>Local model</span>
          <strong>Monotonic {edgeRisk.artifact.features.length}-feature score with exact decomposition</strong>
        </div>
        <div>
          <Network size={19} />
          <span>Evidence graph</span>
          <strong>{graph.nodes.length} nodes / typed sources / four inspection views</strong>
        </div>
        <div>
          <ShieldCheck size={19} />
          <span>Safety layer</span>
          <strong>Deterministic override remains outside the ML score</strong>
        </div>
      </section>

      <details className="extended-evidence">
        <summary>
          <span>
            <strong>Supporting evidence</strong>
            <small>Care path, synthetic comparison, map diagnostics, and tested-action assumptions</small>
          </span>
          <ChevronDown size={19} />
        </summary>
        <section className="graph-support-grid">
        <article className="panel rescue-evidence">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Simulated care path</p>
              <h2>{graph.pathMode === "escalation" ? "Safety takes control" : "Smallest loop to interrupt"}</h2>
            </div>
            <Activity size={22} />
          </div>
          <div className="rescue-path-list">
            {graph.rescuePath.map((step, index) => (
              <article className="rescue-path-step" key={`${step.nodeId}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel cohort-evidence">
          <div className="panel-heading">
            <div>
            <p className="section-kicker">Synthetic comparison</p>
              <h2>{topMatch?.name ?? "Synthetic match"}</h2>
            </div>
            <UserRound size={22} />
          </div>
          {topMatch && (
            <div className="cohort-match featured">
              <div className="cohort-match-head">
                <strong>{formatPercent(topMatch.similarity)} tag overlap</strong>
                <span>{topMatch.sharedDrivers.length} shared context tags</span>
              </div>
              <p>{topMatch.note}</p>
              <div className="signal-list">
                {topMatch.sharedDrivers.map((driver) => (
                  <span key={`${topMatch.patientId}-${driver}`}>{driver}</span>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="panel feature-evidence">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Evidence-map diagnostics</p>
              <h2>Inspectable context</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="graph-feature-list">
            {graph.mlFeatures.slice(0, 3).map((feature) => (
              <div className="graph-feature" key={feature.id}>
                <div>
                  <strong>{feature.label}</strong>
                  <span>{feature.displayValue}</span>
                </div>
                <p>{feature.interpretation}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel route-ranking-evidence">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Tested action comparison</p>
              <h2>{graph.pathMode === "escalation" ? "Tested actions suppressed by safety" : "Why this action ranked first"}</h2>
            </div>
            <TrendingDown size={22} />
          </div>
          <div className="route-ranking-list">
            {graph.routeAlternatives.map((route) => (
              <div className={`route-ranking-row ${route.status}`} key={route.interventionNodeId}>
                <span className="route-rank">{route.rank}</span>
                <div className="route-copy">
                  <strong>{route.label}</strong>
                  <small>Targets {route.targetLabel}</small>
                </div>
                <div className="route-strength" aria-label={`${route.label} relative modelled effect`}>
                  <span style={{ width: formatBarWidth(route.relativeStrength, 3) }} />
                </div>
                <div className="route-result">
                  <strong>{route.absoluteReduction === null ? "Not ranked" : `-${formatPercentagePoints(route.absoluteReduction)}`}</strong>
                  <small>{route.newRisk === null ? "Outside support" : `to ${formatPercent(route.newRisk)}`}</small>
                </div>
                <span className="route-status">
                  {route.status === "blocked-by-safety"
                    ? "Blocked by safety"
                    : route.status === "not-ranked"
                      ? "Model abstained"
                      : route.status === "recommended"
                        ? "Selected"
                        : "Alternative"}
                </span>
              </div>
            ))}
          </div>
          <p className="route-ranking-note">
            Supported tested actions are ordered by scenario-score change. They are planning comparisons, not causal treatment-effect estimates.
          </p>
        </article>
        </section>
      </details>
    </div>
  );
}

function DecisionMetric({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: string;
  note: string;
  tone: RiskLevel | "action" | "protective";
}) {
  return (
    <div className={`decision-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function GraphNodeInspector({
  graph,
  node,
  carePlan,
  edgeRisk,
  onNavigate
}: {
  graph: AdherenceKnowledgeGraph;
  node: KnowledgeGraphNode;
  carePlan: CarePlan;
  edgeRisk: EdgeRiskResult;
  onNavigate: (view: View) => void;
}) {
  const centrality = graph.centrality.find((item) => item.nodeId === node.id)?.score ?? 0;
  const connectedEdges = graph.edges
    .filter(
      (edge) =>
        (edge.source === node.id || edge.target === node.id) &&
        (graph.pathMode !== "escalation" || edge.status !== "action")
    )
    .slice(0, 3);
  const decisionBrief = getGraphDecisionBrief(graph, node, centrality);
  const explanation = graph.nodeExplanations.find((item) => item.nodeId === node.id);
  const modelAttributionWithheld = explanation?.source === "model" && explanation.contribution === null;
  const bestIntervention = edgeRisk.interventions.find((intervention) => intervention.rankable) ?? edgeRisk.interventions[0];
  const primaryView: View = carePlan.escalation.needed ? "clinician" : "patient";

  return (
    <aside className={`graph-inspector decision-panel ${node.status}`} id="graph-node-inspector">
      <header className="decision-panel-head">
        <div>
          <p className="section-kicker">Decision summary</p>
          <h2>{carePlan.headline}</h2>
        </div>
        <div className={`decision-risk-score ${edgeRisk.support.status === "supported" ? "" : "abstained"}`}>
          <strong>{edgeRisk.support.status === "supported" ? formatPercent(edgeRisk.risk) : "Abstained"}</strong>
          <span>{edgeRisk.support.status === "supported" ? "Adherence risk" : "Outside support"}</span>
        </div>
      </header>

      <section className={`recommended-action ${carePlan.escalation.needed ? "urgent" : ""}`}>
        <span>{carePlan.escalation.needed ? "Urgent action now" : "Next action"}</span>
        <strong>{carePlan.escalation.needed ? carePlan.headline : bestIntervention.label}</strong>
        <p>{carePlan.patientAction}</p>
      </section>

      <div className="decision-panel-actions">
        <button className="primary-action" onClick={() => onNavigate(primaryView)}>
          {carePlan.escalation.needed ? <Stethoscope size={17} /> : <CalendarDays size={17} />}
          {carePlan.escalation.needed ? "Review handoff draft" : "Open support plan"}
          <ArrowRight size={17} />
        </button>
        <button className="secondary-action" onClick={() => onNavigate("model")}>
          <BarChart3 size={17} /> Model record
        </button>
      </div>

      <section className="selected-evidence">
        <div className="selected-evidence-head">
          <span className="graph-node-type">{node.type}</span>
          <small>{centrality.toFixed(2)} graph score</small>
        </div>
        <h3>{node.label}</h3>
        <p>{node.evidence}</p>
        <div className="graph-relationship-list">
          {connectedEdges.map((edge) => (
            <div className={`graph-relationship ${edge.status}`} key={edge.id}>
              <span>{edge.source === node.id ? "to" : "from"}</span>
              <strong>{edge.source === node.id ? nodeLabelById(graph, edge.target) : nodeLabelById(graph, edge.source)}</strong>
              <small>{edge.label} / {formatPercent(edge.weight)} edge weight</small>
            </div>
          ))}
        </div>
      </section>

      {explanation && (
        <section className={`graph-provenance ${explanation.source}`}>
          <div className="graph-provenance-head">
            <div>
              <span>Explanation source</span>
              <strong>{formatExplanationSource(explanation.source)}</strong>
            </div>
            <span className={`provenance-badge ${explanation.direction}`}>{explanation.direction}</span>
          </div>
          {modelAttributionWithheld ? (
            <div className="graph-provenance-withheld">
              <strong>Patient-specific attribution withheld</strong>
              <p>{explanation.summary}</p>
            </div>
          ) : (
            <>
              <div className="graph-provenance-metrics">
                <div>
                  <span>{explanation.contributionUnit === "log-odds" ? "Net attribution" : explanation.contributionUnit === "absolute-risk" ? "What-if delta" : "Model contribution"}</span>
                  <strong>{formatGraphContribution(explanation)}</strong>
                </div>
                <div>
                  <span>{explanation.source === "model" ? "Attribution share" : "Evidence links"}</span>
                  <strong>{explanation.source === "model" ? formatPercent(explanation.impactShare) : String(explanation.evidenceEdgeCount)}</strong>
                </div>
              </div>
              <p>{explanation.summary}</p>
              {explanation.featureLabels.length > 0 && (
                <div className="provenance-features">
                  {explanation.featureLabels.map((label) => <span key={`${node.id}-${label}`}>{label}</span>)}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <div className="graph-ai-brief">
        <div className="graph-ai-brief-head">
          <Network size={16} />
          <span>Decision rationale</span>
        </div>
        <strong>{decisionBrief.headline}</strong>
        <p>{decisionBrief.reason}</p>
        <div className="graph-ai-cues">
          <div>
            <span>Evidence signal</span>
            <strong>{decisionBrief.signal}</strong>
          </div>
          <div>
            <span>Next graph step</span>
            <strong>{decisionBrief.nextMove}</strong>
          </div>
        </div>
        <div className="graph-safety-note">
          <ShieldCheck size={15} />
          <span>{decisionBrief.safety}</span>
        </div>
      </div>

    </aside>
  );
}

function getGraphDecisionBrief(graph: AdherenceKnowledgeGraph, node: KnowledgeGraphNode, centrality: number) {
  const rescueStepIndex = graph.rescuePath.findIndex((step) => step.nodeId === node.id);
  const rescueStep = rescueStepIndex >= 0 ? graph.rescuePath[rescueStepIndex] : null;
  const isEscalation = graph.pathMode === "escalation";
  const signal =
    node.status === "urgent"
      ? "Safety-critical"
      : centrality >= 1.5
        ? "High graph score"
        : node.weight >= 0.55
          ? "Strong context signal"
          : node.status === "protective"
            ? "Protective context"
            : "Context signal";

  if (rescueStep) {
    return {
      headline: `Step ${rescueStepIndex + 1} in the ${isEscalation ? "safety" : "rescue"} path`,
      reason: rescueStep.summary,
      signal,
      nextMove:
        rescueStepIndex === graph.rescuePath.length - 1
          ? isEscalation
            ? "Clinician review"
            : "Track score change"
          : "Follow tested action",
      safety: isEscalation
        ? "Deterministic rules suppress coaching and keep diagnosis and medication changes with clinicians."
        : "The support plan can coach behaviour, but cannot change medication or diagnose symptoms."
    };
  }

  if (node.type === "risk") {
    return {
      headline: isEscalation ? "Risk has crossed the handoff boundary" : "Risk is still coachable",
      reason: graph.summary,
      signal,
      nextMove: isEscalation ? "Prepare handoff draft" : "Open support plan",
      safety: "Adherence risk informs support priority only; clinical judgement stays with the care team."
    };
  }

  if (node.type === "intervention") {
    return {
      headline: "Bounded tested action",
      reason: "The edge model rescores an explicit hypothetical feature change. This is a planning aid, not a causal treatment-effect estimate.",
      signal,
      nextMove: "Offer for review",
      safety: "Only behaviour and support actions are suggested; dose or diagnosis decisions are blocked."
    };
  }

  if (node.type === "safety" || node.type === "clinician") {
    return {
      headline: "Human-in-the-loop control point",
      reason: "This node shows where the deterministic pipeline stops automated coaching and prepares evidence for clinical review.",
      signal,
      nextMove: "Review handoff draft",
      safety: "The system can summarise evidence, but the clinician owns assessment and treatment changes."
    };
  }

  if (node.type === "protective") {
    return {
      headline: "Protective context lowers unnecessary escalation",
      reason: "The graph keeps progress and adherence history connected to the risk model so support is proportionate.",
      signal,
      nextMove: "Reinforce routine",
      safety: "Positive trends are supporting evidence, not a reason to ignore new red flags."
    };
  }

  return {
    headline: "Home signal feeding the risk model",
    reason: "This signal is interpreted alongside routine, biomarker and adherence context instead of being treated as a one-off symptom.",
    signal,
    nextMove: node.status === "urgent" || isEscalation ? "Review pattern" : "Coach early",
    safety: "Patient-reported data guides support and triage, but does not produce a diagnosis."
  };
}

function KnowledgeGraphCanvas({
  graph,
  selectedNodeId,
  focusMode,
  onFocusMode,
  onSelectNode
}: {
  graph: AdherenceKnowledgeGraph;
  selectedNodeId: string;
  focusMode: GraphFocusMode;
  onFocusMode: (mode: GraphFocusMode) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const counters = new Map<KnowledgeGraphNode["type"], number>();
  const positions = new Map<string, { x: number; y: number }>();
  const rescueNodeIds = graph.rescuePath.map((step) => step.nodeId);
  const activePathIds = new Set(rescueNodeIds);
  const activePathEdgeIds = new Set(
    graph.edges
      .filter((edge) => activePathIds.has(edge.source) && activePathIds.has(edge.target))
      .map((edge) => edge.id)
  );
  const connectedEdges = graph.edges.filter(
    (edge) =>
      (edge.source === selectedNodeId || edge.target === selectedNodeId) &&
      (graph.pathMode !== "escalation" || edge.status !== "action")
  );
  const connectedEdgeIds = new Set(connectedEdges.map((edge) => edge.id));
  const highlightedEdgeIds = new Set(
    focusMode === "all" || focusMode === "attribution"
      ? graph.edges.map((edge) => edge.id)
      : focusMode === "neighborhood"
        ? [...connectedEdgeIds]
        : [...connectedEdgeIds, ...activePathEdgeIds]
  );
  const connectedNodeIds = new Set(connectedEdges.flatMap((edge) => [edge.source, edge.target]));
  const focusedNodeIds = new Set(
    focusMode === "all" || focusMode === "attribution"
      ? graph.nodes.map((node) => node.id)
      : focusMode === "neighborhood"
        ? [...connectedNodeIds, selectedNodeId]
        : [...activePathIds, ...connectedNodeIds, selectedNodeId, "patient"]
  );

  graph.nodes.forEach((node) => {
    const index = counters.get(node.type) ?? 0;
    counters.set(node.type, index + 1);
    positions.set(node.id, getGraphNodePosition(node, index));
  });
  const rescueRoutePath = getGraphRoutePath(rescueNodeIds.map((nodeId) => positions.get(nodeId)).filter(isGraphPoint));

  return (
    <div className="knowledge-graph-wrap">
      <div className="graph-canvas-toolbar">
        <span className="graph-live-state">
          <i /> Evidence ready
        </span>
        <div className="graph-focus-control" role="group" aria-label="Graph focus mode">
          <button aria-label="Decision path" aria-pressed={focusMode === "decision"} className={focusMode === "decision" ? "active" : ""} onClick={() => onFocusMode("decision")}>
            <span className="graph-focus-label-full">Decision path</span>
            <span aria-hidden="true" className="graph-focus-label-short">Path</span>
          </button>
          <button aria-label="Selected" aria-pressed={focusMode === "neighborhood"} className={focusMode === "neighborhood" ? "active" : ""} onClick={() => onFocusMode("neighborhood")}>
            <span className="graph-focus-label-full">Selected</span>
            <span aria-hidden="true" className="graph-focus-label-short">Selected</span>
          </button>
          <button aria-label="Attribution" aria-pressed={focusMode === "attribution"} className={focusMode === "attribution" ? "active" : ""} onClick={() => onFocusMode("attribution")}>
            <span className="graph-focus-label-full">Attribution</span>
            <span aria-hidden="true" className="graph-focus-label-short">Explain</span>
          </button>
          <button aria-label="All signals" aria-pressed={focusMode === "all"} className={focusMode === "all" ? "active" : ""} onClick={() => onFocusMode("all")}>
            <span className="graph-focus-label-full">All signals</span>
            <span aria-hidden="true" className="graph-focus-label-short">All</span>
          </button>
        </div>
        <div className="graph-legend">
          {focusMode === "attribution" ? (
            <>
              <span className="legend-dot model-source" /> Model
              <span className="legend-dot simulation-source" /> Simulation
              <span className="legend-dot rule-source" /> Rule
              <span className="legend-dot context-source" /> Context
            </>
          ) : (
            <>
              <span className="legend-dot urgent" /> Escalate
              <span className="legend-dot action" /> Tested action
              <span className="legend-dot protective" /> Protective
              <span className="legend-dot watch" /> Watch
            </>
          )}
        </div>
      </div>
      <div className="graph-map-frame">
        <div className="graph-map-caption top-left">Current decision record</div>
        <div className="graph-map-caption bottom-right">{graph.nodes.length} nodes / {graph.edges.length} edges</div>
        <svg
          className="knowledge-graph-canvas"
          viewBox="0 8 100 84"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label="Interactive adherence evidence map"
        >
          <title>Interactive adherence evidence map</title>
          <defs>
            <marker id="graph-arrow" markerHeight="4" markerWidth="5" orient="auto" refX="4.4" refY="2" viewBox="0 0 5 4">
              <path d="M0,0 L5,2 L0,4 Z" />
            </marker>
          </defs>
          <rect className="graph-surface" x="0.7" y="0.7" width="98.6" height="98.6" rx="3.2" />
          <g className="graph-flow-rail" aria-hidden="true">
            <path d="M13 49 C25 49 34 44 47 44 C59 44 67 45 79 45" />
            <circle cx="13" cy="49" r="1.4" />
            <circle cx="47" cy="44" r="1.4" />
            <circle cx="79" cy="45" r="1.4" />
          </g>
          <g className="graph-lanes" aria-hidden="true">
            <rect x="6" y="14" width="27" height="72" rx="4.4" />
            <rect x="38" y="14" width="26" height="72" rx="4.4" />
            <rect x="70" y="14" width="24" height="72" rx="4.4" />
            <text x="19.5" y="20">Home signals</text>
            <text x="51" y="20">Risk model</text>
            <text x="82" y="20">Care action</text>
          </g>
          {graph.edges.map((edge) => {
            const renderAsForwardAction = edge.status === "action";
            const source = positions.get(renderAsForwardAction ? edge.target : edge.source);
            const target = positions.get(renderAsForwardAction ? edge.source : edge.target);
            if (!source || !target) return null;
            const isHighlighted = highlightedEdgeIds.has(edge.id);
            const isSelectedEdge = connectedEdgeIds.has(edge.id);
            const isActiveEdge = activePathEdgeIds.has(edge.id);
            const showLabel = focusMode !== "attribution" && isHighlighted && (edge.status === "urgent" || edge.status === "action" || edge.weight >= 0.55);
            const path = getGraphEdgePath(source, target);
            const labelPosition = getGraphLabelPosition(source, target);

            return (
              <g
                className={`graph-edge ${edge.status} ${isActiveEdge ? "active-edge" : ""} ${isSelectedEdge ? "selected-edge" : ""} ${isHighlighted ? "" : "dimmed-edge"}`}
                key={edge.id}
                style={{ "--edge-width": 0.34 + edge.weight * 0.72 } as React.CSSProperties}
              >
                <path d={path} markerEnd="url(#graph-arrow)" />
                {showLabel && (
                  <text x={labelPosition.x} y={labelPosition.y}>
                    {shortGraphLabel(edge.label, 15)}
                  </text>
                )}
              </g>
            );
          })}
          {rescueRoutePath && focusMode !== "neighborhood" && focusMode !== "attribution" && <path className={`graph-rescue-route ${graph.pathMode}`} d={rescueRoutePath} aria-hidden="true" />}
          {graph.nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const centrality = graph.centrality.find((item) => item.nodeId === node.id)?.score ?? 1;
            const radius = getGraphNodeRadius(node, centrality);
            const isActivePath = activePathIds.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const isFocused = focusedNodeIds.has(node.id);
            const labelLines = wrapGraphLabel(node.label, graphLabelLength(node));
            const nodeExplanation = graph.nodeExplanations.find((item) => item.nodeId === node.id);
            const attributionWithheld =
              (nodeExplanation?.source === "model" || nodeExplanation?.source === "simulation") &&
              nodeExplanation.contribution === null;
            const attributionValue = attributionWithheld
              ? 0
              : nodeExplanation?.source === "model" || nodeExplanation?.source === "simulation"
                ? Math.max(2, Math.round(nodeExplanation.impactShare * 100))
              : nodeExplanation?.source === "rule"
                ? 100
                : 12;

            return (
              <g
                className={`graph-node ${node.status} ${node.type} source-${nodeExplanation?.source ?? "context"} ${focusMode === "attribution" ? "attribution-mode" : ""} ${isActivePath ? "active-path" : ""} ${isSelected ? "selected" : ""} ${isConnected ? "connected" : ""} ${isFocused ? "" : "dimmed-node"}`}
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${position.x} ${position.y})`}
                role="button"
                tabIndex={isFocused ? 0 : -1}
                aria-hidden={!isFocused}
                aria-label={`${node.label}: ${node.evidence}`}
                aria-controls="graph-node-inspector"
                aria-pressed={isSelected}
                onPointerUp={() => onSelectNode(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
              >
                <title>{node.evidence}</title>
                <circle className="graph-node-hit" r={radius + 3.5} />
                {focusMode === "attribution" && (
                  <>
                    <circle
                      className="graph-attribution-ring"
                      r={radius + 2.5}
                      pathLength="100"
                      strokeDasharray={`${attributionValue} ${100 - attributionValue}`}
                      transform="rotate(-90)"
                    />
                    <text className="graph-attribution-label" y={-radius - 3.5}>
                      {getAttributionTag(nodeExplanation)}
                    </text>
                  </>
                )}
                <circle className="graph-node-halo" r={radius + 1.55} />
                <circle className="graph-node-core" r={radius} />
                <text className="graph-node-glyph" y="0.8">{getGraphNodeGlyph(node)}</text>
                <text className="graph-node-label" y={radius + 4.3}>
                  {labelLines.map((line, index) => (
                    <tspan dy={index === 0 ? 0 : 2.6} key={`${node.id}-${line}`} x="0">{line}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="graph-path-strip">
        {graph.rescuePath.map((step, index) => (
          <div className="graph-path-chip" key={`${step.nodeId}-${index}`}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorecardView({ patient, carePlan }: { patient: Patient; carePlan: CarePlan }) {
  const scoreItems = [
    {
      label: "User impact",
      value: carePlan.judgeFit.userImpact,
      metric: carePlan.riskLevel === "urgent" ? "Escalation protected" : "Adherence protected"
    },
    {
      label: "Innovation",
      value: carePlan.judgeFit.innovation,
      metric: "Inspectable decision pipeline"
    },
    {
      label: "Feasibility",
      value: carePlan.judgeFit.feasibility,
      metric: "Clinician in loop"
    },
    {
      label: "Demo quality",
      value: carePlan.judgeFit.demoQuality,
      metric: "Normal vs escalation"
    }
  ];

  return (
    <div className="scorecard-grid">
      <section className="panel wide-panel score-hero">
        <div>
          <p className="section-kicker">Judging scorecard</p>
          <h2>{patient.name} makes the case tangible</h2>
        <p>
          The demo shows how an at-home GLP-1 programme can move between coaching and clinical review without asking the patient to interpret complex signals alone.
        </p>
        <div className="prediction-box compact">
          <strong>Adherence Twin</strong>
          <span>{carePlan.adherenceTwin.predictedFailurePoint}</span>
        </div>
      </div>
      <RiskPill level={carePlan.riskLevel} />
      </section>

      {scoreItems.map((item) => (
        <section className="panel score-card" key={item.label}>
          <div className="score-card-head">
            <span>{item.metric}</span>
            <CheckCircle2 size={20} />
          </div>
          <h2>{item.label}</h2>
          <p>{item.value}</p>
        </section>
      ))}

      <AgentTracePanel trace={carePlan.agentTrace} title="What the judges see working" kicker="Prototype proof" />
    </div>
  );
}

function AgentTracePanel({ trace, title, kicker }: { trace: AgentTraceStep[]; title: string; kicker: string }) {
  return (
    <section className="panel wide-panel trace-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <Network size={24} />
      </div>

      <div className="trace-grid">
        {trace.map((step, index) => (
          <article className={`trace-step ${step.status}`} key={step.id}>
            <div className="trace-index">{index + 1}</div>
            <div>
              <div className="trace-step-head">
                <strong>{step.label}</strong>
                <span>{step.status}</span>
              </div>
              <p>{step.summary}</p>
              <small>{step.role}</small>
              <div className="trace-evidence">
                {step.evidence.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScriptsView() {
  return (
    <div className="scripts-grid">
      <section className="panel script-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Demo script 1</p>
            <h2>Normal check-in</h2>
          </div>
          <CheckCircle2 size={24} />
        </div>
        <ol>
          <li>Select Maya and load the normal scenario.</li>
          <li>Show medication taken, manageable nausea, and a real voice note.</li>
          <li>Review the care plan.</li>
          <li>Point to one next action, trend context, and the inspectable decision trace.</li>
        </ol>
        <p className="talk-track">
          "This is the quiet middle of chronic care. Maya's configured rules do not activate a handoff, so the system keeps support lightweight while tracking friction."
        </p>
      </section>

      <section className="panel script-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Demo script 2</p>
            <h2>Escalation check-in</h2>
          </div>
          <AlertTriangle size={24} />
        </div>
        <ol>
          <li>Select Maya and load the escalation scenario.</li>
          <li>Show missed medication, high nausea, low hydration, and worsening pain.</li>
          <li>Review the care plan.</li>
          <li>Switch to the clinician inbox and show the prioritised handoff plus audit trail.</li>
        </ol>
        <p className="talk-track">
          "The system does not pretend to be a doctor. Deterministic safety rules recognise that coaching is the wrong mode and prepare a review draft."
        </p>
      </section>

      <section className="panel script-panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">60 second pitch</p>
            <h2>Adherence OS</h2>
          </div>
          <Sparkles size={24} />
        </div>
        <p>
          Chronic care can fail between appointments. Adherence OS turns home check-ins, biomarkers and patient language into an inspectable decision pipeline: prospective adherence risk, an evidence map, deterministic safety rules, and a clinician handoff draft.
        </p>
      </section>
    </div>
  );
}

function SafetyView({ unsafeRequest }: { unsafeRequest: CarePlan["unsafeRequestDemo"] }) {
  const rules = [
    "No diagnosis or differential diagnosis.",
    "No medication dose changes, stops, restarts or substitutions.",
    "Red flags escalate to clinician review or urgent care language.",
    "Advice stays behavioural, supportive and bounded.",
    "The prototype prepares review drafts; it does not deliver messages or automate clinical decisions."
  ];

  return (
    <div className="safety-grid">
      <section className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Guardrails</p>
            <h2>Clinical safety layer</h2>
          </div>
          <ShieldCheck size={24} />
        </div>
        <div className="rules-list">
          {rules.map((rule) => (
            <div className="rule-item" key={rule}>
              <CheckCircle2 size={18} />
              <span>{rule}</span>
            </div>
          ))}
        </div>
        <p className="safety-note">{SAFETY_NOTICE}</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Red flags</p>
            <h2>Escalate</h2>
          </div>
          <AlertTriangle size={24} />
        </div>
        <div className="signal-list vertical">
          <span>Chest pain or breathlessness</span>
          <span>Severe or worsening abdominal pain</span>
          <span>Fainting, severe dizziness or dehydration</span>
          <span>Unable to keep fluids down</span>
          <span>Pregnancy concern or self-harm language</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Provider boundary</p>
            <h2>Deterministic by design</h2>
          </div>
          <ShieldCheck size={24} />
        </div>
        <p>
          The route can validate optional structured provider output, then recomputes the complete care plan from deterministic rules. Provider wording does not reach the UI in this MVP.
        </p>
      </section>

      <section className="panel wide-panel unsafe-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Red-team safety demo</p>
            <h2>Unsafe medication request</h2>
          </div>
          <ShieldCheck size={24} />
        </div>

        <div className="unsafe-grid">
          <div>
            <span className="mini-label">Patient asks</span>
            <blockquote>{unsafeRequest.request}</blockquote>
          </div>
          <div>
            <span className="mini-label">Assistant response</span>
            <p>{unsafeRequest.patientResponse}</p>
          </div>
          <div>
            <span className="mini-label">Clinician note</span>
            <p>{unsafeRequest.clinicianNote}</p>
          </div>
        </div>

        <div className="guardrail-row">
          {unsafeRequest.guardrails.map((guardrail) => (
            <span key={guardrail}>{guardrail}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Slider({
  label,
  value,
  icon,
  onChange
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-field">
      <span>
        {icon}
        {label}
        <strong>{value}/10</strong>
      </span>
      <input type="range" min="0" max="10" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
  return <span className={`risk-pill ${level}`}>{riskLabels[level]}</span>;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatBarWidth(value: number, minimumPercent = 0) {
  const percentage = Math.max(minimumPercent, value * 100);
  return `${Math.round(percentage * 10) / 10}%`;
}

function formatProbability(value: number) {
  return value < 0.1 ? `${(value * 100).toFixed(1)}%` : formatPercent(value);
}

function formatPercentagePoints(value: number) {
  const points = value * 100;
  return `${points < 1 ? points.toFixed(1) : Math.round(points)} pp`;
}

function formatSignedPercentagePoints(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatPercentagePoints(Math.abs(value))}`;
}

function formatSignedNumber(value: number, digits: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatExplanationSource(source: AdherenceKnowledgeGraph["nodeExplanations"][number]["source"]) {
  if (source === "model") return "Model attribution";
  if (source === "simulation") return "Bounded what-if";
  if (source === "rule") return "Deterministic rule";
  return "Patient context";
}

function formatGraphContribution(explanation: AdherenceKnowledgeGraph["nodeExplanations"][number]) {
  if (explanation.contributionUnit === "log-odds" && explanation.contribution !== null) {
    return `${formatSignedNumber(explanation.contribution, 2)} log-odds`;
  }
  if (explanation.contributionUnit === "absolute-risk" && explanation.contribution !== null) {
    return `-${formatPercentagePoints(explanation.contribution)}`;
  }
  if (explanation.source === "rule") return "Outside ML";
  return "Context only";
}

function formatThresholdDistance(value: number) {
  return `${formatPercent(Math.abs(value))} ${value >= 0 ? "below" : "above"} threshold`;
}

function getAttributionTag(explanation: AdherenceKnowledgeGraph["nodeExplanations"][number] | undefined) {
  if (!explanation || explanation.source === "context") return "CTX";
  if (explanation.source === "rule") return "RULE";
  if (explanation.contribution === null) return "N/A";
  if (explanation.source === "simulation") return "SIM";
  return `${Math.round(explanation.impactShare * 100)}%`;
}

function formatFeatureValue(value: number) {
  if (Math.abs(value) >= 20) return value.toFixed(0);
  if (Math.abs(value) >= 5) return value.toFixed(1);
  return value.toFixed(2);
}

function riskBand(value: number, threshold: number) {
  return value >= threshold ? "Above model threshold" : "Below model threshold";
}

function getGenerationNotice(reason: CarePlanResponse["fallbackReason"], meta?: CarePlanResponse["meta"]) {
  const timing = meta ? ` Decision completed in ${meta.durationMs} ms.` : "";
  if (reason === "openai-not-configured") {
    return `OpenAI is not configured. The deterministic local safety engine produced this result.${timing}`;
  }
  if (reason === "invalid-openai-output") {
    return `OpenAI returned an invalid result. The deterministic local safety engine produced the displayed result.${timing}`;
  }
  if (reason === "openai-error") {
    return `OpenAI was unavailable. The deterministic local safety engine produced the displayed result.${timing}`;
  }
  return meta?.providerAttempted
    ? `Provider output was schema-valid in ${meta.durationMs} ms. The complete rules-owned plan was recomputed before display.`
    : null;
}

function buildCarePlanAnnouncement(plan: CarePlan) {
  const nextStep = plan.escalation.needed
    ? `Next action: ${plan.patientAction}`
    : "No clinician handoff is active; follow the displayed adherence action.";
  return `Care plan updated. ${plan.headline} Risk level: ${riskLabels[plan.riskLevel]}. ${nextStep}`;
}

function getGraphNodePosition(node: KnowledgeGraphNode, index: number) {
  if (node.id === "patient") return { x: 10, y: 51 };
  if (node.id === "risk") return { x: 52, y: 50 };
  if (node.id === "safety-guardrail") return { x: 76, y: 27 };
  if (node.id === "clinician-handoff") return { x: 89, y: 27 };
  if (node.id === "protective-progress") return { x: 52, y: 79 };
  if (node.id === "routine") return { x: 29, y: 71 };
  if (node.id === "biomarkers") return { x: 29, y: 85 };

  if (node.type === "symptom") {
    const positions = [
      { x: 29, y: 27 },
      { x: 29, y: 42 },
      { x: 29, y: 56 }
    ];
    return positions[index] ?? { x: 29, y: 35 + index * 12 };
  }

  if (node.type === "intervention") {
    const positions = [
      { x: 77, y: 48 },
      { x: 77, y: 64 },
      { x: 77, y: 80 }
    ];
    return positions[index] ?? { x: 77, y: 48 + index * 12 };
  }

  return { x: 50, y: 50 };
}

function getGraphEdgePath(source: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(12, Math.abs(dx) * 0.48);
  const backwardArc = Math.max(-10, Math.min(10, dy * 0.16 + (source.y > target.y ? 5 : -5)));
  const controlOne =
    dx >= 0
      ? { x: source.x + distance, y: source.y }
      : { x: source.x - distance * 0.62, y: source.y + backwardArc };
  const controlTwo =
    dx >= 0
      ? { x: target.x - distance, y: target.y }
      : { x: target.x + distance * 0.62, y: target.y + backwardArc };

  return `M ${source.x} ${source.y} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${target.x} ${target.y}`;
}

function getGraphLabelPosition(source: { x: number; y: number }, target: { x: number; y: number }) {
  const isMostlyHorizontal = Math.abs(target.x - source.x) > Math.abs(target.y - source.y);
  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2 + (isMostlyHorizontal ? -3 : 2.8)
  };
}

function getGraphRoutePath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";

  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const controlOffset = Math.max(10, Math.abs(point.x - previous.x) * 0.42);
      return `C ${previous.x + controlOffset} ${previous.y}, ${point.x - controlOffset} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");
}

function isGraphPoint(point: { x: number; y: number } | undefined): point is { x: number; y: number } {
  return Boolean(point);
}

function getGraphNodeRadius(node: KnowledgeGraphNode, centrality: number) {
  const base = node.type === "patient" ? 4.7 : node.type === "risk" ? 4.6 : node.type === "clinician" ? 3.9 : 3.65;
  return Math.min(5.5, base + centrality * 0.12);
}

function graphLabelLength(node: KnowledgeGraphNode) {
  if (node.type === "clinician" || node.type === "intervention") return 14;
  if (node.type === "protective" || node.type === "biomarker") return 16;
  return 18;
}

function getGraphNodeGlyph(node: KnowledgeGraphNode) {
  if (node.type === "patient") return "P";
  if (node.type === "risk") return "%";
  if (node.type === "symptom") return "S";
  if (node.type === "routine") return "R";
  if (node.type === "biomarker") return "B";
  if (node.type === "intervention") return "+";
  if (node.type === "safety") return "!";
  if (node.type === "clinician") return "C";
  return "OK";
}

function nodeLabelById(graph: AdherenceKnowledgeGraph, nodeId: string) {
  return graph.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function shortGraphLabel(label: string, maxLength: number) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}...` : label;
}

function wrapGraphLabel(label: string, maxLineLength: number) {
  if (label.length <= maxLineLength) return [label];

  const lines: string[] = [];
  label.split(" ").forEach((word) => {
    const currentLine = lines.at(-1);
    if (!currentLine || currentLine.length + word.length + 1 > maxLineLength) {
      lines.push(word);
      return;
    }
    lines[lines.length - 1] = `${currentLine} ${word}`;
  });

  if (lines.length <= 2) return lines;
  return [lines[0], shortGraphLabel(lines.slice(1).join(" "), maxLineLength)];
}

function TrendChart({
  data,
  metric,
  label
}: {
  data: WeeklySnapshot[];
  metric: "weightKg" | "adherencePct" | "nauseaScore";
  label: string;
}) {
  const values = data.map((item) => item[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 48 - ((value - min) / range) * 38;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="trend-chart">
      <div className="trend-chart-head">
        <span>{label}</span>
        <strong>{values[values.length - 1]}</strong>
      </div>
      <svg viewBox="0 0 100 52" preserveAspectRatio="none" role="img" aria-label={`${label} trend`}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {values.map((value, index) => {
          const x = (index / Math.max(values.length - 1, 1)) * 100;
          const y = 48 - ((value - min) / range) * 38;
          return <circle key={`${metric}-${index}`} cx={x} cy={y} r="2.3" />;
        })}
      </svg>
      <div className="week-row">
        {data.map((item) => (
          <span key={`${metric}-${item.week}`}>W{item.week}</span>
        ))}
      </div>
    </div>
  );
}
