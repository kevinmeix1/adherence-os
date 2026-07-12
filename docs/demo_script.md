# Demo Script

## 1. One-Line Pitch

Adherence OS is an AI decision layer that predicts when at-home GLP-1 adherence may fail, explains the active driver, tests a bounded support action, and lets independent safety rules stop coaching and prepare a clinician-review draft.

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
4. Identify and explain the most connected active risk driver.
5. Rescore explicit, bounded support assumptions and rank the routes.
6. Independently evaluate red flags with deterministic safety rules.
7. Allow coaching only when no configured safety rule matches; otherwise show an urgent action and prepare a clinician-review draft.

## 6. Main Wow Moment

Switch from **Coaching** to **Escalation** on the Decision map. The symptom vector moves outside synthetic model support, numeric ML ranking abstains, every route becomes **Blocked by safety**, and the graph reroutes through **Safety guardrail** to **Clinician handoff**. The system demonstrates that safety remains active even when the model declines to score the decision.

## 7. Why It Is Technically Credible

- The risk score comes from a real browser-side logistic model artifact, not an LLM guess.
- Each synthetic row predicts a following-week event from index-week information, with patients isolated across train, validation, and test splits.
- Sixteen patient-bootstrap members expose model spread, and held-out AUPRC and Brier skill are shown alongside recall.
- Directional constraints prevent synthetic correlated features from learning counterintuitive signs.
- The score is reconstructed exactly from intercept and signed log-odds contributions.
- One-feature-at-a-time sensitivity shows local score stability without pretending to be a confidence interval.
- Graph nodes identify whether evidence comes from the model, a bounded simulation, a deterministic rule, or patient context.
- Optional OpenAI output is schema-validated, then the complete deterministic plan is recomputed; generated wording does not survive the current MVP merge.
- The full product works without a provider key.

## 8. Why It Matters To eMed And Judges

- **User impact:** one bounded next action instead of generic chronic-care content.
- **Innovation:** an explainable decision workflow rather than a chatbot wrapper.
- **Feasibility:** local ML, synthetic structured data, pending review drafts, and no new clinical infrastructure in the prototype.
- **Demo quality:** a visible normal-to-escalation transition that can be understood in seconds.
- **eMed fit:** extends high-adherence at-home programmes with proactive support and scalable oversight between appointments.

## 9. Three-Minute Demo Script

### 0:00-0:20 — Frame The Problem

Click **Reset demo** in the product bar. Confirm **Decision map**, Maya Patel, **Coaching**, and **Decision path** are selected.

Say:

> Chronic-care dropout rarely happens in one dramatic moment. It builds between appointments. Adherence OS predicts that weak signal early, explains it, and knows when AI coaching must stop.

### 0:20-0:55 — Read The Decision

Point to the headline and four metrics.

Say:

> Maya remains in coaching mode. The edge model estimates low next-week adherence-interruption risk, and the evidence map surfaces appetite and energy drag as the active context signal. Attribution shows that routine disruption carries the largest structured share, while hydration is the highest-ranked supported route to try.

Do not open every panel. Keep the audience on the decision.

### 0:55-1:30 — Explain The Intelligence

Click **Attribution**, then click **Routine disruption** and **Hydration nudge**.

Say:

> Every node declares its source. Blue is model attribution, amber is a bounded simulation, red is a deterministic rule, and grey-green is patient context. This route is a planning comparison, not a causal treatment claim.

Scroll only far enough to show **Why this route won** if time permits.

### 1:30-2:15 — Trigger The Safety Override

Click **Escalation**.

Say:

> Maya now reports vomiting, worsening pain, poor hydration, and lightheadedness. The model abstains outside synthetic support. Safety blocks every coaching route and tells her to call NHS 111 now; if the pain is sudden or so severe that it is hard to think or talk, she should call 999 or go to A&E now. The clinician handoff is a draft, not a sent message.

Point to **Abstained**, **Suppressed**, **Handoff draft**, and the red route.

### 2:15-2:40 — Show Scalable Oversight

Click **Review handoff draft**.

Say:

> The review task opens with longitudinal context, current red flags, ownership and delivery state, a rules-owned draft response, and the audit trail. Nothing has been sent.

### 2:40-3:00 — Establish Credibility And Close

Optionally click **Model record** only if the audience wants technical depth.

Say:

> The model runs locally from an exported artifact, the explanations are exact, and the LLM is optional. eMed has already shown what high-adherence at-home care can achieve. Adherence OS is the decision layer that helps keep patients in that programme within explicit clinical boundaries.

## 10. Thirty-Second Backup Pitch

> Adherence OS helps eMed manage the weeks between appointments. A local model estimates next-week adherence interruption, an evidence map exposes the active driver, and supported scenarios compare small actions without claiming treatment effects. Independent red-flag rules can suppress every coaching route and prepare a clinician-review draft. It works with synthetic data and without an API key, so the demo is reliable and the safety boundary is visible.

## 11. Fallback Plan If The Live Demo Fails

1. Click **Reset demo**, then refresh `http://localhost:3000` or the configured local port if needed.
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
- Nausea 3/10
- Hydration 7/10
- Strong recent adherence
- Appetite and energy drag is the active graph driver; routine disruption has the largest structured attribution share

Expected result: coaching allowed, Hydration nudge selected, no escalation.

### Escalation Seed

- Medication missed
- Nausea 8/10
- Hydration 2/10
- Vomiting and inability to keep fluids down
- Worsening abdominal pain and lightheadedness

Expected result: NHS 111 now, with the 999/A&E contingency visible; simulations suppressed; safety guardrail and clinician handoff draft active.

## 13. Screens And Pages That Must Work Perfectly

1. `/` Decision map in Coaching mode.
2. `/` Decision map Attribution focus.
3. `/` Decision map after Escalation.
4. `/` Review queue with Maya selected.
5. `/` Check-in Review care plan loading and fallback notice.
6. `/` Model record sensitivity and exact decomposition.
7. `/patients` synthetic patient overview.
8. `/patients/maya-patel` routed patient record.
9. `/api/health` readiness response.
10. **Reset demo** after a changed patient, scenario, graph focus, and scroll position.

## Presenter Rules

- Never call graph routes causal.
- Never call synthetic metrics clinical validation.
- Never imply that Adherence OS diagnoses or changes medication.
- Never describe a rule non-match as proof that symptoms are safe, manageable, or "not a crisis".
- Keep the graph explanation to one driver, one route, and one safety override.
- Model record is technical proof, not the main story.

## Keyboard Rehearsal Checklist

1. Reload and press `Tab` once. **Skip to main content** must appear; `Enter` must focus the workspace.
2. Tab through **Decision map**, **Check-in**, and **Review queue**; focus must remain visible and `Enter` must switch views. Open **Model record** from the decision summary.
3. In **Check-in**, activate Normal/Escalation, change one slider with arrow keys, and confirm **Custom** appears after the edit.
4. Open prototype resources with `Enter`, press `Escape`, and confirm focus returns to the resources summary.
5. In **Decision map**, activate graph focus modes with `Enter`, then reach graph nodes and use both `Enter` and `Space` to update the inspector.
6. Tab to **Reset demo**, activate it, and confirm Maya, Coaching, Decision path, and top scroll are restored.
