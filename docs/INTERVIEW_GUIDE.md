# Interview Guide

## Two-Minute Introduction

> Adherence OS is a supervised decision layer for at-home GLP-1 programmes. Chronic-care adherence often fails between appointments, but a generic chatbot is not a safe answer. This prototype predicts a synthetic next-week adherence interruption from structured history and a current check-in, explains the active evidence in an inspectable graph, and compares a few bounded support assumptions. An independent deterministic safety engine can stop all coaching and prepare a human review draft. The model may abstain; safety may not.
>
> Technically, it is a Next.js modular monolith with browser-side constrained logistic inference, a versioned Python/TypeScript feature contract, patient-isolated evaluation, a simple challenger, bootstrap model spread, exact log-odds attribution, and runtime support gating. OpenAI is optional and constrained to a structured provider attempt; the final plan is recomputed deterministically. The entire keyless workflow, including escalation, is reproducible in CI.

## Ten-Minute Technical Walkthrough

### 0:00-2:00 Product Boundary

- Open the Decision map on Maya's coaching case.
- State the target: next-week adherence interruption, not medical risk.
- Show 42% supported risk, Watch mode, and the 16-point Meal-timing comparison.
- Say that the comparison changes explicit feature assumptions and is not a treatment effect.

### 2:00-4:00 Explainability

- Open Attribution and select one model contributor.
- Distinguish authored context rank, signed model contribution, bounded simulation, and deterministic rule provenance.
- Explain exact reconstruction in log-odds space and why bootstrap spread is not a confidence interval.

### 4:00-5:30 Safety

- Load the safety case.
- Show model abstention and the independent NHS 111 path.
- Point out that action nodes are suppressed and the review draft is local and unsent.
- Explain the four support/safety states.

### 5:30-7:30 ML Lifecycle

- Open Model record.
- Show patient-isolated train/validation/test splits and the validation-selected threshold.
- Compare the 14-feature model with recent adherence only.
- Separate all-row evaluation from the 90% runtime-supported population.
- Show `adherence-feature-source-v1` and explain the twelve raw parity fixtures plus twenty scoring fixtures.

### 7:30-9:00 Reliability And AI

- Explain keyless completeness, provider timeout, zero retries, schema validation, and deterministic recomputation.
- Show CI and local gates: 73 deterministic tests, model reproduction, build, bundle, six browser/axe contracts, and smoke.
- Explain why an unrestricted agent is less appropriate than an explicit workflow for safety-relevant decisions.

### 9:00-10:00 Production Path

- Name what is missing: real validation, identity, persistent audit, telemetry, governance, and integration.
- Explain the future interfaces without claiming they exist.
- End with the core engineering judgment: use the smallest architecture that makes the decision inspectable and safe.

## Hardest Engineering Challenges

### Train/Serve Feature Parity

The first model version proved only that Python and TypeScript scored the same engineered vector. It could not detect drift in dose windows, routine text, prior-failure, or side-effect transforms. The fix was an artifact-bound raw-source contract used before training and before browser scoring, plus taken/missed cross-language fixtures.

### Safety Independence

An adherence model and LLM are both the wrong owners for urgent clinical routing. Deterministic flags and thresholds run independently, and a four-cell contract tests supported/unsupported crossed with safety-clear/safety-active.

### Honest Explainability

The product has three different meanings of “important”: authored context rank, local model contribution, and tested-action score change. The UI and graph label them separately and avoid causal or confidence language.

### Demo Reliability

The optional provider path cannot be the critical path. Keyless mode is complete, deterministic, and covered by browser plus smoke tests; video, deck, and screenshot walkthrough are verified fallbacks.

## Important Trade-Offs

| Decision | Benefit | Cost |
|---|---|---|
| Browser model | Low latency, inspectable artifact, reduced raw data movement | Bundle size and strict contract/version responsibility |
| Constrained logistic model | Monotonic signs and exact explanation | Less flexible than nonlinear models |
| Marginal support gate | Clear fail-closed behavior | Cannot detect joint or semantic drift |
| Modular monolith | Simple local run, coherent transactions, small operational surface | Large main client module and no independent scaling |
| In-memory review drafts | Truthful, deterministic demo without fake delivery | No persistence, assignment, or recovery |
| Optional provider with deterministic recomputation | Demonstrates structured AI without weakening safety | Provider wording currently adds no user-visible value |

