# Repository Audit

Audit date: 2026-07-12

## Executive Finding

This repository contains one substantial project: **Adherence OS**, a synthetic-data hackathon flagship for supervised at-home GLP-1 adherence support. It is not a multi-project portfolio or monorepo. The best portfolio strategy is to deepen this product's evidence and explain its trade-offs, not add unrelated services or tutorial projects before judging.

The application is strongest where prediction, explainability, deterministic safety, and a human review boundary meet. Its largest production gaps are real-world validation, identity and access control, persistent audit storage, operational telemetry, and a hosted preview. Those gaps are deliberately documented rather than simulated.

## Project Inventory

| Project | Purpose | Classification | Priority |
|---|---|---|---:|
| Adherence OS | Predict synthetic next-week adherence interruption, explain the active evidence, compare bounded support assumptions, and stop coaching when deterministic red flags require human review | Flagship project | 1 |

No additional application was found under this repository root. The separate iOS workspace mentioned in prior work is not part of this Git repository and is therefore outside this audit.

## Architecture

- **Application:** Next.js 15 App Router, React 19, strict TypeScript.
- **Runtime shape:** keyless-first modular monolith with browser ML and Next.js route handlers.
- **Data:** three checked-in synthetic patients with eight weekly snapshots; no real patient records or database.
- **ML:** deterministic NumPy training, patient-isolated splits, constrained logistic model, 16 patient-bootstrap members, validation-matched challenger, marginal support gate, and browser inference.
- **Feature contract:** `adherence-feature-source-v1` binds Python training and TypeScript inference; twelve taken/missed raw fixtures reproduce all 14 features.
- **AI:** optional OpenAI structured-output attempt with an eight-second deadline; the displayed plan is recomputed deterministically.
- **Safety:** deterministic red-flag and threshold rules remain independent of the adherence model and provider.
- **Graph:** typed in-memory evidence graph with provenance and bounded score comparisons; not a learned or causal graph.
- **Operations:** health route, production smoke, bundle budget, deterministic model reproduction, GitHub Actions, and browser/accessibility contracts.

See [architecture.md](architecture.md) for the implementation diagram and study order.

## Run And Verify

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm check:model
pnpm build
pnpm check:bundle
pnpm start
```

With the production server running:

```bash
pnpm test:browser
pnpm smoke
```

Current verified checkpoint:

- TypeScript: pass.
- Deterministic tests: 73/73 pass.
- Model reproduction: pass for `2026-07-12-edge-logistic-bootstrap-v5`.
- Production build: pass.
- Home first-load budget: 151.8/155.0 kB gzip.
- Chromium and bounded axe contracts: 6/6 pass.
- Production smoke: pass on `http://127.0.0.1:3001`.

## Scorecard

| Category | Score / 10 | Evidence and principal limitation |
|---|---:|---|
| Product completeness | 9.0 | Complete coaching and escalation demo; state is intentionally in-memory |
| Technical depth | 9.2 | ML, graph, AI boundary, deterministic safety, and runtime contracts form one coherent decision system |
| Code quality | 7.5 | Strong typed domain modules; `app/page.tsx` and CSS ownership remain concentrated |
| Reliability | 9.1 | Keyless fallback, deterministic seeds, abstention, browser contracts, smoke, and release gates |
| Data engineering depth | 6.5 | Versioned synthetic generation and contracts; no warehouse, CDC, orchestration, or persistent lineage because the product does not need them |
| ML or AI engineering depth | 9.2 | Reproducible training, challenger, selective evaluation, exact explanations, raw parity, and guarded provider path; no real labels or production monitoring |
| UI and UX quality | 9.1 | Responsive graph-first product with patient and review workflows; dense secondary technical view |
| Testing | 9.8 | Unit, API, safety, model, graph, browser, responsive, accessibility, and smoke contracts |
| Observability | 6.5 | Readiness, safe provider metadata, and CI evidence; no durable metrics, traces, or alerting backend |
| Security | 7.0 | Synthetic-only, validation, secret hygiene, safe logging, deterministic guardrails; no auth or rate limiting for keyed public use |
| Documentation | 9.4 | Architecture, ML, safety, deployment, walkthrough, demo, audit, and study guides |
| Interview value | 9.5 | Clear business problem, defendable boundaries, live proof, reproducible ML, and explicit trade-offs |

## Main Gaps By Discipline

### Reliability

- Production `build` and `start` share `.next`; rebuilds require stopping the production server.
- Client state is reset by refresh and has no durable audit store.
- There is no hosted preview or external uptime evidence.

### Correctness

- Raw feature parity is software evidence on synthetic fixtures, not retrospective validation on real outcomes.
- Marginal bounds do not detect multivariate or semantic drift.
- The graph ranks authored evidence relationships; it is not a causal model.

### Tests

- No pixel-diff visual regression or real assistive-technology study.
- No load test is warranted for the tiny local graph, but the optional provider route lacks a public keyed abuse test because keyed public deployment is prohibited.
- No clinician or patient comprehension study has been completed.

### Observability

- No metrics sink, distributed tracing, persistent audit log, or alert delivery.
- Provider duration is returned as non-sensitive metadata but not aggregated.
- There is no real label-arrival process for model monitoring.

### Documentation

- Production identity, persistence, monitoring, and governance are future-state only and must remain labelled that way.
- Fallback media must be regenerated after material UI or metric changes.

### UI

- The Model record can overwhelm the three-minute judge path.
- The primary client component and two stylesheets are large, increasing maintenance risk.
- The main workspace is state-based rather than URL-addressable.

### Developer Experience

- The release gate is several commands rather than one local `verify` command.
- Screenshot and presentation generation depend on a running production server and local media tooling.

## Data And Security Risks

- All data is synthetic and must remain so.
- The optional provider endpoint is unauthenticated. It is safe for local controlled use, not a public paid-key deployment.
- No request or check-in text should enter logs.
- A production healthcare system would require identity, role-based access, tenant isolation, encryption policy, retention controls, clinical governance, privacy assessment, and regulated-data validation.

## Deployment Readiness

**Ready:** local keyless production demo, clean-checkout CI, deterministic model recreation, screenshot capture, captioned video fallback, and rollback to a known commit.

**Not ready:** production healthcare deployment, real patient ingestion, public keyed AI endpoint, multi-tenant operation, or claims of clinical benefit.

## Portfolio Decision

Keep Adherence OS as the single flagship. Do not add a lakehouse, Kafka, Kubernetes, vector database, agent swarm, or authentication facade merely to increase the technology count. In interviews, explain the production target architecture and show why those components are deferred until real scale, data, and governance requirements exist.

The detailed backlog remains in [improvement_backlog.md](improvement_backlog.md).
