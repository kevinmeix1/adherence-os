# Product Walkthrough

This walkthrough follows the exact production build used for release verification. Every patient and metric shown is synthetic. Use it to learn the product flow or as a visual fallback if a live demo is unavailable.

## 1. Start With The Decision

![Live twin coaching overview](../public/walkthrough/01-live-twin-coaching.jpg)

The opening view answers four questions before exposing implementation detail: What is the next-week adherence-interruption risk? Is recent adherence weakening? Which bounded support route changes the score under its assumptions? Is coaching allowed by the independent safety layer?

The graph is the first analytical surface, but the adjacent summary keeps the next safe move visible. **5%** is the local model output for this seeded synthetic check-in; it is not a medical-risk score.

## 2. Inspect The Active Driver

![Attribution view with Routine disruption selected](../public/walkthrough/02-attribution-driver.jpg)

Select **Attribution**, then **Routine disruption**. The graph reveals source badges and the inspector maps the node back to three structured features. The signed log-odds contribution and attribution share come from the local logistic model.

The graph score is an authored inspection aid. It does not prove that the node caused adherence behavior.

## 3. Inspect A Bounded Support Route

![Hydration nudge bounded support route](../public/walkthrough/03-bounded-support-route.jpg)

Select **Hydration nudge**. The app changes explicit feature assumptions, rescores the same model, and reports a **2 percentage-point** scenario decrease. The route is only ranked while both the observed and simulated vectors remain inside synthetic training support.

This is a planning comparison, not a treatment-effect estimate or medication recommendation.

## 4. Trigger The Safety Override

![Escalation scenario with model abstention and safety handoff](../public/walkthrough/04-safety-escalation.jpg)

Select **Escalation**. The synthetic symptom vector moves outside model support, so numeric ML ranking **abstains**. Deterministic rules remain active, suppress support scenarios, and route the decision through the safety guardrail to an urgent clinician-review draft.

This is the key product boundary: model uncertainty cannot disable safety, and a high adherence-risk score is not required for red-flag escalation.

## 5. Review, Do Not Auto-Send

![Clinician handoff review workspace](../public/walkthrough/05-clinician-handoff-review.jpg)

Select **Review handoff draft**. The care-team view opens directly on the pending task with its trigger, unassigned owner, **Draft only / not sent** delivery state, longitudinal summary, patient-facing draft, and five-step audit trail.

The prototype prepares context for a human decision. It does not diagnose, make a medication change, assign a clinician, or claim that a message was delivered.

## 6. See The Patient-Side Input

![Patient home check-in and care plan](../public/walkthrough/06-patient-check-in.jpg)

The patient workspace turns a short structured check-in into a care plan, adherence profile, seven-day support plan, rule trace, and eight-week context. Editing any field recomputes the deterministic decision immediately and invalidates older in-flight provider requests.

The seeded **Normal** and **Escalation** controls exist for a repeatable judged demo; a field edit visibly changes the state to **Custom**.

## 7. Audit The Model

![Model evidence with abstention and prospective metrics](../public/walkthrough/07-model-evidence.jpg)

The technical view exposes artifact versioning, the prospective target, patient-isolated splits, held-out AUPRC, recall, threshold, review rate, Brier skill, exact attribution, one-feature sensitivity, bootstrap spread, reliability bins, and support-aware what-if behavior.

The screenshot intentionally shows an abstention state. The raw 90% score is displayed for model inspection, but it does not become an operational route outside training support.

## 8. Verify The Narrow Layout

![320 pixel mobile Live twin](../public/walkthrough/08-mobile-live-twin.jpg)

At 320 px wide the app has zero horizontal page overflow. Navigation wraps into a compact product bar, the decision metrics form a stable two-column grid, and the evidence map remains the first analytical section. Lower-density evidence is progressively disclosed further down the page.

## Reproduce The Walkthrough

```bash
pnpm install
pnpm build
pnpm start
```

Open `http://localhost:3000`, select **Reset demo**, and follow steps 1-7. In another terminal, run `pnpm smoke` to verify the home page, health route, patient routes, normal API path, and escalation API path.
