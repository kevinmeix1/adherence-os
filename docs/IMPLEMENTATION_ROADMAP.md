# Implementation Roadmap

## Product North Star

Preserve one inspectable story:

1. Predict near-term synthetic adherence interruption.
2. Explain the active driver and evidence source.
3. Compare a bounded support assumption.
4. Let independent deterministic safety rules stop coaching and hand off to a human.

## Completed Foundation

- Keyless-first Next.js application with patient, evidence-map, local review, model, safety, and demo views.
- Three synthetic patients with eight weeks of validated history.
- Deterministic care rules, typed urgent symptom flags, destination-aware handoff, and medication-language guardrails.
- Optional structured provider attempt with timeout, validation, and complete deterministic recomputation.
- Reproducible constrained model with patient-isolated evaluation, challenger benchmark, bootstrap spread, calibration, and marginal-bound abstention.
- Versioned raw feature source with Python/TypeScript taken/missed parity across all 14 features.
- Typed evidence graph with signed attribution and safety suppression.
- Production CI, model check, bundle gate, browser/accessibility contracts, smoke, screenshots, deck, and captioned video.

## Current Release Work

| Work item | Status | Exit evidence |
|---|---|---|
| Refresh screenshots from the v5 artifact | Complete | Nine current desktop/mobile PNG images, documentation mirrors, and README preview |
| Rebuild slide deck and video | Complete | Visual inspection, overflow check, stream probe, subtitle parity, audio levels, clean decode |
| Finish production study pack | Complete | Audit, security, threat model, testing, operations, runbook, interview guide, ADRs |
| Push and verify remote CI | Pending | SSH push, ready PR, successful GitHub Actions run |

## Next Highest-Value Work

1. **Task-based comprehension study:** observe a few representative patients and clinicians completing the coaching and escalation paths; publish only real anonymised findings.
2. **Stable keyless preview:** deploy only if an existing account allows a low-risk preview with no provider key and health/smoke verification.
3. **Visual regression:** protect the nine judged states after the event when UI iteration becomes less time-sensitive.
4. **Component extraction:** split Model record and graph canvas from `app/page.tsx` without changing behavior.
5. **Production design exercise:** document identity, persistent audit, telemetry, and model-monitoring interfaces after real workflow requirements are available.

## Explicitly Deferred

- Real patient data or EHR/device integration.
- Authentication, database, queue, or notification infrastructure in the hackathon MVP.
- General-purpose chatbot behavior.
- Autonomous diagnosis, medication decisions, or treatment recommendations.
- Learned knowledge graphs, causal claims, GNNs, or agent autonomy.
- Multi-condition expansion.
- Kafka, Spark, dbt, Kubernetes, feature-store, or vector-database adoption without a product requirement.

## Acceptance Gate

The release candidate is ready only when:

- `pnpm typecheck`, `pnpm test`, and `pnpm check:model` pass.
- `pnpm check:docs` resolves every local Markdown and image target.
- `pnpm build` and `pnpm check:bundle` pass.
- Six browser/accessibility contracts pass against the production build.
- Smoke passes for pages, health, coaching, and every urgent safety fixture.
- No stale numeric claim remains in UI, docs, screenshots, deck, video, or subtitles.
- No secret or real patient data is tracked.
- The branch is pushed and remote CI completes successfully.

Detailed task history: [improvement_backlog.md](improvement_backlog.md).
