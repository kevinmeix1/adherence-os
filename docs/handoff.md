# Engineering Handoff

Updated: 2026-07-11

## Current State

- Branch: `codex/harden-demo-reliability`
- Draft pull request: https://github.com/kevinmeix1/adherence-os/pull/1
- Local production app: http://localhost:3001
- Product status: P0 and P1 backlog items complete
- Audit score: 9.08 / 10

## Completed

- Locked the deterministic Coaching and Escalation paths with safety boundary, red-flag language, provider-failure, model, graph, route-state, and data-validation tests.
- Added a Node 22 / pnpm 11 GitHub Actions production gate with frozen install, typecheck, tests, model check, build, bundle budget, production startup, and live smoke.
- Verified the first remote workflow on PR #1 without secrets.
- Added runtime validation for synthetic patient data and the exported model artifact.
- Added safe provider timing metadata, an eight-second provider deadline, visible keyless fallback, and stale-request cancellation on Reset.
- Added graph-first demo reset, model provenance, Custom check-in state, route recovery, mobile/table semantics, social metadata, and current public documentation.
- Fixed the clinician queue so Coaching shows 0 reviews and Escalation shows 1 review for the selected patient.
- Refreshed the narrated 2:54 MP4 and 10-slide PPTX from the current production UI.

## Final Checkpoint Files

- `app/lib/patientDashboard.ts`: pure scenario-aware clinician queue composition.
- `app/page.tsx`: consumes the live selected care plan in the queue.
- `tests/patientDashboard.test.cjs`: regression coverage for 0-to-1 review transition.
- `outputs/adherence-os-demo.mp4`: current 1920x1080 H.264/AAC narrated walkthrough.
- `outputs/adherence-os-demo.pptx`: current ten-slide pitch deck.
- `README.md`: identifies the current fallback asset formats and durations.
- `docs/improvement_backlog.md`: P1 completion and queue consistency recorded.
- `docs/project_audit.md`: final evidence and 9.08 score.
- `docs/handoff.md`: this handoff.

## Validation

- `pnpm install --frozen-lockfile`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass, 43/43
- `pnpm check:model`: pass, AUC 0.9445 and Brier 0.0158 on synthetic data
- `pnpm build`: pass
- `pnpm check:bundle`: pass, 144.9 kB gzip / 155.0 kB
- `APP_URL=http://localhost:3001 pnpm smoke`: pass
- Production browser rehearsal: Coaching queue 0, Escalation queue 1, Reset returns to opening state
- GitHub Actions PR run: pass in 55 seconds
- Deck template fidelity: pass with zero issues; no empty slide placeholders
- Video probe: 2:54, 1920x1080, H.264/AAC, -19.4 dB average audio, no silence gap over 1.5 seconds

The presentation helper's optional Python `slides_test.py` could not run because the host Python lacks `pdf2image` and LibreOffice/Poppler. Artifact-tool rendering and fidelity checks, a custom bounds/auto-fit check, slide-XML placeholder inspection, and full-size review of every slide all passed instead.

## Known Limits

- No hosted preview URL is configured. The public repository, local production build, video, and deck are ready.
- A public deployment should remain keyless. Configuring `OPENAI_API_KEY` exposes an unauthenticated cost-bearing demo endpoint.
- Browser interaction and visual regression checks are manual; the critical logic and live endpoints are automated.
- `app/page.tsx` and the stylesheets remain large. Decomposition is deliberately deferred until after judging.
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

1. Freeze feature development and rehearse `docs/demo_script.md` from a clean Reset.
2. Confirm the MP4 and PPTX open locally before leaving for the event.
3. Add a keyless hosted preview only if an existing deployment account makes it a low-risk operation.
4. After judging, split the primary workspace, graph, Model lab, and styles into smaller modules and add automated browser accessibility/visual checks.

## Recommended Next Prompt

Run one final event-day rehearsal against the production build, time the normal and escalation scripts, verify the video and deck open, and report only blockers that could affect the judged demo.
