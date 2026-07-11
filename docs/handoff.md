# Engineering Handoff

Updated: 2026-07-11

## Current State

- Release branch: `codex/clinical-ledger-ui`
- Public repository: https://github.com/kevinmeix1/adherence-os
- Local demo URL: http://localhost:3001
- Product status: validated release candidate awaiting branch publication and merge

## What Changed

- Rebuilt the primary experience as an original **care decision ledger** rather than a generic AI dashboard.
- Put the Decision map first and reorganised its hierarchy around the patient, observed evidence, active decision, bounded route, and safety owner.
- Removed visible glow, glass, gradient, and decorative depth treatments from the judged path.
- Reworked Check-in, Review queue, Model record, patient routes, navigation, controls, metrics, and error recovery into the same flat record system.
- Kept graph geometry stable and limited node feedback to a short one-shot selection animation.
- Preserved the deterministic Coaching and Escalation paths, model abstention, route suppression, and draft-only clinician handoff.
- Documented the NHS, Carbon, OpenMRS, and eMed references that informed the design. No external screen, CSS, template code, or branded asset was copied.
- Rebuilt the README image and all eight walkthrough screenshots from the current UI.
- Rebuilt the 10-slide pitch deck and the 2:59 narrated, captioned walkthrough from those verified states.
- Updated UI labels, smoke contracts, route-state tests, demo scripts, architecture notes, design rationale, audit, and backlog.

## Main Study Files

- `app/page.tsx`: client workspace, scenario state, graph interaction, request invalidation, and view routing.
- `app/product.css`: Decision map, product shell, graph workbench, and routed patient surfaces.
- `app/globals.css`: Check-in, Review queue, Model record, and shared primitives.
- `app/lib/careEngine.ts`: deterministic coaching, review, urgent routing, and post-provider safety.
- `app/lib/edgeModel.ts`: local prospective inference, attribution, support gate, and bounded rescoring.
- `app/lib/knowledgeGraph.ts`: typed evidence graph and route composition.
- `docs/architecture.md`: whole-system Mermaid diagram, sequence, ownership table, and suggested study order.
- `docs/design-references.md`: visual references, adaptations, and originality boundary.
- `docs/product-walkthrough.md`: eight-step screenshot walkthrough.

## Demo Assets

- `public/adherence-os-live-twin.jpg`: current 1280x720 README and social image.
- `public/walkthrough/01-live-twin-coaching.jpg` through `08-mobile-live-twin.jpg`: current walkthrough states.
- `outputs/adherence-os-demo.mp4`: 2:59 narrated H.264/AAC walkthrough with embedded English captions.
- `outputs/adherence-os-demo.srt`: sidecar English captions matching the embedded track.
- `outputs/adherence-os-demo.pptx`: current ten-slide care-ledger pitch deck.

## Validation

- `pnpm typecheck`: pass.
- `pnpm test`: pass, 55/55.
- `pnpm check:model`: pass; checked-in synthetic artifact reproduced with ROC-AUC `0.8098` and Brier score `0.1091`.
- `pnpm build`: pass; `/` is 45 kB with 150 kB reported first-load JavaScript.
- `pnpm check:bundle`: pass, `151.1 kB gzip / 155.0 kB`, leaving 3.9 kB headroom.
- `APP_URL=http://localhost:3002 pnpm smoke`: pass against a temporary production server, including normal and escalation API paths.
- Production browser rehearsal: pass for Attribution, risk-driver node, bounded route, Escalation abstention, clinician handoff, Reset, and Check-in.
- Responsive browser rehearsal: pass at 1280 px, 390 px, and 320 px; 320 px document and graph surfaces have no horizontal overflow.
- Deck QA: all ten slides reviewed at full size; overflow check passes.
- Video QA: 2:59, 1280x720, 5 fps static demonstration frames, H.264, 48 kHz stereo AAC, embedded `mov_text` captions, clean full-file decode, and -2.7 dB peak audio.

## Known Limits

- No hosted preview is configured. The public repository, local build, video, deck, and screenshot walkthrough are the sharing paths.
- Public deployment should remain keyless. Configuring `OPENAI_API_KEY` exposes an unauthenticated cost-bearing demo endpoint.
- All records and model metrics are synthetic. They demonstrate an executable pipeline, not clinical validation.
- The evidence graph is authored and explanatory; bounded rescoring is not causal evidence.
- `app/page.tsx` remains roughly 2,400 lines, and the two stylesheets exceed 7,600 lines. Decomposition is intentionally deferred until after judging to avoid destabilising the demo.
- Browser interaction and visual regression are manually rehearsed rather than automated in CI.
- The fallback assets must be regenerated after any material UI or label change.

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

Freeze feature work. Rehearse Coaching, Attribution, Hydration nudge, Escalation, Review handoff draft, Reset, video, and deck from a clean checkout before judging.
