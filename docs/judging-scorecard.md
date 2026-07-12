# Judging Scorecard

## User Impact

Adherence OS helps patients through the hard middle of chronic care: side effects, anxiety, missed doses, confusing home data, and long gaps between appointments. The patient gets one bounded next action plus a 7-day support plan instead of a wall of generic advice.

## Innovation

The product is not a chatbot. It is an inspectable decision pipeline:

1. Check-in intake structures the patient report.
2. Trend calculation derives longitudinal context from home data.
3. Local edge ML estimates prospective adherence-interruption risk and exposes bootstrap spread only for supported inputs.
4. A training-support gate withholds every patient-specific ML number before extrapolation.
5. Deterministic safety rules choose coaching, review, or urgent handoff independently of ML.

The Adherence Twin reframes monitoring as pre-emptive support: it distinguishes the highest-ranked context signal, the largest model contributor, the top tested action, and when safety rules require a human instead.

The Model record adds a real ML spine: prospective synthetic cohort generation, patient-isolated evaluation, 16 bootstrap members, exact feature contributions, support-aware abstention, and explicit what-if rescoring.

## Feasibility

The prototype keeps safety-critical work deterministic where possible, returns structured outputs for the UI, and leaves medical decisions with clinicians. That makes it plausible for a real eMed-style at-home programme.

The ML model runs as browser-side JSON inference over structured features, so a production version could minimise raw data movement and keep clinicians in control.

## Demo Quality

Use two live paths:

1. Normal check-in: mild nausea, medication taken, one supportive next action.
2. Escalation check-in: missed medication, vomiting, low hydration, urgent handoff.

The visible decision trace shows how the workflow changes mode; it is not presented as autonomous agency.

Use the unsafe medication-request demo to show the safety guardrail working live.
