# Demo Script

## 1. One-Line Pitch

Adherence OS is an AI decision layer that predicts when at-home GLP-1 adherence may fail, surfaces the active context signal, explains the largest model contributor, tests a bounded action, and lets independent safety rules stop coaching and prepare a clinician-review draft.

## 2. Problem

Chronic-care programmes are won or lost between appointments. A patient may be technically stable while nausea, disrupted routine, low hydration, anxiety, or missed doses quietly build toward dropout. Patients receive too much generic advice, and care teams cannot hold a real-time appointment for every weak signal.

## 3. User Persona

**Primary patient:** Maya Patel, 36, in week eight of a synthetic at-home GLP-1 programme. She works irregular hours, responds well to reminders, and is most likely to disengage when nausea disrupts meals and routine.

**Care-team user:** a clinician or care navigator who needs to identify which patients remain in routine coaching and which have a review draft to inspect without reading every raw check-in.

## 4. Before State

- Maya logs symptoms and adherence, but each entry is isolated.
- She has to decide whether a symptom is routine, concerning, or medication-related.
- The care team sees incomplete snapshots and cannot continuously monitor every patient.
- A generic chatbot could produce plausible language without proving why it chose an action or whether safety overrode it.

## 5. Product Workflow

1. Structure a 60-second home check-in.
2. Score next-week adherence-interruption risk locally with a monotonic model.
3. Build a patient-specific evidence graph from longitudinal and current signals.
4. Identify the highest-ranked context signal and explain the largest model contributor.
5. Rescore explicit, bounded support assumptions and rank the tested actions.
6. Independently evaluate red flags with deterministic safety rules.
7. Allow coaching only when no configured safety rule matches; otherwise show an urgent action and prepare a clinician-review draft.

## 6. Main Wow Moment

Switch from **Load coaching case** to **Load safety case** on the Decision map. The symptom vector exceeds configured marginal feature bounds, numeric ML ranking abstains, every tested action becomes **Blocked by safety**, and the graph switches to the **Safety guardrail** and local review-draft path. The system demonstrates that safety remains active even when the model declines to score the decision.

## 7. Why It Is Technically Credible

- The risk score comes from a real browser-side logistic model artifact, not an LLM guess.
- Each synthetic row predicts a following-week event from index-week information, with patients isolated across train, validation, and test splits.
- For supported inputs, sixteen patient-bootstrap members expose model spread; held-out AUPRC and Brier skill are shown alongside recall.
- A predeclared recent-adherence-only challenger uses the same patient split and validation recall target: the 14-feature model flags 33% of all synthetic test rows at 29% precision versus 57% at 16% precision for the challenger.
- Runtime-gate evidence is reported separately: 90% of held-out rows are scored, 180 abstain, and the scored subset retains 74% recall at 26% precision.
- Twelve Python-generated taken/missed cases reproduce all 14 browser features under an artifact-bound raw-source contract; missing source values still abstain.
- Directional constraints prevent synthetic correlated features from learning counterintuitive signs.
- A supported score is reconstructed exactly from intercept and signed log-odds contributions.
- Supported one-feature-at-a-time sensitivity shows local score stability without pretending to be a confidence interval.
- When a feature exceeds its configured marginal bound, patient score, attribution, spread, sensitivity, and tested-action ranking are all withheld.
- Graph nodes identify whether evidence comes from the model, a bounded simulation, a deterministic rule, or patient context.
- Optional OpenAI output is schema-validated, then the complete deterministic plan is recomputed; generated wording does not survive the current MVP merge.
- The full product works without a provider key.

## 8. Why It Matters To eMed And Judges

- **User impact:** one bounded next action instead of generic chronic-care content.
- **Innovation:** an explainable decision workflow rather than a chatbot wrapper.
- **Feasibility:** local ML, synthetic structured data, pending review drafts, and no new clinical infrastructure in the prototype.
- **Demo quality:** a visible coachable-risk-to-safety transition that can be understood in seconds.
- **eMed fit:** extends high-adherence at-home programmes with proactive support and scalable oversight between appointments.

## 9. Three-Minute Demo Script

Before the timer, open **Resources**, choose **Reset demo session**, and confirm Maya Patel, **Load coaching case**, and **Decision path** are selected.

### 0:00-0:25 — Frame The Problem

Say:

> Chronic-care dropout rarely happens in one dramatic moment. It builds between appointments. Adherence OS predicts that weak signal early, explains it, and knows when AI coaching must stop.

### 0:25-1:00 — Show The Coachable Window

Point to **42%**, **Watch**, and **Meal-timing prompt** in the first viewport.

Say:

> Maya has elevated but supported next-week interruption risk. No configured safety rule matched, so coaching remains available. Appetite and energy is the highest-ranked risk-raising graph signal, and a bounded meal-timing assumption lowers this synthetic scenario score from 42% to 25%.

Do not open every panel. Keep the audience on the decision.

### 1:00-1:35 — Explain One Driver And Action

Click **Attribution**, then **Nausea burden** and **Meal-timing prompt**.

Say:

> Every node declares its source. Blue is model attribution, amber is a bounded simulation, red is a deterministic rule, and grey-green is patient context. This tested action is a planning comparison, not a causal treatment claim.

