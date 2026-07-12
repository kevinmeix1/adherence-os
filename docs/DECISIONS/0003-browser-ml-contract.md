# ADR 0003: Bind Browser ML To A Versioned Raw Feature Contract

- Status: Accepted
- Date: 2026-07-12

## Context

Python initially generated engineered features directly while the browser inferred them from patient history and current check-in text. Scoring parity alone could not detect train/serve drift in dose windows, routine disruption, prior failure, or side-effect spike.

## Decision

Define `adherence-feature-source-v1`, embed its version in the model artifact, construct training rows through that source contract, and derive browser features through a dedicated TypeScript module. Keep raw-feature and scoring fixtures in a test-only JSON artifact.

## Consequences

- Six taken and six missed raw cases reproduce all 14 features across languages to `1e-9`.
- Version drift throws before scoring.
- Missing values flow into typed abstention instead of silent imputation.
- A small browser-code increase leaves 3.2 kB under the bundle budget.
- Synthetic parity does not prove real-world semantic validity or joint-distribution support.

## Rejected Alternatives

- **Only compare final probabilities:** misses feature-transform drift.
- **Generate TypeScript from Python at build time:** adds tooling complexity and makes the source semantics harder to review.
- **Server-only inference:** unnecessary for the local demo and reduces edge-inference proof.
