# Project Audit

Audit date: 2026-07-12

## 1. Product Summary

Adherence OS is a hackathon MVP for at-home GLP-1 adherence support. It combines a short patient check-in, deterministic clinical guardrails, a browser-side adherence-risk model, explainable graph analytics, bounded tested actions, and a pending clinician-review draft. The intended users are patients managing a long programme and care teams prioritising review between appointments. The immediate audience is the eMed hackathon judging panel.

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
- **Testing:** 63 Node contract tests plus four production-browser contracts for the judged interaction path, keyboard/focus, responsive order and overflow, console health, and bounded axe scans; live API smoke remains separate.
- **Deployment:** checked-in GitHub Actions production gate, a successful remote PR run, and a keyless-first deployment runbook. No hosted preview is configured.

## 3. Core User Journey

1. Open Decision map on Maya Patel in Coaching mode.
2. Read one decision headline and four concise operating metrics.
3. Distinguish the highest-ranked context signal from the largest model contributor and inspect provenance.
4. Compare bounded tested actions and show why one ranks first.
5. Switch to Escalation.
6. Observe that deterministic red flags suppress every tested action, show the urgent destination, and prepare a clinician-review draft.
7. Open the Review queue and review the structured audit trail.
8. Use Model record only when technical depth is requested.

## 4. Main Strengths

- The opening screen immediately demonstrates the differentiated graph experience.
- The flat care-ledger visual system uses record, task-list, and evidence-table patterns instead of generic AI-dashboard decoration; public references and adaptation decisions are documented.
- Normal and escalation paths are seeded, deterministic, and visually distinct.
- Safety is independent from both the LLM and the adherence model.
- Red-flag matching distinguishes symptom-scoped denial from uncertainty and normalises typographic contractions before deterministic routing.
- Destination-aware urgent headlines place 999 or NHS 111 before workflow detail, while non-urgent copy reports rule state without claiming negative triage.
- The app remains complete without a network connection or API key.
- Structured AI output and request data are validated with Zod.
- Model explainability is unusually strong for a hackathon: exact log-odds reconstruction, local sensitivity, calibration, and provenance.
- The training-support gate now withholds every patient-specific ML number across the Decision map, Model record, and routed records before extrapolation.
- Tested actions are explicitly described as planning comparisons rather than causal treatment effects.
- Mobile layouts at 390px and 320px are protected by a production-browser order and overflow contract.
- Narrow layouts preserve graph-first Coaching but move the urgent destination and handoff action ahead of graph exploration in Escalation.
- Patient directory routes include realistic loading, error, empty, and not-found states.
- Public documentation includes architecture, safety boundaries, model details, demo assets, and design references.
- Patient and model artifacts fail early through typed runtime validation, and the synthetic model has a non-destructive reproduction check.
- A single Reset command restores the rehearsed opening state after any demo path.
- Coaching and Escalation now drive the clinician queue consistently: zero reviews becomes one review only when the safety path is active.
- Check-ins, care plans, provider state, and notices are stored independently by synthetic patient identifier; selecting another record no longer erases a pending review.
- One persistent live region announces safety changes in every workspace; client-view navigation focuses the named destination workspace.
- Graph nodes expose selected state and inspector ownership without duplicate pointer activation; the scrollable review table is keyboard-focusable.
- CI hydrates and clicks the judged path in Chromium and rejects serious or critical axe findings on four core states.
- The remote production workflow and current video/deck fallback assets have been verified against the final UI.

## 5. Main Weaknesses

- `app/page.tsx` is approximately 2,400 lines and owns most view state and UI composition.
- `app/globals.css` and `app/product.css` total more than 7,600 lines, with legacy and product-specific rules sharing ownership.
- No hosted preview URL is configured; the public repository, local production build, and fallback assets are the current sharing paths.
- The main workspace views are state-based rather than URL-addressable, so a refresh returns to the opening graph and restores all seeded in-memory sessions.
- There is no cross-platform pixel-diff visual regression test; behavior and responsive structure are automated instead.
- Runtime data validators add a small amount of client code because the graph workspace consumes static artifacts directly.

## 6. Bugs Or Risks

No current P0 functional bug was reproduced during this audit. The following risks remain:

- A public deployment with `OPENAI_API_KEY` configured would expose an unauthenticated cost-bearing endpoint. This is acceptable only for a bounded hackathon demo.
- Smoke testing requires the user or CI job to start the server first.
- Development uses `.next-dev`, so a same-worktree production build no longer overwrites its active output. Production build and start still share `.next`, so the runbook requires stopping a production server before rebuilding.
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

