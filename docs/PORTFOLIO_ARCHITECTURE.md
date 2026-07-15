# Portfolio Architecture

## Portfolio Shape

This repository is intentionally a **single flagship**, not a collection of loosely related demos. Adherence OS is broad enough to demonstrate product, frontend, backend, data, ML, AI, safety, testing, operations, and architecture judgment through one credible workflow.

Adding two unrelated projects before the hackathon would reduce depth, confuse the story, and conflict with the product's safety-first scope. Future portfolio projects should live in separate repositories when they have distinct users and business outcomes.

## Competency Map

| Competency | Evidence in Adherence OS |
|---|---|
| Product engineering | Patient check-in, graph-first decision workspace, local clinician review, explicit empty/loading/error states |
| Full-stack engineering | React workspace, Next.js routes, Zod boundaries, state invalidation, static patient routes |
| Data engineering | Deterministic synthetic cohort, temporal source contract, typed data validation, reproducible artifacts |
| ML engineering | Prospective target, patient-isolated split, monotonic training, challenger, bootstrap spread, calibration, abstention, parity |
| AI engineering | Structured provider output, timeout, no retries, schema validation, deterministic recomputation, safe fallback |
| Explainability | Exact log-odds attribution, provenance-labelled evidence graph, local sensitivity, bounded score comparisons |
| MLOps | Versioned artifact and feature contract, reproduction check, model quality gates, rollback documentation |
| Security and safety | Synthetic-only policy, secret hygiene, safe logging, deterministic escalation, medication-language guardrails |
| SRE and operations | Health route, smoke matrix, bundle budget, CI, runbook, known rollback point |
| Technical communication | Architecture, ML record, threat model, demo assets, interview guide, ADRs |

## Shared Components

There are no cross-project packages because there is only one project. Reuse occurs within the modular monolith:

- Domain contracts in `app/lib/types.ts`.
- Feature-source contract and transforms in `app/lib/modelFeatureContract.ts` and `app/lib/modelFeatures.ts`.
- Deterministic care and safety rules in `app/lib/careEngine.ts`.
- Runtime artifact and patient validators.
- One browser/API test registration shim and deterministic fixtures.

Extracting these into separate packages would add versioning and build overhead without a current consumer.

## Deliberate Architecture Differences

The system uses different mechanisms for different responsibilities:

- **ML** estimates adherence interruption and may abstain.
- **Rules** own safety and cannot abstain because the model is unsupported.
- **Graph analytics** explain evidence relationships but do not alter safety.
- **Optional LLM** is a constrained communication experiment and does not own the displayed plan.
- **Human review** remains the owner of assessment and treatment decisions.

This separation is more important than presenting a large technology stack.

## Interview Positioning

Open with the product boundary, not the frameworks:

> Adherence OS is a supervised decision layer for at-home GLP-1 programmes. It predicts a synthetic next-week adherence interruption, explains the evidence, compares bounded support assumptions, and lets independent deterministic rules stop coaching and prepare a human review draft.

Then demonstrate one trade-off at each layer:

1. Browser inference reduces raw data movement but needs strict artifact and feature contracts.
2. A marginal gate can prevent obvious extrapolation but does not solve joint drift.
3. A provider can improve wording, but deterministic safety and fallback own reliability.
4. A modular monolith is the right MVP architecture; persistent identity, audit, and monitoring become separate services only when real workflow requirements justify them.

## Future Portfolio Gaps

The next separate portfolio project should complement rather than duplicate Adherence OS. A small data-reliability control plane or real-time risk-monitoring system could demonstrate durable storage, event replay, lineage, and operational telemetry. It should be added only after this hackathon flagship is delivered and should have its own users, data, and interview story.
