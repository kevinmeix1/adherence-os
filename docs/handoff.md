# Engineering Handoff

Updated: 2026-07-12

## Current State

- Release branch: `codex/clinical-ledger-ui`
- Pull request: https://github.com/kevinmeix1/adherence-os/pull/2
- Public repository: https://github.com/kevinmeix1/adherence-os
- Local demo URL: http://localhost:3001
- Product status: release-complete visual, documentation, and fallback-asset checkpoint on draft PR #2

## What Changed

- Rebuilt the primary experience as an original **care decision ledger** rather than a generic AI dashboard.
- Put the Decision map first and reorganised its hierarchy around the patient, observed evidence, context signal, model contributor, tested action, and safety owner.
- Removed visible glow, glass, gradient, and decorative depth treatments from the judged path.
- Reworked Check-in, Review queue, Model record, patient routes, navigation, controls, metrics, and error recovery into the same flat record system.
- Simplified the graph's default path, wrapped labels at word boundaries, and limited node and edge feedback to short one-shot selection animations.
- Preserved the deterministic Coaching and Escalation paths, model abstention, tested-action suppression, and draft-only clinician handoff.
- Replaced broad red-flag negation scope with symptom-scoped denials and added contraction-aware emergency-language coverage.
- Added a seven-item typed current-symptom checklist that overrides coaching without depending on free-text interpretation; phrase matching remains a secondary backstop.
- Flattened the Check-in grid so dose, safety, mood, and note fields no longer leave empty placeholder-like cells.
- Added four Chromium contracts for the judged flow, keyboard/focus, 390/320px order and overflow, console health, and serious/critical axe findings across four core states.
- Made safety announcements persistent across views, focused the named workspace after client navigation, exposed graph selection semantics, removed duplicate pointer activation, and made the scrollable review table keyboard-accessible.
- Put 999 and NHS 111 destinations in urgent headlines, removed unsupported negative-triage reassurance, and aligned every seven-day trigger note with the implemented rule boundary.
- Made every clinician message explicitly draft-only, pending manual review, with no clinician or service contacted.
- Isolated development output in `.next-dev` from production output in `.next`, with a config contract test and an event-day production-server preflight.
- Applied the support gate to every presentation surface: unsupported inputs now withhold patient score, model attribution, bootstrap spread, sensitivity, tested-action ranking, and routed-record risk.
- Preserved graph-first Coaching on narrow screens while moving the urgent destination and handoff action ahead of graph exploration in Escalation.
- Documented the NHS, Carbon, OpenMRS, and eMed references that informed the design. No external screen, CSS, template code, or branded asset was copied.
- The README image, nine walkthrough screenshots, ten-slide deck, and 2:59 captioned video all show the verified production interface.
- Updated UI labels, smoke contracts, scenario-state tests, demo scripts, architecture notes, design rationale, audit, and backlog.

## Main Study Files

- `app/page.tsx`: client workspace, scenario state, graph interaction, request invalidation, and view routing.
- `app/product.css`: Decision map, product shell, graph workbench, and routed patient surfaces.
- `app/globals.css`: Check-in, Review queue, Model record, and shared primitives.
- `app/lib/careEngine.ts`: deterministic coaching, review, urgent routing, and post-provider safety.
- `app/lib/safetyFlags.ts`: typed checklist identifiers, patient labels, and deterministic rule mapping.
- `app/lib/edgeModel.ts`: local prospective inference, attribution, support gate, and bounded rescoring.
- `app/lib/knowledgeGraph.ts`: typed evidence graph and tested-action composition.
- `docs/architecture.md`: whole-system Mermaid diagram, sequence, ownership table, and suggested study order.
- `docs/design-references.md`: visual references, adaptations, and originality boundary.
- `docs/product-walkthrough.md`: nine-step screenshot walkthrough.

## Demo Assets

