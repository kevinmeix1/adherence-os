# Engineering Handoff

Updated: 2026-07-12

## Current State

- Release branch: `codex/clinical-ledger-ui`
- Pull request: https://github.com/kevinmeix1/adherence-os/pull/2
- Public repository: https://github.com/kevinmeix1/adherence-os
- Local demo URL: http://localhost:3001
- Product status: validated public hackathon release candidate on ready-for-review PR #2

## What Changed

- Rebuilt the primary experience as an original **care decision ledger** rather than a generic AI dashboard.
- Put the Decision map first and reorganised its hierarchy around the patient, observed evidence, context signal, model contributor, tested action, and safety owner.
- Removed visible glow, glass, gradient, and decorative depth treatments from the judged path.
- Reworked Check-in, Review drafts, Model record, patient routes, navigation, controls, metrics, and error recovery into the same flat record system.
- Simplified the graph's default path, wrapped labels at word boundaries, and limited node and edge feedback to short one-shot selection animations.
- Preserved the deterministic coaching and safety paths, model abstention, tested-action suppression, and draft-only clinician handoff.
- Replaced broad red-flag negation scope with symptom-scoped denials and added contraction-aware emergency-language coverage.
- Added an eight-item typed current-symptom checklist, including overdose or poisoning, that overrides coaching without depending on free-text interpretation; phrase matching remains a secondary backstop.
- Flattened the Check-in grid so dose, safety, mood, and note fields no longer leave empty placeholder-like cells.
- Added six Chromium contracts for the judged flow, per-patient state round trips, model-claim calibration, keyboard/focus, 390/320px order and overflow, console health, and serious/critical axe findings across four core states.
- Made safety announcements persistent across views, focused the named workspace after client navigation, exposed graph selection semantics, removed duplicate pointer activation, and made the scrollable review table keyboard-accessible.
- Replaced the single selected-patient plan with independent in-memory sessions; Maya's pending review survives a James round trip and Reset clears all three synthetic records.
- Put 999 and NHS 111 destinations in urgent headlines, removed unsupported negative-triage reassurance, and aligned every seven-day trigger note with the implemented rule boundary.
- Made every clinician message explicitly draft-only, pending manual review, with no clinician or service contacted.
- Isolated development output in `.next-dev` from production output in `.next`, with a config contract test and an event-day production-server preflight.
- Applied the marginal feature-bounds gate to every presentation surface: out-of-bounds inputs now withhold patient score, model attribution, bootstrap spread, sensitivity, tested-action ranking, and routed-record risk.
- Renamed that gate to marginal feature bounds, exposed held-out synthetic precision and review burden beside recall, and stated that independent ranges do not detect joint-distribution or semantic drift.
- Preserved graph-first coaching on narrow screens while moving the urgent destination and handoff action ahead of graph exploration in the safety case.
- Separated presenter-only Demo cases from clinical decisions, replaced the trivial opening fixture with a supported 42% Watch state, and exposed a 16-point bounded planning comparison without claiming an intervention effect.
- Rebuilt the patient check-in as a focused question task with a persistent review action, an eight-item urgent-symptom checklist, and optional context notes that do not dominate the first viewport.
- Derived evidence-map risk direction from signed grouped model attribution and made a zero-draft review workspace genuinely empty.
- Clamped every one-feature sensitivity perturbation to the exported marginal support range and made missing or non-finite vectors fail closed into typed abstention violations.
- Added a four-cell model-support by deterministic-safety contract; unsupported clear inputs now terminate at abstention with no ranked action or lower-risk path, while either safety-active state suppresses routes.
- Added an exported recent-adherence-only logistic challenger using the same patient split and validation recall target as the 14-feature model.
- Separated all-row challenger metrics from runtime-gated evidence: 90% coverage, 180 abstentions, and scored-subset precision/recall are visible in the first Model record viewport.
- Bound training and browser inference to `adherence-feature-source-v1`; twelve Python-generated taken/missed raw cases reproduce all 14 TypeScript features, while twenty scoring fixtures still verify the exported kernel.
- Moved all Python/TypeScript parity fixtures into `data/adherence-model-fixtures.json`, removed the nonessential browser sample table, and kept test evidence out of the client bundle.
- Documented the NHS, Carbon, OpenMRS, and eMed references that informed the design. No external screen, CSS, template code, or branded asset was copied.
- The README image, nine walkthrough screenshots, ten-slide deck, and 2:59 captioned video all show the verified production interface.
- Added `pnpm capture:walkthrough` so the README image and all nine desktop/mobile walkthrough states can be regenerated from the production app.
- Updated UI labels, smoke contracts, scenario-state tests, demo scripts, architecture notes, design rationale, audit, and backlog.

## Main Study Files

- `app/page.tsx`: client workspace, scenario state, graph interaction, request invalidation, and view routing.
- `app/product.css`: Decision map, product shell, graph workbench, and routed patient surfaces.
- `app/globals.css`: Check-in, Review drafts, Model record, and shared primitives.
- `app/lib/careEngine.ts`: deterministic coaching, review, urgent routing, and post-provider safety.
- `app/lib/safetyFlags.ts`: typed checklist identifiers, patient labels, and deterministic rule mapping.
- `app/lib/edgeModel.ts`: local prospective inference, attribution, support gate, and bounded rescoring.
- `app/lib/modelFeatures.ts`: versioned patient/check-in source mapping and the 14 shared serving transforms.
- `data/adherence-model.json`: browser runtime artifact, challenger benchmark, and runtime-gate evaluation.
- `data/adherence-model-fixtures.json`: test-only raw-feature and score-parity rows.
- `app/lib/knowledgeGraph.ts`: typed evidence graph and tested-action composition.
- `docs/architecture.md`: whole-system Mermaid diagram, sequence, ownership table, and suggested study order.
- `docs/design-references.md`: visual references, adaptations, and originality boundary.
- `docs/product-walkthrough.md`: nine-step screenshot walkthrough.