Scroll only far enough to show **Why this action ranked first** if time permits.

### 1:35-2:15 — Trigger The Safety Override

Click **Load safety case**.

Say:

> Maya now reports vomiting, worsening pain, poor hydration, and lightheadedness. One or more features exceed the model's marginal bounds, so patient-specific ML evidence is withheld. Safety still blocks every tested action and tells her to call NHS 111 now; if the pain is sudden or so severe that it is hard to think or talk, she should call 999 or go to A&E now. The clinician handoff is a draft, not a sent message.

Point to **Abstained**, **Suppressed**, **Handoff draft**, and the red safety path.

### 2:15-2:45 — Show Human Ownership

Click **Review handoff draft**.

Say:

> The review task opens with longitudinal context, current red flags, ownership and delivery state, a rules-owned draft response, and the audit trail. Nothing has been sent.

### 2:45-3:00 — Establish Credibility And Close

Optionally click **Model record** only if the audience wants technical depth.

Say:

> The model runs locally from an exported artifact, and the LLM is optional. Against a validation-matched recent-adherence-only baseline, it flags substantially fewer synthetic rows at comparable recall; the runtime gate then reports coverage and abstentions separately. This is pipeline evidence, not measured workflow savings. eMed has already shown what high-adherence at-home care can achieve. Adherence OS is the decision layer that helps keep patients in that programme within explicit clinical boundaries.

## 10. Thirty-Second Backup Pitch

> Adherence OS helps eMed manage the weeks between appointments. A local model estimates next-week adherence interruption, an evidence map surfaces the highest-ranked context signal, attribution explains the largest model contributor, and supported scenarios compare tested actions without claiming treatment effects. Independent red-flag rules can suppress every tested action and prepare a clinician-review draft. It works with synthetic data and without an API key, so the demo is reliable and the safety boundary is visible.

## 11. Fallback Plan If The Live Demo Fails

1. Open **Resources**, choose **Reset demo session**, then refresh `http://localhost:3000` or the configured local port if needed.
2. If the app is unavailable, run `pnpm start` against the prebuilt project.
3. Verify `GET /api/health` or run `pnpm smoke`.
4. Keep OpenAI unconfigured; the deterministic path is the intended reliable fallback.
5. Use [the video walkthrough](../outputs/adherence-os-demo.mp4).
6. Use [the presentation deck](../outputs/adherence-os-demo.pptx).
7. Explain the safety transition using the screenshots in the deck rather than improvising unsupported clinical claims.

## 12. Seeded Scenario To Show

Use **Maya Patel** for both paths.

### Coaching Seed

- Planned weekly dose recorded
- Nausea 6/10
- Hydration 4/10
- Appetite 2/10 and energy 4/10
- Anxious mood with a hectic-work routine signal
- Strong recent adherence
- Appetite and energy is the highest-ranked risk-raising graph signal; nausea burden is the largest risk-raising model group

Expected result: supported 42% Watch state, Meal-timing prompt with a 16-point bounded decrease, coaching allowed, no handoff.

### Escalation Seed

- Medication missed
- Nausea 8/10
- Hydration 2/10
- Vomiting and inability to keep fluids down
- Worsening abdominal pain and lightheadedness

Expected result: NHS 111 now, with the 999/A&E contingency visible; tested actions suppressed; safety guardrail and clinician handoff draft active.

## 13. Screens And Pages That Must Work Perfectly

1. `/` Decision map with Load coaching case selected.
2. `/` Decision map Attribution focus.
3. `/` Decision map after **Load safety case**.
4. `/` Review drafts with Maya selected.
5. `/` Check-in Review care plan loading and fallback notice.
6. `/` Model record sensitivity and exact decomposition.
7. `/patients` synthetic patient overview.
8. `/patients/maya-patel` routed patient record.
9. `/api/health` readiness response.
10. **Reset demo session** in Resources after a changed patient, scenario, graph focus, and scroll position.
11. At 390 px and 320 px, the coaching case remains graph-first while the safety case shows the urgent destination and handoff action before the graph.

## Presenter Rules

- Never call graph paths or tested actions causal.
- Never call synthetic metrics clinical validation.
- Never imply that Adherence OS diagnoses or changes medication.
- Never describe a rule non-match as proof that symptoms are safe, manageable, or "not a crisis".
- Keep the graph explanation to one context signal, one model contributor, one tested action, and one safety override.
- Model record is technical proof, not the main story.

## Keyboard Rehearsal Checklist

1. Reload and press `Tab` once. **Skip to main content** must appear; `Enter` must focus the workspace.
2. Tab through **Decision map**, **Check-in**, and **Review drafts**; focus must remain visible and `Enter` must switch views. Open **Model record** from the decision summary.
3. In **Check-in**, activate **Load coaching** or **Load safety**, toggle one named urgent-symptom checkbox, change one slider with arrow keys, and confirm **Custom** appears after either edit.
4. Open prototype resources with `Enter`, press `Escape`, and confirm focus returns to the resources summary.
5. In **Decision map**, activate graph focus modes with `Enter`, then reach graph nodes and use both `Enter` and `Space` to update the inspector.
6. Open **Resources**, activate **Reset demo session**, and confirm Maya, Load coaching case, Decision path, and top scroll are restored.
