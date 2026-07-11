# Project Audit

Audit date: 2026-07-11

## 1. Product Summary

Adherence OS is a hackathon MVP for at-home GLP-1 adherence support. It combines a short patient check-in, deterministic clinical guardrails, a browser-side adherence-risk model, explainable graph analytics, bounded what-if support routes, and an asynchronous clinician handoff. The intended users are patients managing a long programme and care teams monitoring many patients between appointments. The immediate audience is the eMed hackathon judging panel.

The product's strongest proposition is the dual-track decision: ML estimates adherence failure risk while an independent safety layer decides whether coaching must stop. The stricter path wins.

## 2. Current Architecture

- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Lucide icons.
- **Primary experience:** one client-rendered workspace in `app/page.tsx` with Live twin, Patient app, Care queue, Model lab, Safety, Demo script, and Judge proof views.
- **Routed records:** statically generated `/patients` and `/patients/[patientId]` pages with loading, error, empty, and not-found states.
- **Backend:** `POST /api/care-plan` and `GET /api/health` route handlers.
- **Safety:** deterministic rules in `app/lib/careEngine.ts`, applied before and after optional model generation.
- **ML:** a monotonic logistic model exported to `data/adherence-model.json` and scored in the browser.
- **Graph:** a typed in-memory graph built from the patient, check-in, model score, care plan, and synthetic cohort.
- **AI:** optional OpenAI structured output validated with Zod; a complete deterministic fallback works without a key.
- **Data:** three synthetic patients with eight weekly snapshots each; no database or real patient data.
- **Testing:** Node test runner with a small TypeScript registration shim; 43 tests across safety, API/provider failure handling, data validation, ML, graph analytics, health, patient dashboards, queue consistency, and routed states, plus live normal/escalation smoke.
- **Deployment:** checked-in GitHub Actions production gate, a successful remote PR run, and a keyless-first deployment runbook. No hosted preview is configured.

## 3. Core User Journey

1. Open Live twin on Maya Patel in Coaching mode.
2. Read one decision headline and four concise operating metrics.
3. Inspect the active risk driver, graph path, provenance, and model attribution.
4. Compare bounded support routes and show why one ranks first.
5. Switch to Escalation.
6. Observe that deterministic red flags suppress every simulated intervention and activate a clinician handoff.
7. Open the Care queue and review the structured audit trail.
8. Use Model lab only when technical depth is requested.

## 4. Main Strengths

- The opening screen immediately demonstrates the differentiated graph experience.
- Normal and escalation paths are seeded, deterministic, and visually distinct.
- Safety is independent from both the LLM and the adherence model.
- The app remains complete without a network connection or API key.
- Structured AI output and request data are validated with Zod.
- Model explainability is unusually strong for a hackathon: exact log-odds reconstruction, local sensitivity, calibration, and provenance.
- Graph interventions are explicitly described as planning comparisons rather than causal treatment effects.
- Mobile layouts at 390px and 320px have been manually verified without page overflow.
- Patient directory routes include realistic loading, error, empty, and not-found states.
- Public documentation includes architecture, safety boundaries, model details, demo assets, and design references.
- Patient and model artifacts fail early through typed runtime validation, and the synthetic model has a non-destructive reproduction check.
- A single Reset command restores the rehearsed opening state after any demo path.
- Coaching and Escalation now drive the clinician queue consistently: zero reviews becomes one review only when the safety path is active.
- The remote production workflow and current video/deck fallback assets have been verified against the final UI.

## 5. Main Weaknesses

- `app/page.tsx` is approximately 2,300 lines and owns most view state and UI composition.
- `app/globals.css` and `app/product.css` total more than 5,000 lines, with legacy and product-specific rules sharing ownership.
- No hosted preview URL is configured; the public repository, local production build, and fallback assets are the current sharing paths.
- The main workspace views are state-based rather than URL-addressable, so a refresh always returns to the opening graph.
- There is no automated browser test or visual regression test.
- Runtime data validators add a small amount of client code because the graph workspace consumes static artifacts directly.

