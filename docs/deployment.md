# Deployment Runbook

Adherence OS is a synthetic-data hackathon prototype. The safest judged-demo configuration is a local or hosted production build **without** `OPENAI_API_KEY`: every workflow remains complete, deterministic, and free from provider latency or cost.

## Supported Modes

| Mode | Recommended use | Provider behavior | Main risk |
|---|---|---|---|
| Local production, keyless | Live judging and rehearsal | Disclosed deterministic fallback | Laptop/process availability |
| Hosted preview, keyless | Sharing with judges or reviewers | Disclosed deterministic fallback | Hosting availability |
| Local development, keyed | Testing optional structured wording | OpenAI with an 8-second deadline, then safe fallback | Provider latency and usage cost |
| Public hosted, keyed | Not recommended for this MVP | Unauthenticated cost-bearing endpoint | Abuse, unexpected spend, and unnecessary data transfer |

## Release Gate

Use Node.js 22+ and the pnpm version declared in `package.json`.

Development and production output are isolated in this repository: `pnpm dev` writes to `.next-dev`, while `pnpm build` and `pnpm start` use `.next`. A production build therefore cannot overwrite files used by the development server. Stop any existing production server before rebuilding because production build and start intentionally share `.next`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
```

Before the event-day build, confirm that no production server is still running on the intended port. A development server may remain available on another port without sharing build output, although stopping it reduces CPU and memory pressure during judging.

Start the production build in one terminal:

```bash
pnpm start
```

Then exercise the same paths used in the demo:

```bash
pnpm smoke
```

Smoke must confirm `/`, `/api/health`, the patient directory and record, a normal care-plan response, and an urgent escalation response.

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | No | Keyless deterministic mode | Leave unset for public demos. Never commit it. |
| `OPENAI_MODEL` | No | `gpt-5.5` | Used only when an API key is configured. |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | Set to the public preview origin so social image links are absolute. |
| `APP_URL` | No | `http://localhost:3000` | Override only when smoke targets another port or host. |

Copy `.env.example` to `.env.local` only for local provider testing. Local environment files are ignored by Git.

## Keyless Production Demo

1. Ensure `OPENAI_API_KEY` is absent from the shell and `.env.local`.
2. Run the release gate and start the production build.
3. Open `http://localhost:3000` and confirm Decision map is the first view.
4. Run `pnpm smoke` immediately before presenting.
5. Keep the checked-in video and deck available as visual fallback assets.

The UI labels fallback mode. It is not a reduced experience: risk scoring, graph analytics, tested-action comparison, safety rules, rescue planning, and clinician handoff all run locally.

## Hosted Preview

Adherence OS builds as a standard Next.js application. Configure the host to use Node.js 22+, install with pnpm, and run `pnpm build`. Do not add provider credentials for a public hackathon URL.

After deployment:

```bash
APP_URL=https://your-preview.example pnpm smoke
```

The preview is ready only when the expanded smoke command passes. The current CI workflow runs the equivalent keyless production gate on pushes and pull requests.

## Health And Observability

`GET /api/health` returns non-sensitive readiness metadata:

- service status
- explicit `synthetic` data mode
- loaded patient count
- model version
- model feature count

Unknown streamed patient records render the recovery state with `noindex`. Next.js intentionally returns HTTP 200 after a loading boundary has started streaming; smoke validates the recovery content and noindex marker rather than treating this supported soft-404 behavior as a service failure.

Provider errors log only a short error message. Check-in text and patient payloads must not be added to logs.

## Provider Safety Boundary

`POST /api/care-plan` has no authentication or rate limiting because both are outside the judged MVP. Never expose it publicly with an unrestricted paid key. If keyed hosting is temporarily necessary, use a restricted, low-budget credential and remove it immediately after the controlled session.

Regardless of provider mode:

- request data and structured output are validated
- provider work has an 8-second, zero-retry deadline
- exceptions and invalid output return a disclosed deterministic plan
- deterministic red flags override generated coaching
- generated diagnosis or medication-change language is removed
- no real patient data is permitted

## Demo Recovery

| Symptom | Smallest recovery |
|---|---|
| Generate remains pending | Refresh, remove the provider key, and use deterministic mode. |
| Port 3000 is occupied | Stop the old process or run `pnpm exec next start -p 3001` and `APP_URL=http://localhost:3001 pnpm smoke`. |
| Development server is running during a build | Supported: development uses `.next-dev` and production uses `.next`. Stop development anyway if the laptop needs the extra CPU or memory. |
| Production server is running during a rebuild | Stop it first, run `pnpm build`, then restart `pnpm start`; both intentionally use `.next`. |
| Health check fails | Read the server terminal, restart the production process, and rerun smoke. |
| Hosted preview fails | Switch to the locally validated production build. |
| Live browser fails | Play `outputs/adherence-os-demo.mp4` and narrate from `docs/demo_script.md`. |

## Rollback

1. Record the last commit whose CI and smoke checks passed.
2. Redeploy that commit from the hosting provider, or create a normal `git revert` for the faulty change.
3. Do not force-push or reset the public branch during the hackathon.
4. Run health and expanded smoke against the rollback deployment before sharing it.

For the live event, the most reliable rollback is the already-validated local keyless production build.
