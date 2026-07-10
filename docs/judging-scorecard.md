# Judging Scorecard

## User Impact

Adherence OS helps patients through the hard middle of chronic care: side effects, anxiety, missed doses, confusing home data, and long gaps between appointments. The patient gets one safe next action plus a 7-day rescue plan instead of a wall of generic advice.

## Innovation

The product is not a chatbot. It is an agentic care workflow:

1. Intake Agent structures the patient check-in.
2. Trend Tool calculates longitudinal risk from home data.
3. Risk Agent chooses coaching, watch, review, or urgent mode.
4. Safety Guardrail blocks diagnosis and medication-change advice.
5. Clinician Briefing Agent creates the async handoff.

The Adherence Twin reframes monitoring as pre-emptive rescue: the system predicts the next likely dropout point and intervenes before the patient fails the programme.

The Model Lab adds a real ML spine: synthetic cohort generation, trained edge model, feature contributions, calibration, and explicit what-if score simulations.

## Feasibility

The prototype keeps safety-critical work deterministic where possible, returns structured outputs for the UI, and leaves medical decisions with clinicians. That makes it plausible for a real eMed-style at-home programme.

The ML model runs as browser-side JSON inference over structured features, so a production version could minimise raw data movement and keep clinicians in control.

## Demo Quality

Use two live paths:

1. Normal check-in: mild nausea, medication taken, one supportive next action.
2. Escalation check-in: missed medication, vomiting, low hydration, urgent handoff.

The visible agent trace proves how the workflow changes mode.

Use the unsafe medication-request demo to show the safety guardrail working live.