- The home route measures 153.0 kB gzip, which leaves only 2.0 kB inside the enforced 155 kB budget.
- Every primary workspace view ships in one client module even when only the graph is initially visible.
- More than 7,600 lines of CSS increase parse and maintenance cost, though no user-visible performance issue was observed.
- Graph calculations are small for 13 nodes and three synthetic patients; they do not currently justify worker or server infrastructure.
- Demo video, deck, and screenshot assets add about 7 MB to the repository but are not loaded by the application.

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
- Local sensitivity is not a confidence interval; tested-action rescoring is not causal evidence.

## 12. Testing Gaps

- Node and browser tests cover the most important deterministic and judged interaction contracts.
- Pixel-level visual regression, overflow-menu behavior, provider loading timing under CPU throttling, and real assistive-technology testing remain manual.
- Automated axe checks detect only a subset of accessibility failures and do not replace inclusive user testing.

## 13. Deployment And Demo Risks

- CI passed remotely on PR #2; no hosted preview deployment is configured.
- README setup is portable and the app builds without secrets.
- The local demo requires the presenter to start the server before running smoke checks.
- The optional AI path should not be relied on during judging; deterministic fallback is the safer live-demo mode.
- The checked-in 2:59 captioned video, subtitle track, nine-step screenshot walkthrough, and ten-slide deck show the verified production checkpoint.
- The presenter should keep a production build running locally and avoid dependency installation on event Wi-Fi.

## 14. Highest-Impact Improvement Areas

1. Rename and reframe the clinician workspace so it does not imply a transported or autonomously prioritised inbox.
2. Gather real patient/clinician comprehension evidence.
3. Add a keyless hosted preview only when an existing account makes external access low risk.
4. Defer component and stylesheet decomposition until after judging.

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
| Product clarity | 9.2 | Context signal, model contributor, tested action, abstention, and safety override use one judged-path vocabulary |
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

- **Now repaired:** the prospective model contract, patient-isolated evaluation, recall-oriented threshold selection, bootstrap spread, marginal-bound abstention, Python/browser parity, adversarial symptom coverage, and fully deterministic post-provider plan merge.
- **Latest safety repair:** an eight-word negation window could suppress uncertainty such as “not sure why I have chest pain,” while a common self-safety contraction was not matched. Negation is now symptom-scoped, punctuation is normalised, and both failures are regression-tested.

### 2026-07-12 Independent Critique

Five read-only reviews covered judging impact, clinical safety and ML, healthcare UX and accessibility, release engineering, and the three-minute story. The confirmed red-flag bypass was repaired first. Findings are tracked by likely judging harm, blast radius, and implementation risk:

| Rank | Status | Finding | Judging or demo impact | Change risk | Next evidence |
|---:|---|---|---|---|---|
| 1 | Repaired | Emergency routes retained a generic same-day headline, and non-urgent copy overstated negative triage. Destination-aware headlines, literal non-match wording, exact support-plan triggers, and a Unicode follow-on regression now pass focused tests, smoke, and desktop browser review. | Safety trust and claim calibration | Low | Preserve in regression suite |
| 2 | Repaired | Development now writes `.next-dev`; production continues to use `.next`. A live development server stayed healthy through a clean build and concurrent production smoke. | Event-day reliability | Low | Preserve config test and runbook preflight |
| 3 | Repaired | The support gate now withholds patient score, model attribution, bootstrap spread, sensitivity, and numeric tested-action ranking in the Decision map, Model record, and routed records. | ML credibility | Medium | Preserve core, graph, tested-action, smoke, and browser checks |
| 4 | Repaired | Coaching remains graph-first, while narrow Escalation orders the inspector first; the NHS 111 action and handoff button precede graph exploration at 390px and 320px with no overflow. | Patient safety hierarchy | Low | Preserve responsive browser rehearsal |
| 5 | Repaired | Visible copy and the run-of-show now distinguish the context signal, model contributor, and tested action throughout the judged path. | Three-minute clarity | Low | Preserve the label audit and timed rehearsal |
| 6 | External | User-impact evidence and a hosted keyless preview remain absent | User impact and remote access | External | Small usability study or existing hosting account |

No new feature is justified ahead of these repairs. CSS decomposition, extra graph modes, and multi-condition expansion remain deferred.

### Final Specialist Pass

Three additional read-only reviews ranked the remaining gaps by judging harm and implementation risk:

