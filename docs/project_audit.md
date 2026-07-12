# Project Audit

Audit date: 2026-07-12

## 1. Product Summary

Adherence OS is a hackathon MVP for at-home GLP-1 adherence support. It combines a short patient check-in, deterministic clinical guardrails, a browser-side adherence-risk model, explainable graph analytics, bounded what-if support routes, and an asynchronous clinician handoff. The intended users are patients managing a long programme and care teams monitoring many patients between appointments. The immediate audience is the eMed hackathon judging panel.

The product's strongest proposition is the dual-track decision: ML estimates adherence failure risk while an independent safety layer decides whether coaching must stop. The stricter path wins.

## 2. Current Architecture

- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Lucide icons.
- **Primary experience:** one client-rendered workspace in `app/page.tsx` with Decision map, Check-in, Review queue, Model record, Safety, Demo script, and Judge proof views.
- **Routed records:** statically generated `/patients` and `/patients/[patientId]` pages with loading, error, empty, and not-found states.
- **Backend:** `POST /api/care-plan` and `GET /api/health` route handlers.
- **Safety:** deterministic rules in `app/lib/careEngine.ts`, applied before and after optional model generation.
- **ML:** a monotonic logistic model exported to `data/adherence-model.json` and scored in the browser.
- **Graph:** a typed in-memory graph built from the patient, check-in, model score, care plan, and synthetic cohort.
- **AI:** optional OpenAI structured output validated with Zod; a complete deterministic fallback works without a key.
- **Data:** three synthetic patients with eight weekly snapshots each; no database or real patient data.
- **Testing:** Node test runner with a small TypeScript registration shim; 55 tests across safety, API/provider failure handling, data validation, ML, graph analytics, health, patient dashboards, queue consistency, and routed states, plus live normal/escalation smoke.
- **Deployment:** checked-in GitHub Actions production gate, a successful remote PR run, and a keyless-first deployment runbook. No hosted preview is configured.

## 3. Core User Journey

1. Open Decision map on Maya Patel in Coaching mode.
2. Read one decision headline and four concise operating metrics.
3. Inspect the active risk driver, graph path, provenance, and model attribution.
4. Compare bounded support routes and show why one ranks first.
5. Switch to Escalation.
6. Observe that deterministic red flags suppress every simulated intervention and activate a clinician handoff.
7. Open the Review queue and review the structured audit trail.
8. Use Model record only when technical depth is requested.

## 4. Main Strengths

- The opening screen immediately demonstrates the differentiated graph experience.
- The flat care-ledger visual system uses record, task-list, and evidence-table patterns instead of generic AI-dashboard decoration; public references and adaptation decisions are documented.
- Normal and escalation paths are seeded, deterministic, and visually distinct.
- Safety is independent from both the LLM and the adherence model.
- Red-flag matching distinguishes symptom-scoped denial from uncertainty and normalises typographic contractions before deterministic routing.
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

- `app/page.tsx` is approximately 2,400 lines and owns most view state and UI composition.
- `app/globals.css` and `app/product.css` total more than 7,600 lines, with legacy and product-specific rules sharing ownership.
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
- Model record is information-rich and should remain a secondary technical proof rather than the opening workflow.

## 9. Performance Risks

- The home route's first load is approximately 143 kB, which is acceptable for the demo.
- Every primary workspace view ships in one client module even when only the graph is initially visible.
- More than 7,600 lines of CSS increase parse and maintenance cost, though no user-visible performance issue was observed.
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

- Optional LLM output is schema-validated, but the complete displayed plan is recomputed deterministically.
- The provider prompt is clear about diagnosis, medication changes, escalation, and structured output.
- Post-generation safety overrides are deterministic and tested.
- Adversarial phrase coverage now locks direct-denial, uncertain chest-pain, ASCII and typographic self-safety, cross-field, and resolved-history behavior.
- Provider timeout, invalid-output, exception, and unsafe-generation branches are exercised through controlled test doubles.
- Synthetic model metrics are strong but must never be presented as clinical validation.
- Local sensitivity is not a confidence interval; intervention rescoring is not causal evidence.

## 12. Testing Gaps

- Existing tests cover the most important deterministic contracts.
- Missing automated browser coverage for navigation, graph focus modes, menus, mobile overflow, and form loading states.
- Browser interaction checks are manual rather than part of CI.

## 13. Deployment And Demo Risks

- CI passed remotely on PR #2; no hosted preview deployment is configured.
- README setup is portable and the app builds without secrets.
- The local demo requires the presenter to start the server before running smoke checks.
- The optional AI path should not be relied on during judging; deterministic fallback is the safer live-demo mode.
- The checked-in 2:59 captioned video, subtitle track, screenshot walkthrough, and 10-slide deck are current; regenerate them after future material UI changes.
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
| Loading/empty states | 8.0 | Good routed states and Review care plan loading state |
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

### Adversarial Re-Audit

The earlier self-score was too generous. Independent hostile, clinical-safety, ML, UX, and engineering reviews were commissioned on 2026-07-11. They found a leaked model target, 8.2% operating-point recall, free-text safety bypasses, unsupported confidence language, a below-the-fold primary action, and demo tooling mixed into product roles.

