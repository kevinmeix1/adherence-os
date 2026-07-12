# Testing Strategy

## Principle

Tests protect the judged decision story and safety boundary, not a coverage percentage. The highest-value contracts are deterministic escalation, model abstention, train/serve parity, truthful handoff state, and a complete keyless fallback.

## Test Layers

| Layer | Command | Main coverage |
|---|---|---|
| Type system | `pnpm typecheck` | Strict TypeScript and module contracts |
| Unit and contract | `pnpm test` | Care rules, provider guardrails, API validation, model, features, graph, patient data, route states, health, build configuration |
| Model reproduction | `pnpm check:model` | Cohort, weights, bootstrap members, metrics, support bounds, challenger, raw fixtures, scoring fixtures |
| Documentation links | `pnpm check:docs` | README, study guides, screenshots, and local artifact references resolve |
| Production build | `pnpm build` | Next.js compilation, static routes, server handlers |
| Bundle budget | `pnpm check:bundle` | Unique home first-load JavaScript below 155 kB gzip |
| Browser and accessibility | `pnpm test:browser` | Judged flow, keyboard, patient-state isolation, model claims, responsive order, overflow, console health, bounded axe scans |
| Live smoke | `pnpm smoke` | Pages, health, records, normal API, escalation API, adversarial safety cases |

## Deterministic Test Inventory

The current suite contains 73 tests after the browser-header contract was added. Important groups include:

- Safety thresholds below, at, and above configured boundaries.
- Structured urgent flags and phrase-family adversarial cases.
- Provider unavailable, timeout, exception, invalid output, and unsafe wording.
- Prospective temporal fixture timing and scoring-kernel parity.
- Six taken and six missed raw-source cases reproducing all 14 features.
- Missing/non-finite input abstention and version mismatch rejection.
- Challenger and runtime-gate population reconciliation.
- Exact log-odds reconstruction and support-bounded sensitivity.
- Four model-support by deterministic-safety graph states.
- Per-patient local session preservation and truthful empty review state.

## Browser Matrix

Playwright runs Chromium against a production server. The six scenarios cover:

1. Coaching, graph selection, safety escalation, review handoff, and reset.
2. Keyboard-triggered safety changes and live announcements.
3. Independent patient sessions and local draft preservation.
4. Model benchmark, caveats, support state, and abstention.
5. Desktop, 390 px, and 320 px order plus overflow.
6. Serious and critical axe findings across core care states.

Automated axe checks cover only machine-detectable failures. They do not replace screen-reader, magnification, motor, cognition, or clinical comprehension studies.

## Running Locally

```bash
pnpm typecheck
pnpm test
python3 -m pip install -r requirements-model.txt
pnpm check:model
pnpm check:docs
pnpm build
pnpm check:bundle
pnpm start
```

In another terminal:

```bash
APP_URL=http://127.0.0.1:3000 pnpm test:browser
APP_URL=http://127.0.0.1:3000 pnpm smoke
```

Use another port when 3000 is occupied.

## Failure Triage

1. Read the first failing deterministic assertion before regenerating artifacts.
2. If model reproduction fails, inspect whether source semantics, seed, dependencies, or checked-in JSON changed.
3. Never run `pnpm train:model` merely to make a drift failure disappear; understand the intended model change first.
4. If browser tests fail, reproduce against the same production build and viewport.
5. If smoke fails, inspect server output without adding patient/check-in payloads to logs.
6. Update numeric documentation and media only after the regenerated artifact passes the full gate.

## Known Gaps

- No pixel-diff visual regression.
- No real assistive-technology or comprehension study.
- No production load, chaos, or failover test.
- No real provider integration test in default CI because it would require a secret and incur cost.
- No real outcome labels, drift stream, or delayed-label evaluation.

Those gaps are documented and should not be replaced with fabricated evidence.
