# Operations

## Operating Mode

The supported judged-demo mode is a local production build with synthetic data and no provider key. This keeps the full workflow deterministic and removes network latency, external availability, and usage cost from the critical path.

## Runtime Signals

### Implemented

- `GET /api/health` reports service status, synthetic data mode, patient count, model version, seed, sample count, and feature count.
- Care-plan responses include provider-attempt and duration metadata.
- Provider errors log only a short error message.
- CI records typecheck, model reproduction, tests, build, bundle, browser/accessibility, and smoke evidence.
- Browser tests reject unexpected console errors.

### Not Implemented

- Persistent logs, metrics, traces, dashboards, or alert delivery.
- User, tenant, request, or distributed correlation identifiers.
- Model inference aggregation, feature drift, delayed labels, or retraining automation.
- Queue depth, database health, or worker telemetry because those components do not exist.

## Prototype SLIs

These are release indicators, not production SLO measurements:

| Indicator | Release expectation | Evidence source |
|---|---|---|
| Health readiness | HTTP 200 and `status: ok` | Smoke and `/api/health` |
| Keyless care-plan completion | Complete fallback response | API tests and smoke |
| Safety determinism | Every seeded/adversarial urgent case escalates | Contract tests and smoke |
| Browser workflow | Six Playwright contracts pass | `pnpm test:browser` |
| Model reproducibility | Zero artifact or fixture differences | `pnpm check:model` |
| Client size | Home first-load <=155 kB gzip | `pnpm check:bundle` |

## Proposed Production SLOs

The following are future design targets and have not been measured:

- Keyless decision API availability: 99.9% monthly.
- Health endpoint success: 99.95% monthly.
- Deterministic decision latency: p95 below 300 ms at the service boundary.
- Provider-assisted response: p95 below 8 seconds with fallback rate monitored separately.
- Urgent-rule false-negative escape in the approved test set: zero.
- Audit-event persistence: 99.99% accepted within 5 seconds.

Real targets require traffic, clinical workflow, hosting, and cost evidence.

## Model Monitoring Design

For production, record only approved, minimised, pseudonymised fields:

- Artifact and feature-contract versions.
- Support status and typed violation categories.
- Score band and decision threshold, subject to privacy review.
- Safety mode independently of the model.
- Latency and fallback reason.
- Delayed adherence label when governance permits.

Monitor coverage, abstention, event coverage, calibration, precision/recall at a reviewed operating point, feature distribution drift, and subgroup performance. Do not auto-retrain from drift alone; require data-quality checks, retrospective evaluation, clinical review, and a rollback-ready release.

## Cost Controls

- Keyless mode is the default and costs no provider tokens.
- Provider calls use one model, an eight-second deadline, and zero retries.
- Public keyed hosting is prohibited for the MVP.
- Model inference runs locally from a compact JSON artifact.
- Test-only parity data is excluded from the browser bundle.
- Repository assets are served only when opened and are not part of the app bundle.

## Release And Rollback

Use [deployment.md](deployment.md) for the release gate and [RUNBOOK.md](RUNBOOK.md) for incident handling. Roll back with a normal deployment of the last green commit or a `git revert`; never rewrite shared history during the event.