## 6. Bugs Or Risks

No current P0 functional bug was reproduced during this audit. The following risks remain:

- A public deployment with `OPENAI_API_KEY` configured would expose an unauthenticated cost-bearing endpoint. This is acceptable only for a bounded hackathon demo.
- Smoke testing requires the user or CI job to start the server first.
- Large component and stylesheet files increase regression risk for last-minute edits.

## 7. UX Gaps

- The technical depth is excellent but can overwhelm the three-minute story if the presenter opens every panel.
- Secondary Safety, Demo scripts, and Judge proof views remain behind the overflow menu and depend on rehearsal.

## 8. UI Polish Gaps

- The README image and social preview must be refreshed after any future material opening-screen change.
- Dense graph labels remain intentionally abbreviated on small canvases.
- Multiple historical style layers make visual consistency harder to maintain than the rendered experience suggests.
- The Model lab is information-rich and should remain a secondary technical proof rather than the opening workflow.

## 9. Performance Risks

- The home route's first load is approximately 143 kB, which is acceptable for the demo.
- Every primary workspace view ships in one client module even when only the graph is initially visible.
- More than 5,000 lines of CSS increase parse and maintenance cost, though no user-visible performance issue was observed.
- Graph calculations are small for 13 nodes and three synthetic patients; they do not currently justify worker or server infrastructure.
- Demo video and deck assets add about 10 MB to the repository but are not loaded by the application.

## 10. Security And Privacy Risks

- All checked-in data is synthetic and visibly labelled.
- Secrets and local environment files are ignored; `.env.example` contains no credentials.
- API input and generated output are schema-validated.
- The safety override removes unsafe medication-change and diagnosis language from generated content.
- The care-plan route has no authentication or rate limiting. Do not deploy it with an unrestricted paid API key.
- Provider errors are logged without request contents, reducing accidental health-data exposure.
- A production healthcare system would still require authentication, authorisation, audit retention, privacy review, clinical governance, and regulated-data controls. Those are intentionally outside this MVP.

## 11. AI And Prompting Risks

- The LLM improves wording but does not own risk scoring or clinical escalation.
- The provider prompt is clear about diagnosis, medication changes, escalation, and structured output.
- Post-generation safety overrides are deterministic and tested.
- Provider timeout, invalid-output, exception, and unsafe-generation branches are exercised through controlled test doubles.
- Synthetic model metrics are strong but must never be presented as clinical validation.
- Local sensitivity is not a confidence interval; intervention rescoring is not causal evidence.

## 12. Testing Gaps

- Existing tests cover the most important deterministic contracts.
- Missing automated browser coverage for navigation, graph focus modes, menus, mobile overflow, and form loading states.
- Browser interaction checks are manual rather than part of CI.

## 13. Deployment And Demo Risks

- CI passed remotely on PR #1; no hosted preview deployment is configured.
- README setup is portable and the app builds without secrets.
- The local demo requires the presenter to start the server before running smoke checks.
- The optional AI path should not be relied on during judging; deterministic fallback is the safer live-demo mode.
- The checked-in 2:54 video and 10-slide deck are current; they must be regenerated after future material UI changes.
- The presenter should keep a production build running locally and avoid dependency installation on event Wi-Fi.

## 14. Highest-Impact Improvement Areas

1. Freeze feature work and rehearse the event-day production start, normal path, escalation path, reset, and fallback assets.
2. Add a keyless hosted preview only when an existing deployment account makes it low risk.
3. Add automated browser or accessibility checks only after the judged demo is frozen.
4. Defer component and CSS decomposition until after judging.

## Baseline Validation

| Command | Result | Notes |
|---|---|---|
| `pnpm typecheck` | Pass | Strict TypeScript, 2026-07-11 |
| `pnpm test` | Pass | 19 tests, 0 failures |
| `pnpm build` | Pass | Home first load approximately 140 kB |
| `pnpm smoke` | Pending in baseline | No server was running during the first audit pass; required after the improvement loop |

