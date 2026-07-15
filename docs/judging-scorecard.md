# Judging Scorecard

## User Impact

Adherence OS helps patients through the hard middle of chronic care: side effects, anxiety, missed doses, confusing home data, and long gaps between appointments. The patient gets one bounded next action plus a 7-day support plan instead of a wall of generic advice.

## Innovation

The product is not a chatbot. It is an inspectable decision pipeline:

1. Check-in intake structures the patient report.
2. Trend calculation derives longitudinal context from home data.
3. Local edge ML estimates prospective adherence-interruption risk and exposes bootstrap spread only for supported inputs.
4. A marginal feature-bounds gate withholds every patient-specific ML number when any independent range is exceeded.
5. Deterministic safety rules choose coaching, review, or urgent handoff independently of ML.

The Adherence Twin reframes monitoring as pre-emptive support: it distinguishes the highest-ranked context signal, the largest model contributor, the top tested action, and when safety rules require a human instead.

The Model record adds a real ML spine: prospective synthetic cohort generation, a versioned raw-source contract, patient-isolated evaluation, 16 bootstrap members, exact feature contributions, marginal-bound abstention, and explicit what-if rescoring. A predeclared recent-adherence-only challenger answers why the multivariate model exists: at a common validation recall target it flags 33% rather than 57% of all held-out synthetic rows, with 29% rather than 16% precision. Runtime-gate coverage and selective metrics are reported separately.

## Feasibility

The prototype keeps safety-critical work deterministic where possible, returns structured outputs for the UI, and leaves medical decisions with clinicians. That makes it plausible for a real eMed-style at-home programme.

The ML model runs as browser-side JSON inference over structured features, so a production version could minimise raw data movement and keep clinicians in control. Parity fixtures remain test-only rather than inflating the client bundle, and the enforced home budget retains 3.2 kB of gzip headroom.

## Demo Quality

Use two live paths:

1. Coaching check-in: supported 42% interruption risk, medication recorded, one 16-point bounded planning comparison, and no handoff.
2. Safety check-in: missed medication, vomiting, low hydration, model abstention, and urgent local handoff draft.

The visible decision trace shows how the workflow changes mode; it is not presented as autonomous agency.

Use the unsafe medication-request demo to show the safety guardrail working live.
