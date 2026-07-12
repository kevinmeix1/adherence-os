# Incident Runbook

## First Response

1. Keep the presenter on the last known safe screen.
2. Do not change dependencies or retrain the model during the live demo.
3. Check `GET /api/health` and the server terminal.
4. Switch to keyless mode if the provider path is involved.
5. Use the checked-in video, deck, or screenshot walkthrough if recovery would distract from the story.

## Incident Matrix

| Symptom | Diagnose | Smallest recovery | Escalation |
|---|---|---|---|
| Port unavailable | `lsof -nP -iTCP:<port> -sTCP:LISTEN` | Use another port and set `APP_URL` | Stop only the known stale process |
| Health fails | Read server startup output; verify `.next` exists | Stop server, `pnpm build`, restart, rerun smoke | Roll back to last green commit |
| Browser is blank or stale | Hard refresh; inspect console; verify current port | Open a fresh tab to the production URL | Use video fallback |
| Generate remains pending | Check provider key and network | Remove key, refresh, use deterministic fallback | Do not rely on provider during judging |
| Model record says artifact invalid | Run `pnpm check:model` | Restore the last known green artifact/code pair | Do not regenerate without reviewing drift |
| Unexpected abstention | Inspect typed support violations | Continue with rules-owned output; do not force a score | Record the source/contract issue after demo |
| Safety case still shows coaching | Stop the demo path immediately | Reset and reproduce; if repeated, use verified video | Treat as release-blocking P0 |
| Review draft appears sent | Stop using the live UI | Use verified fallback asset | Treat as release-blocking truthfulness issue |
| Layout overflows on mobile | Return to desktop width | Present desktop or verified mobile screenshot | File a UI regression after the session |

## Model Reproduction Failure

1. Confirm Python and NumPy match `requirements-model.txt`.
2. Check whether `scripts/train_adherence_model.py`, the artifact, or fixtures changed.
3. Read the first reported JSON path.
4. Decide whether the code or checked-in output is wrong.
5. Run `pnpm train:model` only for an intentional reviewed model change.
6. Update all metric claims and media after the full gate passes.

## Safety Regression

A safety regression includes any urgent fixture remaining in coaching, any medication-change instruction surviving, or any support route appearing active after a red flag.

1. Stop release work.
2. Reproduce with the smallest deterministic test.
3. Fix rules or suppression before UI polish.
4. Add a regression test.
5. Run unit, browser, and smoke gates.
6. Recapture all affected screenshots and media.

## Provider Failure

- Expected fallback reasons: not configured, provider error, invalid provider output.
- Never log the request body or patient/check-in text.
- A provider failure must still return a complete deterministic plan.
- If a credential may be exposed, revoke it before investigating further.

## Rollback

1. Identify the latest commit with successful local and remote gates.
2. Deploy that commit or create a normal `git revert`.
3. Rebuild and run health, browser, and smoke checks.
4. Keep the current public PR open for review; do not force-push shared history.

## Post-Incident Record

Record the time, affected commit, observed symptom, safety impact, reproduction, root cause, smallest fix, tests added, and whether screenshots or documentation became stale. Do not include real patient or credential data.