| Rank | Status | Finding | Smallest credible response |
|---:|---|---|---|
| 1 | Repaired | Open-ended text could miss clinically equivalent urgent wording and continue coaching. | Added seven typed current-symptom flags that independently stop coaching, plus adversarial phrase regressions for chest discomfort, inability to catch breath, and not wanting to be alive. |
| 2 | Repaired | CI could pass without hydrating or clicking the product, and no automated accessibility scan protected the judged path. | Six Chromium contracts now cover the judged flow, patient-state round trips, model-claim calibration, keyboard/focus, narrow layouts, console health, and serious/critical axe findings. |
| 3 | Repaired | Switching the selected patient reconstructed non-selected rows from normal seed data rather than preserving per-patient session state. | Each patient now owns an independent local session; a unit test and fifth production-browser contract preserve Maya's review through a James round trip and verify global Reset. |
| 4 | Repaired | Synthetic model performance could be mistaken for clinical evidence, and independent feature bounds were labelled as general training support. | The Model record now puts 79.6% recall beside 31.6% precision and 41.8% rows flagged, calls the gate marginal feature bounds, and states that joint-distribution and semantic drift are not detected. |
| 5 | External | No patient or clinician has validated comprehension, usefulness, or workflow savings. | Run a small task-based study and publish anonymised evidence without inventing outcomes. |

- **Still weak:** hosted access, real user or clinician evidence, manual assistive-technology evidence, pixel-level visual regression, and concentrated page and stylesheet ownership.
- **Current regression pressure:** home first-load JavaScript is 153.0 kB gzip, leaving only 2.0 kB below the enforced ceiling; `app/page.tsx` and both stylesheets remain concentrated.
- **Evidence boundary:** synthetic ML metrics prove an executable pipeline only. The graph is an authored evidence map, scenarios are score comparisons rather than effects, and no current artifact demonstrates clinical or commercial impact.

## Current Score

| Category | Score / 10 | Current evidence |
|---|---:|---|
| Product clarity | 9.2 | Context signal, model contributor, tested action, abstention, safety mode, and handoff delivery state use distinct language |
| Demo impact | 9.1 | Decision map is the first working surface; mobile remains graph-first; current fallback media follows the same judged path |
| UI polish | 9.0 | Original care-ledger hierarchy, flat records, sparse status colour, stable graph geometry, and restrained one-shot motion |
| UX flow | 8.5 | Edits recompute immediately, stale work is invalidated, active-patient clicks preserve state, and handoff lands on the selected task |
| Technical architecture | 8.4 | Prospective ML, support gate, deterministic safety, and typed artifacts; large client orchestrator remains |
| Code quality | 7.5 | Typed and tested, but page and stylesheet ownership are concentrated |
| Reliability | 9.1 | Keyless fallback, provider deadline, atomic scenario state, deterministic routes, production smoke, and model reproduction |
| Testing | 9.7 | 63 deterministic tests plus six Chromium contracts for judged behavior, patient-state round trips, model-claim calibration, keyboard/focus, responsive layout, console health, and bounded axe scans |
| Error handling | 8.6 | API, provider, route, and model-abstention states are explicit |
| Loading/empty states | 8.2 | Core asynchronous and routed recovery states are covered |
| Performance | 7.0 | 153.0 kB gzip against a 155 kB ceiling leaves narrow headroom |
| Accessibility | 8.9 | Persistent announcements, focus-managed views, selected graph semantics, focusable scroll regions, visible focus, captioned video, and bounded axe scans; manual assistive-tech testing remains |
| Security/privacy | 7.0 | Synthetic-only and keyless-safe; no auth, DPIA, persistence controls, or production governance |
| AI usefulness | 8.8 | Leakage-safe explainable ensemble, supported-only spread and attribution, complete presentation abstention, and independent deterministic safety |
| Documentation | 9.4 | Screenshot walkthrough, architecture study guide, design-reference rationale, technical boundaries, demo labels, and fallback media align |
| Deployment readiness | 7.5 | Local, clean-checkout, and remote production gates pass; no hosted preview is configured |
| Hackathon competitiveness | 8.7 | Strong technical differentiation and commercial demo flow; impact evidence and hosted access remain gaps |
| Portfolio value | 9.1 | Public code, CI, reproducible ML, commercial UI, study guide, screenshot walkthrough, captioned video, and deck |

**Current strict-judge score: 8.6 / 10.**

### Current Checkpoint

- Draft PR #2 publishes the care-ledger redesign from `codex/clinical-ledger-ui`; the public repository and branch assets are available while review is open.
- The current local checkpoint passes typecheck, 63 tests, model reproduction, production build, bundle budget, live smoke, and structured-safety interaction checks at 1440 px, 390 px, and 320 px.
- Detached commit `91d3632` also passes a frozen clean-checkout install, the full local gate, and live smoke from a separate worktree.
- GitHub Actions run `29187107480` passes the remote production gate for commit `8e27671`, including Chromium installation, all four browser/accessibility contracts, and production smoke.
- Coaching passes every configured marginal feature bound. Escalation exceeds at least one bound, withholds all patient-specific ML evidence, and still routes through deterministic safety.
- The README image, nine-step screenshot walkthrough, video, subtitle track, and deck are verified fallback assets for the current production checkpoint.
