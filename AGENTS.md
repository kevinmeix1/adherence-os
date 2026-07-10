# AGENTS.md

## Project Goal

Build a reliable, memorable hackathon MVP for Adherence OS: an AI decision layer for at-home GLP-1 adherence support. Demo clarity matters more than production completeness.

## Product Principle

Every feature must support the three-minute story: predict adherence risk, explain the active driver, simulate a bounded support action, and let independent safety rules hand off to a clinician.

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript
- Backend: Next.js route handlers
- AI: optional OpenAI structured output with deterministic fallback
- ML: browser-side logistic inference from an exported JSON artifact
- Data: synthetic JSON only

## Do Not Do

- Do not use real patient data.
- Do not describe the knowledge graph or what-if simulations as causal evidence.
- Do not present synthetic model metrics as clinical validation.
- Do not allow generated text to diagnose or recommend medication changes.
- Do not add databases, queues, authentication, or device integrations unless they are required for the judged demo.
- Do not add features that will not appear in the demo.

## Coding Rules

- Preserve the normal and escalation demo scenarios.
- Keep safety-critical rules deterministic and covered by tests.
- Validate API inputs and structured AI outputs.
- Make provider fallback visible without breaking the local demo.
- Prefer existing dependencies and simple typed functions.
- Add loading, empty, and error states where a user can encounter them.

## Validation

Run the relevant checks after changes:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

`pnpm smoke` expects the app to be running at `http://localhost:3000`, or at `APP_URL` when provided.

## Done Means

- The happy path works.
- The escalation path still overrides coaching.
- Failure and fallback states are visible and safe.
- Documentation matches what the code actually does.
- Relevant checks pass or failures are explained.