- **Now repaired:** the prospective model contract, patient-isolated evaluation, recall-oriented threshold selection, bootstrap spread, support-aware abstention, Python/browser parity, adversarial symptom coverage, and fully deterministic post-provider plan merge.
- **Latest safety repair:** an eight-word negation window could suppress uncertainty such as “not sure why I have chest pain,” while a common self-safety contraction was not matched. Negation is now symptom-scoped, punctuation is normalised, and both failures are regression-tested.

### 2026-07-12 Independent Critique

Five read-only reviews covered judging impact, clinical safety and ML, healthcare UX and accessibility, release engineering, and the three-minute story. The confirmed red-flag bypass was repaired first. Remaining findings are ranked by likely judging harm, blast radius, and implementation risk:

| Rank | Unresolved finding | Judging or demo impact | Change risk | Next evidence |
|---:|---|---|---|---|
| 1 | Emergency routes can retain the generic “Same-day clinical attention needed” headline, and non-urgent copy sometimes overstates negative triage | Safety trust and claim calibration | Low | Destination-aware copy tests and browser check |
| 2 | `next dev` and `next build` share `.next`; a concurrent build can corrupt the active local demo | Event-day reliability | Low | Release preflight plus clean production rehearsal |
| 3 | Some patient-specific numeric model evidence remains visible after support-aware abstention | ML credibility | Medium | Presentation-gate assertions across Decision map, Model record, and patient records |
| 4 | On narrow escalation layouts, the urgent action follows the graph rather than preceding it | Patient safety hierarchy | Low | 390px and 320px escalation screenshots |
| 5 | Demo copy conflates authored context ranking, model contribution, and the highest-ranked tested action | Three-minute clarity | Low | One authoritative run-of-show and label audit |
| 6 | User-impact evidence and a hosted keyless preview remain absent | User impact and remote access | External | Small usability study or existing hosting account |

No new feature is justified ahead of these repairs. CSS decomposition, extra graph modes, and multi-condition expansion remain deferred.
- **Still weak:** automated browser accessibility checks, hosted access, real user or clinician evidence, and concentrated page and stylesheet ownership.
- **Current regression pressure:** home first-load JavaScript is 151.5 kB gzip, leaving only 3.5 kB below the enforced ceiling; `app/page.tsx` and both stylesheets remain concentrated.
- **Evidence boundary:** synthetic ML metrics prove an executable pipeline only. The graph is an authored evidence map, scenarios are score comparisons rather than effects, and no current artifact demonstrates clinical or commercial impact.

## Current Score

| Category | Score / 10 | Current evidence |
|---|---:|---|
| Product clarity | 8.5 | Adherence risk, graph score, safety mode, provider provenance, and handoff delivery state now use distinct language |
| Demo impact | 9.1 | Decision map is the first working surface; mobile remains graph-first; current fallback media follows the same judged path |
| UI polish | 9.0 | Original care-ledger hierarchy, flat records, sparse status colour, stable graph geometry, and restrained one-shot motion |
| UX flow | 8.5 | Edits recompute immediately, stale work is invalidated, active-patient clicks preserve state, and handoff lands on the selected task |
| Technical architecture | 8.4 | Prospective ML, support gate, deterministic safety, and typed artifacts; large client orchestrator remains |
| Code quality | 7.5 | Typed and tested, but page and stylesheet ownership are concentrated |
| Reliability | 9.1 | Keyless fallback, provider deadline, atomic scenario state, deterministic routes, production smoke, and model reproduction |
| Testing | 9.3 | 55 tests plus prospective parity, support abstention, cross-field negation, route semantics, and cadence contracts |
| Error handling | 8.6 | API, provider, route, and model-abstention states are explicit |
| Loading/empty states | 8.2 | Core asynchronous and routed recovery states are covered |
| Performance | 7.0 | 151.5 kB gzip against a 155 kB ceiling leaves narrow headroom |
| Accessibility | 8.4 | Interactive graph semantics, visible focus, semantic clinician table, keyboard nodes, captioned video, and no 320px overflow; automated audit remains |
| Security/privacy | 7.0 | Synthetic-only and keyless-safe; no auth, DPIA, persistence controls, or production governance |
| AI usefulness | 8.6 | Leakage-safe explainable ensemble, bootstrap spread, support abstention, exact attribution, and independent deterministic safety |
| Documentation | 9.4 | Screenshot walkthrough, architecture study guide, design-reference rationale, technical boundaries, demo labels, and fallback media align |
| Deployment readiness | 6.8 | Local production gate passes; no hosted preview or current remote run for this checkpoint |
| Hackathon competitiveness | 8.7 | Strong technical differentiation and commercial demo flow; impact evidence and hosted access remain gaps |
| Portfolio value | 9.1 | Public code, CI, reproducible ML, commercial UI, study guide, screenshot walkthrough, captioned video, and deck |

**Current strict-judge score: 8.6 / 10.**

### Current Checkpoint

- Draft PR #2 publishes the care-ledger redesign from `codex/clinical-ledger-ui`; the public repository and branch assets are available while review is open.
- Local validation passes with 55 tests, reproducible model training, production build, bundle budget, and live smoke.
- Coaching is inside synthetic model support; Escalation is outside support, abstains from numeric ranking, and still routes through deterministic safety.
- The README image, eight-step screenshot walkthrough, 2:59 captioned video, subtitle track, and ten-slide deck match this checkpoint.
