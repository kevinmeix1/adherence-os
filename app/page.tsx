"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
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
    const nextCheckIn = buildCheckIn(patient.id, "normal");
    setSelectedPatientId(patient.id);
    setCheckIn(nextCheckIn);
    setCarePlan(evaluateCheckIn(patient, nextCheckIn));
    setSource("rules-fallback");
    setGenerationNotice(null);
    setCarePlanAnnouncement("");
  }

  function loadScenario(scenario: "normal" | "escalation") {
    const nextCheckIn = buildCheckIn(selectedPatient.id, scenario);
    setCheckIn(nextCheckIn);
    const nextPlan = evaluateCheckIn(selectedPatient, nextCheckIn);
    setCarePlan(nextPlan);
    setSource("rules-fallback");
    setGenerationNotice(null);
    setCarePlanAnnouncement(buildCarePlanAnnouncement(nextPlan));
  }

  function navigateTo(nextView: View) {
    setView(nextView);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

      <section className="workspace product-workspace" id="main-workspace" tabIndex={-1}>
        {view !== "graph" && (
          <header className="topbar">
            <div>
              <p className="section-kicker">eMed hackathon prototype</p>
              <h1>{selectedPatient.name}</h1>
              <p>{selectedPatient.programme}</p>
            </div>
            <div className="topbar-actions">
              <RiskPill level={carePlan.riskLevel} />
              <div className="ai-source">
                <Bot size={16} />
                {source === "openai" ? "OpenAI structured output" : "Local safety engine"}
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
            carePlanAnnouncement={carePlanAnnouncement}
            onChange={setCheckIn}
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
      <button className="product-brand" onClick={() => onNavigate("graph")} title="Open live adherence twin">
        <span className="brand-mark">
          <HeartPulse size={20} />
        </span>
        <span>
          <strong>Adherence OS</strong>
          <small>by eMed / concept</small>
        </span>
      </button>

      <nav className="product-nav" aria-label="Product navigation">
        <NavButton label="Live twin" active={view === "graph"} icon={<Network size={17} />} onClick={() => onNavigate("graph")} />
        <NavButton label="Patient app" active={view === "patient"} icon={<Home size={17} />} onClick={() => onNavigate("patient")} />
        <NavButton
          label="Care queue"
          active={view === "clinician"}
          icon={<Stethoscope size={17} />}
          onClick={() => onNavigate("clinician")}
        />
        <NavButton label="Model lab" active={view === "model"} icon={<BarChart3 size={17} />} onClick={() => onNavigate("model")} />
      </nav>

      <div className="product-bar-meta">
        <span className="demo-status">
          <i />
          Synthetic demo
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
          <summary title="Open prototype resources" aria-label="Open prototype resources">
            <MoreHorizontal size={19} />
          </summary>
          <div>
            <Link href="/patients" onClick={closeMenu}>
              <UserRound size={16} /> Patient directory
            </Link>
            <button onClick={() => navigateFromMenu("safety")}>
              <ShieldCheck size={16} /> Safety
            </button>
            <button onClick={() => navigateFromMenu("scripts")}>
              <ClipboardList size={16} /> Demo scripts
            </button>
            <button onClick={() => navigateFromMenu("scorecard")}>
              <ClipboardCheck size={16} /> Judge proof
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
  carePlanAnnouncement,
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
  carePlanAnnouncement: string;
  onChange: (input: CheckInInput) => void;
  onScenario: (scenario: "normal" | "escalation") => void;
  onSubmit: () => void;
}) {
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
          <label className="toggle-row">
            <span>
              <Pill size={18} />
              Medication taken
            </span>
            <input
              type="checkbox"
              checked={checkIn.medicationTaken}
              onChange={(event) => onChange({ ...checkIn, medicationTaken: event.target.checked, scenario: "custom" })}
            />
          </label>

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

          <label className="field">
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
          {isLoading ? "Generating..." : "Generate care moment"}
        </button>
        {generationNotice && (
          <div className="generation-notice">
            <ShieldCheck size={17} />
            <span>{generationNotice}</span>
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {carePlanAnnouncement}
        </p>
      </section>

      <section className="panel result-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">AI care moment</p>
            <h2>{carePlan.headline}</h2>
          </div>
          <RiskPill level={carePlan.riskLevel} />
        </div>

        <div className="care-moment">
          <div className="device-visual" aria-hidden="true">
            <div className={`pulse-ring ${carePlan.riskLevel}`} />
            <HeartPulse size={46} />
            <span>{Math.round(carePlan.confidence * 100)}%</span>
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

      <AgentTracePanel trace={carePlan.agentTrace} title="Agentic workflow" kicker="Live reasoning path" />

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
            <p className="section-kicker">Clinician handoff</p>
            <h2>Async summary</h2>
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
          <p className="section-kicker">Adherence twin</p>
          <h2>Predicted failure point</h2>
        </div>
        <Sparkles size={24} />
      </div>

      <p className="twin-summary">{twin.summary}</p>
      <div className="prediction-box">
        <strong>{Math.round(twin.confidence * 100)}% confidence</strong>
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
  return (
    <section className="panel rescue-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">7-day rescue plan</p>
          <h2>Pre-empt the next dropout risk</h2>
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

  return (
    <div className="clinician-grid">
      <section className="panel queue-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Clinical inbox</p>
            <h2>{urgentCount} needs review</h2>
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

        <div className="clinician-table">
          <div className="table-row table-head">
            <span>Patient</span>
            <span>Trend</span>
            <span>Risk</span>
            <span>Suggested action</span>
          </div>
          {rows.map(({ patient, plan, insights }) => (
            <div className="table-row" key={patient.id}>
              <span>{patient.name}</span>
              <span>{insights.weightDelta.toFixed(1)} kg, {Math.round(insights.adherenceAvg)}% adherence</span>
              <span>{riskLabels[plan.riskLevel]}</span>
              <span>{plan.escalation.channel}</span>
            </div>
          ))}
        </div>
      </section>

      <AgentTracePanel trace={selectedRow.plan.agentTrace} title={`${selectedRow.patient.name} trace`} kicker="Care-team audit trail" />

      <section className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Clinician workload reduction</p>
            <h2>Prioritised summaries</h2>
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
  const explanation = explainRiskScore(edgeRisk, 6);
  const sensitivity = analyzeRiskSensitivity(edgeRisk);
  const topSensitivityFeatures = sensitivity.features.slice(0, 5);
  const maxSensitivitySpan = Math.max(...topSensitivityFeatures.map((feature) => feature.span), 0.001);
  const maxStepContribution = Math.max(...explanation.steps.map((step) => Math.abs(step.contribution)), 0.01);
  const sampleRows = getModelSampleRows().slice(0, 6);
  const bestIntervention = edgeRisk.interventions[0];

  return (
    <div className="model-grid">
      <section className="panel wide-panel model-hero">
        <div>
          <p className="section-kicker">Model Lab</p>
          <h2>Edge ML predicts 7-day adherence failure risk</h2>
          <p>
            A monotonic logistic model scores structured home-care features in the browser, then the agentic layer turns the prediction into a safe rescue plan.
          </p>
        </div>
        <div className="risk-dial">
          <span>{formatPercent(edgeRisk.risk)}</span>
          <strong>{riskBand(edgeRisk.risk)}</strong>
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
          <Metric icon={<TrendingDown size={18} />} label="Synthetic AUC" value={artifact.metrics.testAuc.toFixed(3)} />
          <Metric icon={<Gauge size={18} />} label="Brier" value={artifact.metrics.testBrier.toFixed(3)} />
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
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Current patient inference</p>
            <h2>{patient.name}</h2>
          </div>
          <RiskPill level={edgeRisk.risk >= 0.55 ? "urgent" : edgeRisk.risk >= 0.35 ? "review" : edgeRisk.risk >= 0.18 ? "watch" : "steady"} />
        </div>
        <div className="inference-list">
          <span>Week {patient.currentWeek}</span>
          <span>Medication {checkIn.medicationTaken ? "taken" : "missed"}</span>
          <span>Nausea {checkIn.nauseaScore}/10</span>
          <span>Hydration {checkIn.hydrationScore}/10</span>
        </div>
        <div className="prediction-box">
          <strong>Best simulated intervention</strong>
          <span>
            {bestIntervention.label}: estimated {formatPercent(bestIntervention.absoluteReduction)} absolute risk reduction.
          </span>
        </div>
      </section>

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
            <strong>{formatSignedPercent(explanation.currentRisk - explanation.baselineRisk)}</strong>
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
            <span>Local stability</span>
            <strong>{formatPercent(sensitivity.stabilityScore)}</strong>
            <small>Higher is less sensitive</small>
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
                <small>{formatSignedPercent(feature.maxRisk - feature.minRisk)} span</small>
              </div>
            </div>
          ))}
        </div>
        <p className="attribution-footnote">
          One feature is varied at a time within bounded synthetic ranges. This is a local sensitivity test, not a confidence interval or clinical uncertainty estimate.
        </p>
      </section>

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
                <span>-{formatPercent(intervention.absoluteReduction)}</span>
              </div>
              <p>{intervention.note}</p>
              <div className="sim-risk-row">
                <small>New risk</small>
                <strong>{formatPercent(intervention.risk)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Calibration</p>
            <h2>Predicted vs observed</h2>
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
            <span>Failure</span>
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
  const bestIntervention = edgeRisk.interventions[0];
  const distanceToEscalation = graph.mlFeatures.find((feature) => feature.id === "distance_to_escalation");
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
            <span /> Week {patient.currentWeek} / live adherence twin
          </p>
          <h1>
            {graph.pathMode === "escalation"
              ? `${firstName} needs a clinician, not another nudge.`
              : `${firstName}'s adherence risk is still reversible.`}
          </h1>
          <p>{graph.summary}</p>
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

      <section className="decision-metrics" aria-label="Current patient summary">
        <DecisionMetric
          label="ML dropout risk"
          value={formatPercent(edgeRisk.risk)}
          note={carePlan.escalation.needed ? "Safety rule overrides model" : riskBand(edgeRisk.risk)}
          tone={riskLevel}
        />
        <DecisionMetric label="Recent adherence" value={`${Math.round(insights.lastTwoAdherence)}%`} note="Last 2 weeks" tone="steady" />
        <DecisionMetric
          label="Simulated risk change"
          value={graph.pathMode === "escalation" ? "Suppressed" : `-${formatPercent(bestIntervention.absoluteReduction)}`}
          note={graph.pathMode === "escalation" ? "Safety override" : bestIntervention.label}
          tone={graph.pathMode === "escalation" ? "urgent" : "action"}
        />
        <DecisionMetric
          label="Clinical safety"
          value={graph.pathMode === "escalation" ? "Handoff" : distanceToEscalation?.displayValue ?? "4 hops"}
          note={graph.pathMode === "escalation" ? "Safety handoff active" : "Inside coaching boundary"}
          tone={graph.pathMode === "escalation" ? "urgent" : "protective"}
        />
      </section>

      <section className="decision-workbench">
        <article className="graph-evidence-panel">
          <header className="graph-evidence-head">
            <div>
              <p className="section-kicker">Decision evidence graph</p>
              <h2>Signals to safe action</h2>
              <p>Home context, edge inference, what-if actions and clinical guardrails.</p>
            </div>
            <div className="graph-evidence-meta">
              <span>
                <Bot size={15} /> {source === "openai" ? "OpenAI + edge model" : "Edge model + local guardrails"}
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

      <section className="decision-proof-strip" aria-label="Technical credibility">
        <div>
          <BarChart3 size={19} />
          <span>Edge ML</span>
          <strong>Monotonic {edgeRisk.artifact.features.length}-feature model / exact local decomposition</strong>
        </div>
        <div>
          <Network size={19} />
          <span>Graph analytics</span>
          <strong>{graph.nodes.length} nodes / provenance + four explainability views</strong>
        </div>
        <div>
          <ShieldCheck size={19} />
          <span>Safety layer</span>
          <strong>Deterministic override remains outside the ML score</strong>
        </div>
      </section>

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
              <p className="section-kicker">Cohort memory</p>
              <h2>{topMatch?.name ?? "Synthetic match"}</h2>
            </div>
            <UserRound size={22} />
          </div>
          {topMatch && (
            <div className="cohort-match featured">
              <div className="cohort-match-head">
                <strong>{formatPercent(topMatch.similarity)} pattern match</strong>
                <span>{topMatch.sharedDrivers.length} shared drivers</span>
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
              <p className="section-kicker">Graph-derived features</p>
              <h2>Model-ready context</h2>
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
              <p className="section-kicker">Route comparison</p>
              <h2>{graph.pathMode === "escalation" ? "Simulations suppressed by safety" : "Why this route won"}</h2>
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
                  <strong>-{formatPercent(route.absoluteReduction)}</strong>
                  <small>to {formatPercent(route.newRisk)}</small>
                </div>
                <span className="route-status">
                  {route.status === "blocked-by-safety" ? "Blocked by safety" : route.status === "recommended" ? "Selected" : "Alternative"}
                </span>
              </div>
            ))}
          </div>
          <p className="route-ranking-note">
            Routes are ranked by rescoring explicit feature assumptions. They are planning comparisons, not causal treatment-effect estimates.
          </p>
        </article>
      </section>
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
  const connectedEdges = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id).slice(0, 3);
  const decisionBrief = getGraphDecisionBrief(graph, node, centrality);
  const explanation = graph.nodeExplanations.find((item) => item.nodeId === node.id);
  const bestIntervention = edgeRisk.interventions[0];
  const primaryView: View = carePlan.escalation.needed ? "clinician" : "patient";

  return (
    <aside className={`graph-inspector decision-panel ${node.status}`}>
      <header className="decision-panel-head">
        <div>
          <p className="section-kicker">AI decision</p>
          <h2>{carePlan.headline}</h2>
        </div>
        <div className="decision-risk-score">
          <strong>{formatPercent(edgeRisk.risk)}</strong>
          <span>ML risk</span>
        </div>
      </header>

      <section className="selected-evidence">
        <div className="selected-evidence-head">
          <span className="graph-node-type">{node.type}</span>
          <small>{centrality.toFixed(2)} centrality</small>
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
        </section>
      )}

      <div className="graph-ai-brief">
        <div className="graph-ai-brief-head">
          <Sparkles size={16} />
          <span>Why it matters</span>
        </div>
        <strong>{decisionBrief.headline}</strong>
        <p>{decisionBrief.reason}</p>
        <div className="graph-ai-cues">
          <div>
            <span>Model signal</span>
            <strong>{decisionBrief.signal}</strong>
          </div>
          <div>
            <span>Safe next move</span>
            <strong>{decisionBrief.nextMove}</strong>
          </div>
        </div>
        <div className="graph-safety-note">
          <ShieldCheck size={15} />
          <span>{decisionBrief.safety}</span>
        </div>
      </div>

      <section className={`recommended-action ${carePlan.escalation.needed ? "urgent" : ""}`}>
        <span>Recommended next move</span>
        <strong>{carePlan.escalation.needed ? "Clinical review now" : bestIntervention.label}</strong>
        <p>{carePlan.patientAction}</p>
      </section>

      <div className="decision-panel-actions">
        <button className="primary-action" onClick={() => onNavigate(primaryView)}>
          {carePlan.escalation.needed ? <Stethoscope size={17} /> : <CalendarDays size={17} />}
          {carePlan.escalation.needed ? "Review handoff" : "Open 7-day plan"}
          <ArrowRight size={17} />
        </button>
        <button className="secondary-action" onClick={() => onNavigate("model")}>
          <BarChart3 size={17} /> Model evidence
        </button>
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
        ? "High centrality"
        : node.weight >= 0.55
          ? "Strong driver"
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
            : "Track risk drop"
          : "Follow route",
      safety: isEscalation
        ? "The agent must escalate red flags and avoid diagnosis or medication changes."
        : "The agent can coach behaviour, but cannot change medication or diagnose symptoms."
    };
  }

  if (node.type === "risk") {
    return {
      headline: isEscalation ? "Risk has crossed the handoff boundary" : "Risk is still coachable",
      reason: graph.summary,
      signal,
      nextMove: isEscalation ? "Activate handoff" : "Run rescue plan",
      safety: "Risk scoring supports triage only; clinical judgement stays with the care team."
    };
  }

  if (node.type === "intervention") {
    return {
      headline: "Scenario-tested action candidate",
      reason: "The edge model rescores an explicit hypothetical feature change. This is a planning aid, not a causal treatment-effect estimate.",
      signal,
      nextMove: "Offer for review",
      safety: "Only behaviour and support actions are suggested; dose or diagnosis decisions are blocked."
    };
  }

  if (node.type === "safety" || node.type === "clinician") {
    return {
      headline: "Human-in-the-loop control point",
      reason: "This node keeps the AI from acting beyond its scope when symptoms or patterns need clinical review.",
      signal,
      nextMove: "Escalate safely",
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
  const connectedEdgeIds = new Set(
    graph.edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId).map((edge) => edge.id)
  );
  const highlightedEdgeIds = new Set(
    focusMode === "all" || focusMode === "attribution"
      ? graph.edges.map((edge) => edge.id)
      : focusMode === "neighborhood"
        ? [...connectedEdgeIds]
        : [...connectedEdgeIds, ...activePathEdgeIds]
  );
  const connectedNodeIds = new Set(
    graph.edges
      .filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
      .flatMap((edge) => [edge.source, edge.target])
  );
  const focusedNodeIds = new Set(
    focusMode === "all" || focusMode === "attribution"
      ? graph.nodes.map((node) => node.id)
      : focusMode === "neighborhood"
        ? [...connectedNodeIds, selectedNodeId]
        : [...activePathIds, ...connectedNodeIds, selectedNodeId]
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
          <i /> Inference active
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
              <span className="legend-dot action" /> Intervention
              <span className="legend-dot protective" /> Protective
              <span className="legend-dot watch" /> Watch
            </>
          )}
        </div>
      </div>
      <div className="graph-map-frame">
        <div className="graph-map-caption top-left">Live decision graph</div>
        <div className="graph-map-caption bottom-right">{graph.nodes.length} nodes / {graph.edges.length} edges</div>
        <svg
          className="knowledge-graph-canvas"
          viewBox="0 8 100 84"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Adherence knowledge graph"
        >
          <defs>
            <linearGradient id="graph-bg-wash" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#17201f" />
              <stop offset="52%" stopColor="#182226" />
              <stop offset="100%" stopColor="#111817" />
            </linearGradient>
            <filter id="graph-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.1" stdDeviation="1.35" floodColor="#73f1cc" floodOpacity="0.3" />
            </filter>
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
            const nodeExplanation = graph.nodeExplanations.find((item) => item.nodeId === node.id);
            const attributionValue = nodeExplanation?.source === "model" || nodeExplanation?.source === "simulation"
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
                tabIndex={0}
                aria-label={`${node.label}: ${node.evidence}`}
                onClick={() => onSelectNode(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode(node.id);
                  }
                }}
              >
                <title>{node.evidence}</title>
                {focusMode === "attribution" && (
                  <>
                    <circle
                      className="graph-attribution-ring"
                      r={radius + 3.25}
                      pathLength="100"
                      strokeDasharray={`${attributionValue} ${100 - attributionValue}`}
                      transform="rotate(-90)"
                    />
                    <text className="graph-attribution-label" y={-radius - 4.2}>
                      {getAttributionTag(nodeExplanation)}
                    </text>
                  </>
                )}
                <circle className="graph-node-halo" r={radius + 2.4} />
                <circle className="graph-node-core" r={radius} />
                <text className="graph-node-glyph" y="0.8">{getGraphNodeGlyph(node)}</text>
                <text className="graph-node-label" y={radius + 5.2}>{shortGraphLabel(node.label, graphLabelLength(node))}</text>
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
      metric: "Agentic workflow"
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
        <Bot size={24} />
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
          <li>Generate the care moment.</li>
          <li>Point to one next action, trend context, and the agentic workflow trace.</li>
        </ol>
        <p className="talk-track">
          "This is the boring middle of chronic care. Maya is not in crisis, but the system keeps her adherent by catching friction while it is still small."
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
          <li>Generate the care moment.</li>
          <li>Switch to the clinician inbox and show the prioritised handoff plus audit trail.</li>
        </ol>
        <p className="talk-track">
          "The AI does not pretend to be a doctor. It recognises that coaching is the wrong mode and moves the patient into clinical review."
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
          Chronic care fails in week seven, not at onboarding. Adherence OS turns home check-ins, biomarkers and patient language into an agentic care workflow: intake, trend calculation, safety guardrail and clinician handoff.
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
    "Clinicians receive summaries, not automated clinical decisions."
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
            <p className="section-kicker">AI architecture</p>
            <h2>Safe by design</h2>
          </div>
          <Bot size={24} />
        </div>
        <p>
          The route can call OpenAI for structured output, then a deterministic rules layer overrides unsafe medication language and urgent symptoms before the result reaches the UI.
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

