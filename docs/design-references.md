# Product Design References

Adherence OS uses established interaction patterns from successful health products, then applies them to a different problem: preventing chronic-care dropout while keeping clinicians in control. No screens, assets, or copy were reproduced.

## eMed: Low-Friction Care and Escalation

References:

- [eMed weight management platform](https://www.emed.com/us)
- [eMed GLP-1 programme FAQ](https://www.emed.com/join/faq)

Patterns used:

- Weekly check-ins should take less than 60 seconds.
- Side effects can be recorded at home and escalated to a clinician.
- Biomarkers, adherence, progress, and clinical support belong in one continuous programme.
- Licensed clinicians retain treatment and medication decisions.

Adherence OS translation: the patient check-in feeds a live care graph, while deterministic safety rules can override the adherence model and activate a clinician handoff.

## Oura: One Score With Visible Contributors

References:

- [Oura Readiness Score](https://support.ouraring.com/hc/en-us/articles/360025589793-An-Introduction-to-Your-Readiness-Score)
- [Oura Reports](https://support.ouraring.com/hc/en-us/articles/360046061373-Oura-Reports)

Patterns used:

- Lead with one understandable state, then expose the contributing signals.
- Compare short-term context with longer-term trends.
- Make the result shareable with a health professional.

Adherence OS translation: the opening screen leads with one care decision, then lets the user inspect every graph node, relationship, and model contribution behind it.

## Levels: Continuous Signals Become Contextual Insight

References:

- [What Levels is](https://support.levels.com/article/719-what-levels-is)
- [Levels app setup and home screen](https://support.levels.com/article/723-how-to-download-and-set-up-the-levels-app)

Patterns used:

- Put the current signal, recent events, and key insight together.
- Translate complex metabolic data into a specific action.
- Use programmes and goals to create an ongoing loop instead of isolated readings.

Adherence OS translation: symptoms, routine, biomarkers, longitudinal adherence, and simulated interventions are connected in one decision evidence graph.

## Apple Health: Highlights, Trends, and Medication Logging

References:

- [Apple Health highlights and trends](https://support.apple.com/en-euro/guide/iphone/iphe3d379c32/26/ios/26)
- [Medication tracking in Apple Health](https://support.apple.com/en-gb/guide/iphone/iph811670c81/ios)

Patterns used:

- Surface meaningful changes instead of displaying every available data point.
- Keep medication logging simple and familiar.
- Treat health trends as context for professional judgement, not a diagnosis.

Adherence OS translation: four decision metrics summarise the current state, while the graph and Model Lab preserve the underlying evidence.

## Original Product Position

The resulting interface is a care command centre rather than a wellness dashboard. Its central interaction is a dual-track decision:

1. The edge model estimates near-term adherence failure risk.
2. Deterministic safety rules independently evaluate red flags.
3. The stricter path wins.
4. The knowledge graph explains the evidence and possible intervention route.
5. A clinician owns assessment and treatment changes.
