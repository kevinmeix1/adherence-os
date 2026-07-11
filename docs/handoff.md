# Engineering Handoff

Updated: 2026-07-11

## Current State

- Branch: `codex/harden-demo-reliability`
- Draft pull request: https://github.com/kevinmeix1/adherence-os/pull/1
- Local production app: http://localhost:3001
- Product status: active adversarial refinement; ML and generated-text safety foundations hardened

## Completed

- Locked the deterministic Coaching and Escalation paths with safety boundary, red-flag language, provider-failure, model, graph, route-state, and data-validation tests.
- Added a Node 22 / pnpm 11 GitHub Actions production gate with frozen install, typecheck, tests, model check, build, bundle budget, production startup, and live smoke.
- Verified the first remote workflow on PR #1 without secrets.
- Added runtime validation for synthetic patient data and the exported model artifact.
- Added safe provider timing metadata, an eight-second provider deadline, visible keyless fallback, and stale-request cancellation on Reset.
- Added graph-first demo reset, model provenance, Custom check-in state, route recovery, mobile/table semantics, social metadata, and current public documentation.
- Fixed the clinician queue so Coaching shows 0 reviews and Escalation shows 1 review for the selected patient.
- Refreshed the narrated 2:54 MP4 and 10-slide PPTX from the current production UI.
- Replaced the leaked contemporaneous model target with a prospective week-`t` to week-`t + 1` contract and patient-isolated 70/15/15 splits.
- Added a 16-member patient-bootstrap ensemble, training-support bounds, browser abstention, held-out AUPRC/Brier skill, a validation-selected recall operating point, and 20 Python/TypeScript parity fixtures.
- Made the post-provider merge fully deterministic and added adversarial paraphrase, negation, dose-change, and diagnosis tests.

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
- `pnpm test`: pass, 49/49
- `pnpm check:model`: pass, ROC-AUC 0.8098, AUPRC 0.5008, Brier skill 0.2122, and 79.6% held-out recall on synthetic data
- `pnpm build`: pass
- `pnpm check:bundle`: pass, 150.1 kB gzip / 155.0 kB
- `APP_URL=http://localhost:3002 pnpm smoke`: pass against a temporary production server
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
- The checked-in MP4, deck, README screenshot, and prior remote CI result predate the prospective-model/support-gate checkpoint and must be refreshed after the next UI freeze.
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

1. Remove remaining unsupported confidence, agency, graph-analytics, and delivered-handoff claims from product copy.
2. Make the first viewport decision-first and land handoff navigation on the selected review task.
3. Re-run the full production gate, refresh screenshot/video/deck, and verify the new GitHub Actions run.
4. Add a keyless hosted preview only if an existing deployment account makes it a low-risk operation.

## Recommended Next Prompt

Continue the strict-judge pass: fix commercial trust copy and first-viewport hierarchy, then rehearse the normal and escalation paths against a production build.