- `public/adherence-os-live-twin.jpg`: current 1280x720 README and social image.
- `public/walkthrough/01-live-twin-coaching.jpg` through `09-mobile-safety-escalation.jpg`: nine current walkthrough states.
- `outputs/adherence-os-demo.mp4`: 2:59 narrated H.264/AAC walkthrough with embedded English captions.
- `outputs/adherence-os-demo.srt`: sidecar English captions matching the embedded track.
- `outputs/adherence-os-demo.pptx`: current ten-slide care-ledger pitch deck.

## Validation

- `pnpm typecheck`: pass.
- `pnpm test`: pass, 63/63.
- Focused safety/API/dashboard suite: pass, 29/29, including all seven structured safety flags, destination-aware headlines, negative-triage copy, uncertain chest pain, three new paraphrase regressions, and schema rejection of unknown flags.
- `pnpm check:model`: pass; checked-in synthetic artifact reproduced with ROC-AUC `0.8098` and Brier score `0.1091`.
- `pnpm build`: pass; `/` is 46.3 kB with 152 kB reported first-load JavaScript.
- `pnpm check:bundle`: pass, `152.7 kB gzip / 155.0 kB`, leaving 2.3 kB headroom.
- `APP_URL=http://localhost:3001 pnpm smoke`: pass against the production server, including normal, escalation, uncertain chest-pain, immediate self-safety, and structured-safety API paths.
- `pnpm test:browser`: pass, 4/4 in Chromium; the command started and stopped the built production app on port 3100 without a pre-existing server.
- Build-isolation rehearsal: a development server on port 3002 remained healthy while `pnpm build` produced `.next`; the resulting production server passed smoke on port 3001 while development was still running.
- Clean-checkout rehearsal: detached commit `91d3632` passed frozen install, typecheck, 60 tests, model reproduction, production build, bundle gate, and live smoke on port 3003. The host Homebrew Python was broken against `libexpat`; isolated Python 3.12 with NumPy 2.3.5 completed the unchanged model check.
- Remote production gate: GitHub Actions run `29187107480` passed in 1m32s on commit `8e27671`, including the four Chromium/axe contracts and production smoke.
- Production browser rehearsal: desktop Coaching and Escalation pass with literal rule-state copy and the urgent destination above workflow detail.
- ML presentation browser rehearsal: Escalation graph attribution is withheld, Model record contains no patient score/decomposition/spread/sensitivity, and James's unsupported routed record contains no ML percentage.
- Responsive browser rehearsal: pass at 1280 px, 390 px, and 320 px; Coaching keeps graph order `0/1`, Escalation switches inspector/graph to `0/1`, urgent action and handoff remain above the graph, and no horizontal overflow appears.
- Structured-safety browser rehearsal: pass at 1440 px, 390 px, and 320 px; every viewport renders seven named checkboxes, Normal clears them, Escalation selects three, the direct chest/breathing flag changes the headline to `Call 999 now`, and no console errors or horizontal overflow appear.
- Interaction rehearsal: pointer selection opens Routine disruption, keyboard selection opens Hydration nudge, Escalation blocks four tested actions, Review queue shows `Draft only / not sent`, Reset restores Coaching, and no browser console errors were recorded.
- Deck QA: all ten slides reviewed at full size; screenshot decoding and overflow checks pass.
- Video QA: 2:59, 1280x720, 895 frames at 5 fps, H.264, 48 kHz stereo AAC, embedded `mov_text` captions, exact 30-block sidecar parity, clean full-file decode, and -2.6 dB peak audio.

## Known Limits

- No hosted preview is configured. The public repository, local build, video, deck, and screenshot walkthrough are the sharing paths.
- Public deployment should remain keyless. Configuring `OPENAI_API_KEY` exposes an unauthenticated cost-bearing demo endpoint.
- All records and model metrics are synthetic. They demonstrate an executable pipeline, not clinical validation.
- The evidence map is authored and explanatory; bounded rescoring is not causal evidence.
- `app/page.tsx` remains roughly 2,400 lines, and the two stylesheets exceed 7,600 lines. Decomposition is intentionally deferred until after judging to avoid destabilising the demo.
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

Run the clean-checkout rehearsal, confirm the remote production gate, and keep the local keyless demo ready on port 3001.
