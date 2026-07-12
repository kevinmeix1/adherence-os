# Engineering Handoff

Updated: 2026-07-12

## Current State

- Release branch: `codex/clinical-ledger-ui`
- Pull request: https://github.com/kevinmeix1/adherence-os/pull/2
- Public repository: https://github.com/kevinmeix1/adherence-os
- Local demo URL: http://localhost:3001
- Product status: copy-calibrated release checkpoint on draft PR #2

## What Changed

- Rebuilt the primary experience as an original **care decision ledger** rather than a generic AI dashboard.
- Put the Decision map first and reorganised its hierarchy around the patient, observed evidence, active decision, bounded route, and safety owner.
- Removed visible glow, glass, gradient, and decorative depth treatments from the judged path.
- Reworked Check-in, Review queue, Model record, patient routes, navigation, controls, metrics, and error recovery into the same flat record system.
- Kept graph geometry stable and limited node feedback to a short one-shot selection animation.
- Preserved the deterministic Coaching and Escalation paths, model abstention, route suppression, and draft-only clinician handoff.
- Replaced broad red-flag negation scope with symptom-scoped denials and added contraction-aware emergency-language coverage.
- Put 999 and NHS 111 destinations in urgent headlines, removed unsupported negative-triage reassurance, and aligned every seven-day trigger note with the implemented rule boundary.
- Made every clinician message explicitly draft-only, pending manual review, with no clinician or service contacted.
- Documented the NHS, Carbon, OpenMRS, and eMed references that informed the design. No external screen, CSS, template code, or branded asset was copied.
- The README image, eight walkthrough screenshots, deck, and video currently show the preceding UI checkpoint; one final refresh is queued after the remaining bounded UI repairs.
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
- `pnpm test`: pass, 58/58.
- Focused care-engine safety suite: pass, 20/20, including destination-aware headlines, negative-triage copy, exact support-plan triggers, uncertain chest pain, and mixed Unicode/negation regressions.
- `pnpm check:model`: pass; checked-in synthetic artifact reproduced with ROC-AUC `0.8098` and Brier score `0.1091`.
- `pnpm build`: pass; `/` is 45.4 kB with 151 kB reported first-load JavaScript.
- `pnpm check:bundle`: pass, `151.5 kB gzip / 155.0 kB`, leaving 3.5 kB headroom.
- `APP_URL=http://localhost:3001 pnpm smoke`: pass against a temporary production server, including normal, escalation, uncertain chest-pain, and immediate self-safety API paths.
- Production browser rehearsal: desktop Coaching and Escalation pass with literal rule-state copy and the urgent destination above workflow detail. Narrow Escalation confirms the separately tracked inspector-order issue.
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
- The fallback assets are queued for regeneration after the remaining build, unsupported-evidence, and narrow-layout repairs.

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

Implement the event-day build preflight (P1-22), then finish unsupported-evidence gating and narrow-screen urgent-action order before the final asset refresh and clean-checkout rehearsal.
