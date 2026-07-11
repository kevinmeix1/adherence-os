# Product And ML Glossary

These definitions are the approved language for the demo, README, and judge Q&A.

| Term | Meaning in Adherence OS | Boundary |
|---|---|---|
| Adherence OS | A decision layer for support between at-home chronic-care appointments. | It is a prototype, not a clinical system of record. |
| Adherence-failure risk | The model's estimated probability of an adherence failure in the next seven days. | It predicts programme adherence, not medical deterioration. |
| Adherence Twin | A patient-specific summary of the likely dropout point, active risk drivers, protective factors, and bounded rescue plan. | It is not a biological digital twin and does not simulate disease progression. |
| Edge inference | Logistic-model scoring performed locally in the browser from structured features. | “Edge” describes where inference runs, not a clinically validated device. |
| Feature attribution | The signed contribution of one input to the current model score in standardised log-odds space. | Attribution explains model mechanics; it does not prove a cause. |
| Model baseline | The probability implied by the model intercept before patient-specific feature contributions are added. | It is not a population prevalence estimate. |
| Exact decomposition | The intercept plus all signed feature contributions reconstructs the displayed logistic score. | Exact refers to the calculation, not predictive certainty. |
| Local sensitivity | One input is moved within a bounded synthetic range while others remain fixed. | It is a stress test, not a confidence interval. |
| Bounded what-if | The model is rescored after an explicit support assumption, such as lower routine disruption. | It is a planning comparison, not a causal treatment-effect estimate. |
| Knowledge graph | An in-memory explanation graph linking synthetic context, model signals, support options, safety rules, and handoff. | Edges express the prototype's decision structure, not clinical causality. |
| Centrality | A weighted measure of how connected a node is inside the current explanation graph. | More connected does not mean medically more important. |
| Route ranking | Support options ordered by modelled absolute risk reduction under their explicit assumptions. | Rankings do not prescribe care or medication. |
| Deterministic safety override | Fixed rules that can suppress every coaching route and force clinician handoff independently of ML or generated text. | The prototype rules require clinical governance before real deployment. |
| Structured AI output | Optional OpenAI wording returned in a validated care-plan shape. | Generated wording cannot own risk scoring, diagnosis, medication changes, or escalation. |
| Rules fallback | The complete local care plan used when OpenAI is absent, slow, invalid, or unavailable. | Fallback is a first-class demo mode, not an error-only screen. |
| Calibration | Comparison of average predicted risk with the observed synthetic event rate in score bins. | Synthetic calibration is not evidence of real-world clinical performance. |
| AUC | A ranking metric measuring synthetic discrimination between failure and non-failure rows. | A high synthetic AUC is pipeline evidence, not clinical validation. |
| Brier score | Mean squared error of synthetic predicted probabilities. Lower is better. | It does not establish safety or treatment usefulness. |

## Avoid These Claims

- “The graph proves what caused the patient’s symptoms.”
- “The simulation shows the treatment effect.”
- “The model is clinically validated.”
- “The AI diagnoses the patient or changes medication.”
- “The confidence value is a clinical certainty estimate.”
