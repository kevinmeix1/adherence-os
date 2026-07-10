# Demo Scripts

## Script 0: Decision-Cockpit Opening

1. Open Live twin with Maya Patel in Coaching mode.
2. Read the opening decision: Maya's adherence risk is still reversible.
3. Point to the ML risk, recent adherence, simulated risk change, and clinical-safety distance.
4. Switch between Decision path, Selected, Attribution, and All signals, then click Routine disruption, Reminder anchor, and 7-day adherence risk.
5. In Attribution, show the source rings for model contributions, simulations, deterministic rules, and context.
6. Show the signed attribution, provenance, relationships, safe next move, and safety boundary changing with the selected node.
7. Scroll to Why this route won and show the four ranked planning alternatives.
8. Click Escalation.
9. Call out the deliberate dual-track result: ML dropout risk is 21%, but a red-flag safety rule remains outside the model, suppresses every simulated route, and activates Handoff.
10. Click Review handoff to open the clinician queue.

Talk track:

"This is Adherence OS: an AI decision layer for the weeks between appointments. The edge model predicts dropout risk, the graph explains the smallest loop to interrupt, and a separate safety engine decides when coaching must stop. Watch what happens when I add red flags: the model score is not allowed to overrule safety. The route changes from a nudge to a clinician handoff, with the evidence already summarised."

## Script 1: Normal Check-In

1. Open the Patient view.
2. Select Maya Patel.
3. Click Normal.
4. Show medication taken, mild nausea, stable hydration, and the voice-note transcript.
5. Click Generate care moment.
6. Point out the one patient action, the Adherence Twin, the 7-day rescue plan, and the agentic workflow trace.

Talk track:

"This is the boring middle of chronic care. Maya is not in crisis, but she is at the point where side effects and work stress can cause dropout. The AI does not overwhelm her with education. It gives one next action and keeps the long-term trend visible."

## Script 2: Escalation Check-In

1. Open the Patient view.
2. Select Maya Patel.
3. Click Escalation.
4. Show missed medication, high nausea, low hydration, vomiting, worsening pain, and lightheadedness.
5. Click Generate care moment.
6. Switch to the Clinician view.
7. Show the prioritised queue, red-flag summary, suggested async message, and audit trail.
8. Open Safety and show the unsafe medication request being blocked.

Talk track:

"The important thing is that the AI changes mode. This is no longer a coaching moment. The system escalates to clinical review, gives the patient bounded safety language, and gives the clinician the context they need without another real-time appointment."

## Standout Feature Moment

Stay on the Patient view after generating either scenario.

Talk track:

"This is the piece that reframes the problem. The system is not just reading today's symptoms. It builds a patient-specific Adherence Twin, predicts the next likely failure point, and launches a 7-day rescue plan before the patient drops out."

## ML Model Lab Moment

Open Model Lab after the patient check-in.

Talk track:

"This is the technical core. We trained a monotonic adherence-failure model on a synthetic GLP-1 cohort, exported it as JSON, and run inference locally in the browser. The score is reconstructed exactly from a one-percent intercept baseline to the patient probability with signed log-odds contributions. Then we perturb one bounded input at a time to show local stability and distance from the classifier threshold. Projected-gradient constraints prevent correlated features from learning the wrong direction. The sensitivity view is not a confidence interval, and the what-if simulations remain planning assumptions rather than causal treatment effects."

## Scorecard Moment

Open the Scorecard view after the escalation path.

Talk track:

"This maps directly to the judging criteria: patient impact through safer at-home adherence, innovation through an agentic workflow rather than a chatbot, feasibility through deterministic guardrails and clinician oversight, and demo quality through a live normal-to-escalation mode switch."

## Closing Line

"eMed already proves at-home programmes can achieve unusually high adherence. Adherence OS is the next layer: AI that turns home signals into timely support for patients and scalable oversight for clinicians."