## Demo Assets

- `public/adherence-os-live-twin.png`: current 1280x720 README and social image.
- `public/walkthrough/01-live-twin-coaching.png` through `09-mobile-safety-escalation.png`: nine current walkthrough states.
- `outputs/adherence-os-demo.mp4`: 2:59 narrated H.264/AAC walkthrough with embedded English captions.
- `outputs/adherence-os-demo.srt`: sidecar English captions matching the embedded track.
- `outputs/adherence-os-demo.pptx`: current ten-slide care-ledger pitch deck.

## Validation

- `pnpm typecheck`: pass.
- `pnpm test`: pass, 73/73.
- Focused safety/API/dashboard suite: pass, including all eight structured safety flags, overdose and suicide-plan regressions, destination-aware headlines, negative-triage copy, uncertain chest pain, and schema rejection of unknown flags.
- `pnpm check:model`: pass; checked-in synthetic artifact reproduced with ROC-AUC `0.8328` and Brier score `0.0829`.
- `pnpm build`: pass; `/` is 45.6 kB with 151 kB reported first-load JavaScript.
- `pnpm check:bundle`: pass, `151.8 kB gzip / 155.0 kB`, leaving 3.2 kB headroom.
- `APP_URL=http://localhost:3001 pnpm smoke`: pass against the production server, including normal, escalation, uncertain chest-pain, immediate self-safety, and structured-safety API paths.
- `APP_URL=http://127.0.0.1:3001 pnpm test:browser`: pass, 6/6 in Chromium against the current production server.
- Build-isolation rehearsal: a development server on port 3002 remained healthy while `pnpm build` produced `.next`; the resulting production server passed smoke on port 3001 while development was still running.
- Clean-checkout rehearsal: detached commit `91d3632` passed frozen install, typecheck, 60 tests, model reproduction, production build, bundle gate, and live smoke on port 3003. The host Homebrew Python was broken against `libexpat`; isolated Python 3.12 with NumPy 2.3.5 completed the unchanged model check.
- Final code-checkpoint gate: GitHub Actions run [`29201156709`](https://github.com/kevinmeix1/adherence-os/actions/runs/29201156709) passed in 1m44s on commit `9447be9`, including all 73 deterministic tests, raw feature and scoring parity, model reproduction, documentation-link validation, all six Chromium/axe contracts, bundle enforcement, and production smoke.
- Production browser rehearsal: desktop Load coaching case and Load safety case pass with literal rule-state copy and the urgent destination above workflow detail.
- ML presentation browser rehearsal: the safety case withholds graph attribution, Model record contains no patient score/decomposition/spread/sensitivity, and James's unsupported routed record contains no ML percentage.
- Responsive browser rehearsal: pass at 1280 px, 390 px, and 320 px; coaching keeps graph order `0/1`, the safety case switches inspector/graph to `0/1`, urgent action and handoff remain above the graph, and no horizontal overflow appears.
- Structured-safety browser rehearsal: pass at desktop, 390 px, and 320 px; every viewport renders eight named checkboxes, Load coaching clears them, Load safety selects three, and the overdose flag changes the headline to `Call 999 or go to A&E now`.
- Interaction rehearsal: pointer selection opens Nausea burden, keyboard selection opens Meal-timing prompt, the safety case blocks four tested actions, Review drafts shows `In-memory only` and `Not sent`, Resources > Reset demo session restores the coaching fixture, and no browser console errors were recorded.
- Patient-task rehearsal: Review care plan remains in the viewport at 390 px and 320 px, provider fallback completes, and optional notes remain available without dominating the first viewport.
- Deck QA: all ten exported slides reviewed at full size; template fidelity, screenshot decoding, and overflow checks pass.
- Media QA: nine isolated PNG captures and documentation mirrors pass visual/pixel review; the 2:59 H.264/AAC video decodes cleanly, carries 30 embedded English cues matching the sidecar, and sampled coaching, safety, model, and mobile frames are current.
- Video QA: 2:59, 1280x720, 895 frames at 5 fps across the full 179-second video stream, H.264, 48 kHz stereo AAC, embedded `mov_text` captions, exact 30-block sidecar parity, clean full-file decode, ten-state transition sampling, and -1.4 dB peak audio.

## Known Limits

- No hosted preview is configured. The public repository, local build, video, deck, and screenshot walkthrough are the sharing paths.
- Public deployment should remain keyless. Configuring `OPENAI_API_KEY` exposes an unauthenticated cost-bearing demo endpoint.
- All records and model metrics are synthetic. They demonstrate an executable pipeline, not clinical validation.
- The evidence map is authored and explanatory; bounded rescoring is not causal evidence.
- Raw parity spans twelve synthetic fixtures and scoring parity spans twenty synthetic vectors; this proves the implemented cross-runtime contract, not real-world semantic coverage or joint-distribution drift detection.
- `app/page.tsx` remains roughly 2,400 lines, and the two stylesheets exceed 7,600 lines. Decomposition is intentionally deferred until after judging to avoid destabilising the demo.
- Per-patient sessions are intentionally in-memory only; Reset or a full refresh restores the seeded synthetic scenarios.
- Pixel-level visual regression and real assistive-technology testing remain manual; structural browser behavior and bounded axe checks now run in CI.

## Event-Day Commands

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec next start -p 3001
```

In a second terminal:

```bash
APP_URL=http://localhost:3001 pnpm smoke
```

## Recommended Next Step

Keep the local keyless demo ready on port 3001. The next evidence gap is a small task-based patient or care-team comprehension study; do not invent results for the hackathon.