function formatSignedPercent(value: number) {
  const percentage = Math.round(value * 100);
  return `${percentage > 0 ? "+" : ""}${percentage}%`;
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
    return `-${formatPercent(explanation.contribution)}`;
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
  if (explanation.source === "simulation") return "SIM";
  return `${Math.round(explanation.impactShare * 100)}%`;
}

function formatFeatureValue(value: number) {
  if (Math.abs(value) >= 20) return value.toFixed(0);
  if (Math.abs(value) >= 5) return value.toFixed(1);
  return value.toFixed(2);
}

function riskBand(value: number) {
  if (value >= 0.55) return "High risk";
  if (value >= 0.35) return "Review";
  if (value >= 0.18) return "Watch";
  return "Low risk";
}

function getGenerationNotice(reason: CarePlanResponse["fallbackReason"], meta?: CarePlanResponse["meta"]) {
  const timing = meta ? ` Decision completed in ${meta.durationMs} ms.` : "";
  if (reason === "openai-not-configured") {
    return `OpenAI is not configured. The deterministic local safety engine produced this result.${timing}`;
  }
  if (reason === "invalid-openai-output") {
    return `OpenAI returned an invalid result. The deterministic local safety engine took over safely.${timing}`;
  }
  if (reason === "openai-error") {
    return `OpenAI was unavailable. The deterministic local safety engine took over safely.${timing}`;
  }
  return meta?.providerAttempted ? `OpenAI structured output passed deterministic safety checks in ${meta.durationMs} ms.` : null;
}

function buildCarePlanAnnouncement(plan: CarePlan) {
  const nextStep = plan.escalation.needed ? "A clinician handoff is required." : "Coaching can continue.";
  return `Care moment updated. ${plan.headline} Risk level: ${riskLabels[plan.riskLevel]}. ${nextStep}`;
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
  const base = node.type === "patient" ? 5.8 : node.type === "risk" ? 5.7 : node.type === "clinician" ? 5 : 4.55;
  return Math.min(7.1, base + centrality * 0.16);
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
