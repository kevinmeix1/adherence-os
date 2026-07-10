# Adherence OS

AI-supported at-home GLP-1 metabolic care prototype for the Reimagine Health with eMed hackathon.

## What It Shows

- GLP-1 obesity and metabolic-care focus.
- Synthetic 8-week JSON data for 3 patients.
- Patient check-in flow with normal and escalation scenarios.
- Clinician inbox with prioritised async summaries.
- Routed synthetic patient directory with summary metrics, clickable records, and loading/error/empty states.
- Agentic workflow trace for intake, trends, risk, guardrails, and clinician handoff.
- Clickable live inference graph with decision-path, selected-neighbourhood, attribution, and all-signal focus modes.
- Per-node provenance that distinguishes model attribution, bounded simulation, deterministic rules, and patient context.
- Ranked support-route comparison that is visibly suppressed when a deterministic safety rule activates.
- Adherence Twin that predicts each patient's next likely dropout point.
- 7-day Rescue Plan with patient micro-actions and clinician triggers.
- Unsafe medication-request demo that blocks dose-change advice.
- Model Lab with monotonic synthetic-cohort training, exact local log-odds decomposition, one-feature-at-a-time sensitivity, calibration, and transparent what-if simulation.
- Judging scorecard mapped to user impact, innovation, feasibility, and demo quality.
- Safety rules: no diagnosis, no medication changes, red flags escalate.
- Optional OpenAI structured-output API route with deterministic safety fallback.
- Rebuilt decision-cockpit UI informed by proven eMed, Oura, Levels, and Apple Health interaction patterns.

## Run Locally

Prerequisites: Node.js 20+ and pnpm. Python 3 with NumPy is only required to regenerate the synthetic model artifact.

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Confirm the running demo and model artifact are ready:

```bash
pnpm smoke
```

The health endpoint is available at `http://localhost:3000/api/health`.

## Demo Assets

- [Video walkthrough](outputs/adherence-os-demo.mp4)
- [Presentation deck](outputs/adherence-os-demo.pptx)

## Optional OpenAI Mode

Copy `.env.example` to `.env.local` and add an API key:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
```

Without a key, the app still runs using the local safety engine.

## ML Model Lab

Regenerate the synthetic cohort and edge model:

```bash
python3 -m pip install numpy
pnpm train:model
```

The exported model lives at `data/adherence-model.json` and is used by the Model Lab tab for local browser inference. Directional coefficients are constrained with projected gradient descent so correlated synthetic features cannot learn clinically counterintuitive signs.

## Product and Technical Notes

- [Architecture](docs/architecture.md)
- [Design references](docs/design-references.md)
- [Live demo scripts](docs/demo-scripts.md)
- [Safety rules](docs/safety-rules.md)