## Baseline Score

| Category | Score / 10 | Evidence |
|---|---:|---|
| Product clarity | 9.0 | Clear adherence-risk, explanation, intervention, and safety story |
| Demo impact | 9.0 | Graph-first opening and visible normal-to-escalation switch |
| UI polish | 9.0 | Strong desktop/mobile finish and purposeful motion |
| UX flow | 8.5 | Main path is clear; secondary views and reset depend on rehearsal |
| Technical architecture | 8.0 | Strong separation of ML, safety, graph, and API; large UI module |
| Code quality | 7.0 | Typed and readable logic, but concentrated page/CSS ownership |
| Reliability | 8.5 | Deterministic fallback and seeded paths; provider deadline missing |
| Testing | 7.5 | Excellent core contract tests; no CI or browser automation |
| Error handling | 8.0 | Safe API fallback and routed page states |
| Loading/empty states | 8.0 | Good routed states and Generate loading state |
| Performance | 8.0 | Reasonable bundle and tiny graph; monolithic client surface |
| Accessibility | 7.5 | ARIA, keyboard graph nodes, focus states; no automated audit |
| Security/privacy | 8.0 | Synthetic-only, validated inputs, secret hygiene; public API risk if keyed |
| AI usefulness | 9.0 | AI is bounded, explainable, optional, and subordinate to safety |
| Documentation | 8.0 | Strong technical docs and assets; audit/backlog and deployment notes missing |
| Deployment readiness | 6.0 | Builds cleanly but has no CI or preview deployment |
| Hackathon competitiveness | 9.0 | Distinctive, credible, and aligned with judging criteria |
| Portfolio value | 8.5 | Public, technically substantial, visually polished; proof automation missing |

**Overall baseline: 8.14 / 10.**

The sprint target is 8.6+ without adding infrastructure or features that weaken demo reliability.

## Improvement Progress

Validated on 2026-07-11 after the first reliability loop:

- Live smoke now covers the normal and escalation `POST /api/care-plan` paths as well as core pages and health.
- CI runs frozen install, typecheck, tests, build, production startup, and expanded smoke; its first remote run remains to be verified.
- The optional provider has an eight-second, zero-retry deadline and a controlled fallback seam covering exceptions, invalid output, and deterministic post-generation safety.
- Synthetic patient data now loads through a typed runtime validator with bounded values, valid dates, sequential weekly history, coherent engagement counts, and unique identifiers.
- Full local validation passes with 25 tests, a production build, and expanded smoke. The home route remains approximately 141 kB first load.

The next reliability task is runtime validation for `data/adherence-model.json`.

### Checkpoint Review

Seven P1 reliability tasks are complete. The core journey is still coherent: the graph opens first, Coaching remains deterministic, and Escalation still overrides every support simulation. No visible feature was added simply to raise the feature count.

- **Improved:** API smoke depth, CI coverage, provider failure handling, patient/model data integrity, and model reproducibility.
- **Trade-off:** two compact validation modules add maintenance surface and approximately 1 kB to first load; their early failure behavior is worth that cost.
- **Current local evidence:** 29 tests pass, model reproduction passes, production build passes, and both live scenarios pass smoke.
- **Current estimated score:** 8.56 / 10, up from 8.14. Remote CI and deployment documentation keep this just below the 8.6 sprint target.
- **New top priorities:** deployment runbook and endpoint boundary, concise README demo path, explicit demo reset, safe request timing metadata, and accessible result announcements.

### Second Checkpoint Review

Eight additional P1 tasks are complete. The app remains focused on the same three-minute story; new UI is limited to a reset icon and compact model provenance.

- **Improved:** judge onboarding, visual proof, demo recovery, request observability, assistive announcements, model provenance, and operational documentation.
- **No regression found:** normal and escalation smoke still pass, Reset restores six state dimensions in the production browser, and first load remains 143 kB.
- **Current estimated score:** 8.73 / 10, above the 8.6 sprint target.
- **Current top priorities:** bundle budget, safety boundaries, Custom-state clarity, remote CI verification, and final asset refresh.

