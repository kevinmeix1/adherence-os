# Engineering Handoff

Updated: 2026-07-11

## Current State

- Branch: `codex/harden-demo-reliability`
- Release pull request: https://github.com/kevinmeix1/adherence-os/pull/1
- Default local production URL after start: http://localhost:3000
- Product status: public release candidate; local and remote production gates pass

## Completed

- Locked the deterministic Coaching and Escalation paths with safety boundary, red-flag language, provider-failure, model, graph, route-state, and data-validation tests.
- Added a Node 22 / pnpm 11 GitHub Actions production gate with frozen install, typecheck, tests, model check, build, bundle budget, production startup, and live smoke.
- Verified the first remote workflow on PR #1 without secrets.
- Added runtime validation for synthetic patient data and the exported model artifact.
- Added safe provider timing metadata, an eight-second provider deadline, visible keyless fallback, and stale-request cancellation on Reset.
- Added graph-first demo reset, model provenance, Custom check-in state, route recovery, mobile/table semantics, social metadata, and current public documentation.
- Fixed the clinician queue so Coaching shows 0 reviews and Escalation shows 1 review for the selected patient.
- Refreshed the narrated and captioned 2:59 MP4, subtitle track, and 10-slide PPTX from the current production UI.
- Replaced the leaked contemporaneous model target with a prospective week-`t` to week-`t + 1` contract and patient-isolated 70/15/15 splits.
- Added a 16-member patient-bootstrap ensemble, training-support bounds, browser abstention, held-out AUPRC/Brier skill, a validation-selected recall operating point, and 20 Python/TypeScript parity fixtures.
- Made the post-provider merge fully deterministic and added adversarial paraphrase, negation, dose-change, and diagnosis tests.

## Final Checkpoint Files

- `app/lib/patientDashboard.ts`: pure scenario-aware clinician queue composition.
- `app/page.tsx`: consumes the live selected care plan in the queue.
- `tests/patientDashboard.test.cjs`: regression coverage for 0-to-1 review transition.
- `outputs/adherence-os-demo.mp4`: current 1280x720 H.264/AAC narrated walkthrough with embedded English captions.
- `outputs/adherence-os-demo.srt`: sidecar English subtitle track.
- `outputs/adherence-os-demo.pptx`: current ten-slide pitch deck.
- `README.md`: identifies the current fallback asset formats and durations.
- `docs/improvement_backlog.md`: P1 completion and queue consistency recorded.
- `docs/project_audit.md`: adversarial evidence and strict current score.
- `docs/handoff.md`: this handoff.

## Validation

- `pnpm install --frozen-lockfile`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass, 55/55
- `pnpm check:model`: pass, ROC-AUC 0.8098, AUPRC 0.5008, Brier skill 0.2122, and 79.6% held-out recall on synthetic data
- `pnpm build`: pass
- `pnpm check:bundle`: pass, 151.2 kB gzip / 155.0 kB
- `APP_URL=http://localhost:3002 pnpm smoke`: pass against a temporary production server
- Production browser rehearsal: Coaching, Escalation abstention, selected handoff draft, active-patient state preservation, custom chest-pain escalation, and graph-node animation pass
- Responsive browser rehearsal: 390x844 and 320x700 have no horizontal overflow; the graph remains the first analytical surface
- GitHub Actions release-candidate run: pass in 61 seconds without secrets
- Deck template fidelity: pass with zero issues; no empty slide placeholders
- Deck QA: all ten slides reviewed at full size; overflow and template-fidelity checks pass with zero issues
- Video probe: 2:59, 1280x720 at 30 fps, H.264, 48 kHz stereo AAC, embedded English `mov_text` captions, and clean full-file decode

The presentation helper's `slides_test.py`, artifact-tool rendering, template-fidelity check, slide-XML placeholder inspection, and full-size review of every slide all pass.

## Known Limits

- No hosted preview URL is configured. The public repository, local production build, video, and deck are ready.
- A public deployment should remain keyless. Configuring `OPENAI_API_KEY` exposes an unauthenticated cost-bearing demo endpoint.
- Browser interaction and visual regression checks are manual; the critical logic and live endpoints are automated.
- `app/page.tsx` and the stylesheets remain large. Decomposition is deliberately deferred until after judging.
- The checked-in MP4, subtitles, deck, README screenshot, and eight-step walkthrough match this checkpoint; regenerate them after future material UI changes.
- Unknown dynamic patient IDs use Next.js streamed noindex recovery and may return HTTP 200 rather than a hard 404.
- Synthetic model metrics show implementation quality, not clinical validation. Graph links and what-if deltas are explanatory planning tools, not causal evidence.

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

## Remaining Work

1. Rehearse the event-day production start, normal path, escalation path, reset, and fallback assets from a clean checkout.
2. Add a keyless hosted preview only if an existing deployment account makes it a low-risk operation.
3. Add automated browser accessibility and visual regression checks after judging.
4. Decompose the large page and stylesheet modules after the judged demo is frozen.

## Recommended Next Prompt

Run the event-day production rehearsal from a clean checkout, then freeze the judged-demo branch.
