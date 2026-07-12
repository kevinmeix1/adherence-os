# AGENTS.md

## Project Goal

Build a reliable, memorable hackathon MVP for Adherence OS: an AI decision layer for at-home GLP-1 adherence support. Demo clarity matters more than production completeness.

Every meaningful change should improve at least one of: the three-minute story, patient/care-team value, safety, demo reliability, reviewer credibility, or maintainability.

## Product Principle

The core story is:

1. Predict near-term adherence risk.
2. Explain the active driver and evidence source.
3. Simulate a bounded support assumption.
4. Let independent deterministic safety rules stop coaching and hand off to a clinician.

Do not add a feature unless it appears in this story or materially protects it.

## Target Users

- A patient managing a long at-home GLP-1 programme.
- A clinician or care navigator inspecting local asynchronous-review drafts.
- Hackathon judges evaluating impact, innovation, feasibility, and demo quality.

## Tech Stack

- Frontend: Next.js 15 App Router, React 19, TypeScript.
- Backend: Next.js route handlers.
- Validation: Zod.
- AI: optional OpenAI structured output with deterministic fallback.
- ML: browser-side monotonic logistic inference from exported JSON.
- Graph: typed in-memory evidence graph and bounded route comparison.
- Data: checked-in synthetic JSON only.
- Tests: Node test runner with the local TypeScript registration shim, plus Chromium interaction and axe contracts.

## Folder Structure

- `app/page.tsx`: primary client workspace and demo views.
- `app/product.css`: current product-shell, graph, and directory presentation.
- `app/globals.css`: shared and legacy application styles.
- `app/api/`: care-plan and health route handlers.
- `app/lib/`: deterministic safety, ML, graph, schemas, health, and patient summaries.
- `app/patients/`: routed synthetic patient directory and records.
- `data/`: synthetic patient data and exported model artifact.
- `scripts/`: model training and live smoke checks.
- `tests/`: deterministic contracts and the bounded production-browser suite.
- `docs/`: audit, backlog, architecture, safety, ML, design, and demo material.
- `outputs/`: checked-in demo video and slide deck.
- `public/`: browser-served README and social preview imagery.

## Run Locally

```bash
npm install --global corepack@latest
corepack enable pnpm
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Production mode:

```bash
pnpm build
pnpm start
```

Optional model regeneration requires Python 3 and NumPy:

```bash
python3 -m pip install numpy
pnpm train:model
```

## Validation Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
pnpm test:browser
pnpm smoke
```

`pnpm test:browser` starts the existing production build on port 3100 when `APP_URL` is absent. `pnpm smoke` expects a running app at `http://localhost:3000`, or at `APP_URL` when provided.

Run focused checks after each meaningful change and the full set before declaring a phase complete.

## Code Style And Engineering Rules

- Preserve strict TypeScript and existing project conventions.
- Prefer typed pure functions for safety, model, and graph logic.
- Prefer existing dependencies; add no dependency for a task the platform can handle simply.
- Keep safety-critical rules deterministic and covered by tests.
- Validate API inputs and structured AI outputs.
- Keep provider fallback visible without breaking the local demo.
- Add loading, empty, and error states where users can encounter them.
- Keep edits narrow; do not combine feature work with broad refactors.
- Extract an abstraction only when it removes real complexity or duplication.
- Keep comments brief and only where the reasoning is not obvious.
- Update documentation when behavior, labels, commands, or demo order changes.

## CSS Ownership

`app/globals.css` loads first. It owns base elements, shared panel/form primitives, and the older Patient app, Care queue, Model lab, Safety, Scripts, and Judge proof view styles.

`app/product.css` loads second. It owns the product bar, graph-first Live twin, its responsive graph workbench, and the routed patient directory/record experience. Its product tokens intentionally override shared defaults on those surfaces.

- Put new styles in the file that owns the rendered surface; do not mirror a selector in both files.
- Keep responsive overrides in the same owning file as the base selector.
- Check the later `product.css` cascade before changing a shared rule in `globals.css`.
- Do not move or delete existing style blocks before judging without desktop and mobile screenshot comparison.
- Add a new stylesheet only when a component extraction establishes a real ownership boundary.

## Demo Priorities

The following must remain reliable:

1. Maya Patel opens in Coaching mode on Live twin.
2. Attribution explains model, simulation, rule, and context provenance.
3. Escalation changes the decision to clinician handoff.
4. Safety suppresses every simulated support route.
5. Review handoff opens Review drafts at the top.
6. Generate shows loading, provider mode, and a complete fallback result.
7. Model lab remains available as optional technical proof.

Keep the normal and escalation seeded scenarios stable.

## Security And Privacy Rules

- Never use or add real patient data.
- Never commit API keys, tokens, credentials, or local environment files.
- Do not log check-in free text, patient records, or generated clinical content.
- Keep API validation at the server boundary.
- Treat the optional provider endpoint as cost-bearing when a key is configured.
- Do not add authentication, databases, queues, payments, or device integrations for this MVP.
- Do not imply production healthcare compliance.

## AI And Clinical-Safety Rules

- The LLM may improve communication but does not own risk scoring or escalation.
- Never allow generated text to diagnose, prescribe, or recommend starting, stopping, restarting, or changing medication.
- Apply deterministic safety overrides after generation.
- Red flags always take precedence over coaching and simulated interventions.
- Describe what-if routes as bounded planning comparisons, never causal evidence.
- Describe sensitivity as a local stress test, never a confidence interval.
- Describe all model metrics as synthetic evaluation, never clinical validation.
- Keep clinician assessment and treatment decisions explicitly human-owned.

## Things Not To Build

- Real patient ingestion or external health-record integrations.
- Authentication, payments, databases, queues, or notification infrastructure.
- Autonomous diagnosis, medication changes, or treatment recommendations.
- A general-purpose chatbot.
- Multi-condition expansion before the GLP-1 demo is complete.
- Complex graph neural networks, causal claims, or infrastructure that will not appear in the judged demo.
- Decorative features or animations that compete with the decision story.

## Improvement Workflow

1. Read `docs/project_audit.md` and `docs/improvement_backlog.md`.
2. Select the highest-priority unfinished task.
3. Make the smallest useful change.
4. Add or update tests where practical.
5. Run focused validation.
6. Update the backlog status and any affected documentation.
7. Re-score the audit only when evidence materially changes.

## Definition Of Done

- The happy path works.
- The escalation path overrides coaching and simulations.
- Failure and fallback states remain visible and safe.
- No unsupported medical or causal claim was introduced.
- Desktop and mobile layouts remain coherent.
- Documentation matches the rendered product and commands.
- Relevant checks pass, or failures are accurately explained.
- The change is small enough to review and supports the demo.