### Deep Re-Audit

More than 15 backlog tasks are complete. P0 and P1 are fully green, the final assets are current, and the remote CI production gate has passed.

- **What improved:** deterministic failure handling, live smoke depth, artifact integrity, model reproducibility, safety language coverage, event-day setup, accessibility semantics, demo reset, social proof, and deployment guidance.
- **What got worse:** `app/page.tsx` grew modestly and two explicit artifact validators added code. Home first-load JavaScript rose from about 140 kB to 144.9 kB gzip, still 10.1 kB below the enforced ceiling.
- **Coherence check:** the demo still tells one story: predict adherence risk, explain one driver, compare one bounded action, then let safety suppress coaching and hand off.
- **Technical debt introduced:** validation logic is intentionally manual to avoid shipping a large parser; browser checks remain manual; the phrase matcher is a bounded demo parser, not clinical NLP.
- **Work removed from the sprint:** component extraction, stylesheet deletion, token consolidation, transition animation, and a new accessibility dependency are deferred because their pre-demo regression risk exceeds visible value.

## Current Score

| Category | Score / 10 | Current evidence |
|---|---:|---|
| Product clarity | 9.2 | One driver, one bounded action, one independent safety override |
| Demo impact | 9.6 | Graph-first opening, six-step path, reset, and verified 2:54 video plus 10-slide deck |
| UI polish | 9.2 | Responsive operational UI with current repository, social, video, and deck imagery |
| UX flow | 9.2 | Clear start, scenario-aware queue, Custom state, recovery routes, and deterministic reset |
| Technical architecture | 8.6 | Strong safety/ML/graph/provider boundaries; large client orchestrator remains |
| Code quality | 8.1 | Typed, validated, and readable; pure queue composition is tested while page and CSS ownership remain concentrated |
| Reliability | 9.6 | Keyless mode, provider deadline, stale-request guard, scenario consistency, and expanded smoke |
| Testing | 9.4 | 43 tests, live normal/escalation smoke, browser scenario checks, and a passing remote production workflow |
| Error handling | 9.2 | Provider, API, not-found, routed error, and fallback states are explicit |
| Loading/empty states | 8.6 | Generate, directory loading/error/empty, and recovery states are covered |
| Performance | 8.5 | 144.9 kB gzip with a 155 kB CI ceiling |
| Accessibility | 8.5 | Skip navigation, one live region, keyboard graph, and valid directory table semantics |
| Security/privacy | 8.9 | Synthetic-only, no secret logging, validated boundaries, public-key warning |
| AI usefulness | 9.3 | Optional structured wording; local explainable ML and deterministic safety own decisions |
| Documentation | 9.6 | Audit, backlog, demo, deployment, safety, architecture, glossary, and troubleshooting align |
| Deployment readiness | 8.8 | Reproducible gate and remote CI pass; only an optional hosted preview remains |
| Hackathon competitiveness | 9.6 | Distinct, feasible, eMed-aligned, demonstrably safe, and backed by a current fallback walkthrough |
| Portfolio value | 9.6 | Public visual proof, refreshed narrated assets, technical depth, CI, tests, and reproducibility |

**Current overall score: 9.08 / 10.**

### Final Release Checkpoint

- GitHub PR #1 is open as a draft and its remote production workflow passed in 55 seconds without secrets.
- Coaching-to-queue shows 0 reviews; Escalation-to-queue shows 1 review. A pure regression test and production-browser rehearsal cover the transition.
- The fallback video is 2:54 at 1920x1080 with H.264/AAC audio; sampled frames cover all ten slides, average audio is -19.4 dB, and no silence gap exceeds 1.5 seconds.
- The deck preserves all inherited layouts, replaces eleven screenshots, updates 21% risk and 1.87 centrality, passes template fidelity, contains no empty structural placeholders, and was inspected slide by slide.