## Scaling Discussion

At current scale, the browser graph and model are trivial. For production:

1. Put identity and authorisation in front of every patient and review operation.
2. Persist check-ins, model decisions, safety outcomes, and immutable audit events transactionally.
3. Use an outbox only when external messaging or asynchronous review assignment exists.
4. Version patient, feature, and decision schemas.
5. Serve approved model artifacts through a registry and staged rollout path.
6. Aggregate coverage, abstention, drift, delayed labels, safety mode, latency, and fallback metrics.
7. Add queues or services only for independently scaling or failure-isolated workloads.

## Failure And Detection

| Failure | Detection | Behavior |
|---|---|---|
| Provider unavailable | Timeout/error and fallback metadata | Complete deterministic plan |
| Feature missing or unsupported | Typed support violation | Withhold all patient-specific ML evidence |
| Red flag active | Deterministic flag/phrase rule | Suppress coaching and show human destination |
| Artifact drift | `pnpm check:model` or runtime parser | Fail release or fail artifact loading |
| Browser regression | Playwright, axe, console, responsive checks | Fail CI |
| Build growth | Bundle gate | Fail above 155 kB gzip |
| Server unavailable | Health and smoke | Restart or roll back; use media fallback |

## Security And Cost

- Synthetic data only.
- Never log free text or patient payloads.
- Public keyed deployment is prohibited because the route has no auth or rate limiting.
- Keyless mode avoids provider tokens entirely.
- Provider mode has an eight-second deadline and no retries.
- Browser inference avoids a model-serving service for the MVP.
- Production identity, audit, retention, PII controls, and clinical governance remain required.

## What I Would Change With More Time

1. Run patient and clinician comprehension studies and publish only observed results.
2. Validate feature definitions and model behavior retrospectively on governed real outcomes.
3. Add a joint out-of-distribution detector and calibration monitoring alongside, not instead of, deterministic safety.
4. Add identity, durable review workflow, immutable audit, and observability.
5. Extract graph and Model record components after judging.
6. Add a stable keyless preview and visual regression once the UI is less volatile.

## Likely Questions And Strong Answers

### Why not use a transformer or gradient-boosted model?

The synthetic data and tiny demo do not justify extra flexibility. A constrained logistic model makes directionality and exact local decomposition inspectable. I would compare nonlinear candidates only on governed real labels, calibration, subgroup behavior, latency, and explanation quality.

### Is the 42% score clinically meaningful?

No. It is a deterministic synthetic demo output that proves the pipeline and UX. It is not clinically validated, a medical-risk score, or a production threshold.

### Is the graph a knowledge graph or GNN?

It is a typed evidence graph used for provenance and bounded route explanation. It is not learned, causal, or a GNN. That is deliberate because the judged problem is inspectability, not graph prediction.

### What is agentic about the system?

It uses an explicit workflow with specialised stages: intake, feature construction, prediction, explanation, bounded comparison, deterministic safety, and human approval. This is safer and more testable than an unrestricted autonomous agent. The LLM does not choose tools or own state transitions in the MVP.

### Why does the model abstain separately from safety?

Model support answers whether patient-specific ML evidence may be shown. Safety answers whether coaching is allowed. Combining them would let an unsupported model disable urgent rules or let a supported score overrule a red flag.

### How do you prevent train/serve skew?

The artifact declares `adherence-feature-source-v1`. Python training and TypeScript inference implement that source contract, twelve raw fixtures verify all 14 features to `1e-9`, and twenty rows verify consensus plus bootstrap scores. Real-world semantic validity remains a separate validation task.

### Why no database or microservices?

The MVP has three synthetic records, no identity, no real delivery, and a three-minute story. A database or broker would add operational claims without improving the judged workflow. The production design introduces persistence and asynchronous boundaries when real audit and messaging requirements exist.

### What would block production launch?

Lack of clinical validation, real user evidence, identity and authorisation, durable audit, privacy assessment, security testing, monitoring, incident governance, and integration ownership. The repository states those blockers explicitly.
