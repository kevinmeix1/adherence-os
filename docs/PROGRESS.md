# Progress Ledger

Last updated: 2026-07-12

## Current Task

Finish the `adherence-feature-source-v1` release checkpoint, regenerate visual evidence, push `codex/clinical-ledger-ui`, and verify the public pull request.

## Completed In This Checkpoint

- Added a dependency-light feature contract version and bound it into the model artifact.
- Moved all 14 browser feature transforms into `app/lib/modelFeatures.ts`.
- Made Python cohort generation use the same source fields and feature semantics before training.
- Corrected recent-dose and prior-failure semantics so historical misses and the current check-in are distinct.
- Removed silent HbA1c and blood-pressure imputations; missing raw values now become model abstentions.
- Generated twelve raw fixtures: six recorded-dose and six missed-dose cases.
- Verified every raw feature across Python and TypeScript to `1e-9`.
- Retained twenty independent scoring-kernel and bootstrap parity rows outside the browser bundle.
- Regenerated model artifact `2026-07-12-edge-logistic-bootstrap-v5`.
- Updated the Model record with the feature-source version and current benchmark populations.
- Preserved the four-cell model-support by safety-state graph contract.

## Current Reproduced Evidence

| Evidence | Result |
|---|---|
| All-row test ROC-AUC | 0.8328 |
| All-row test AUPRC | 0.5174 |
| Primary rows flagged / precision / recall | 32.9% / 29.3% / 77.0% |
| Adherence-only rows flagged / precision / recall | 56.6% / 15.8% / 71.2% |
| Runtime support coverage | 90.0%, 1,620/1,800 rows |
| Scored-subset AUPRC / precision / recall | 0.4438 / 26.5% / 73.6% |
| Coaching fixture | Supported 42%; 16-point bounded Meal-timing comparison; no handoff |
| Safety fixture | ML abstains; deterministic NHS 111 route and local draft remain active |

All values are synthetic software-assurance evidence, not clinical validation.

## Verification Run

| Command | Result |
|---|---|
| `pnpm typecheck` | Pass |
| `pnpm check:model` | Pass, v5 artifact reproduced |
| `pnpm test` | Pass, 73/73 |
| `pnpm build` | Pass |
| `pnpm check:bundle` | Pass, 151.8/155.0 kB gzip |
| `APP_URL=http://127.0.0.1:3001 pnpm test:browser` | Pass, 6/6 |
| `APP_URL=http://127.0.0.1:3001 pnpm smoke` | Pass |
| [GitHub Actions `29201156709`](https://github.com/kevinmeix1/adherence-os/actions/runs/29201156709) | Pass in 1m44s on `9447be9` |

## Failures Found And Fixed

| Failure | Root cause | Resolution |
|---|---|---|
| Training and browser feature semantics diverged | Python created engineered routine, dose, and side-effect values directly while TypeScript inferred them from a patient/check-in | Both paths now use an explicit versioned raw-source contract and cross-language fixtures |
| Missing biomarkers were silently imputed | Serving used `-0.1` HbA1c and `130` systolic fallbacks | Missing values now produce non-finite feature violations and abstention |
| One patient dashboard test failed after retraining | Contract-aligned training bounds made Aisha support-eligible | Replaced the obsolete null fixture assertion with a bounded score contract; James still proves routed abstention |
| Artifact parser depended on care-domain code for one version constant | Feature version initially lived beside the feature builder | Moved the constant into `modelFeatureContract.ts` |
| Stateful screenshots contained black compositor tiles | Headless Chromium retained transition layers across view changes | Simplified inherited UI layers; capture now uses isolated headed pages, static motion, and PNG output |

## Decisions

- Keep a modular monolith and browser ML for this scale.
- Keep safety deterministic and independent from both model and provider.
- Report all-row and runtime-gated populations separately.
- Treat score comparisons as planning assumptions, never treatment effects.
- Keep parity fixtures test-only to protect bundle size.
- Do not add production infrastructure that cannot be truthfully demonstrated.

## Screenshots And Media

- Nine PNG states were regenerated from isolated Chromium pages and mirrored under `docs/screenshots/adherence-os/`.
- The ten-slide deck was rebuilt from those PNGs; visual inspection and overflow validation pass.
- The 2:59 video was rebuilt with H.264, AAC, and 30 embedded English cues; full decode, subtitle parity, audio levels, and four sampled states pass.

## Remaining Risks

- No real patient, clinician, label, or workflow evidence.
- No auth, persistence, rate limiting, telemetry backend, or hosted preview.
- Only marginal range drift is gated at runtime.
- Main page and stylesheet modules remain large.
- Browser bundle has 3.2 kB of headroom.

## Next Action

Keep the verified keyless build ready for judging. The highest-value unresolved evidence is a small task-based patient or care-team comprehension study; record real observations without inventing outcomes.
