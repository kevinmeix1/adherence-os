# Product And ML Glossary

These definitions are the approved language for the demo, README, and judge Q&A.

| Term | Meaning in Adherence OS | Boundary |
|---|---|---|
| Adherence OS | A decision layer for support between at-home chronic-care appointments. | It is a prototype, not a clinical system of record. |
| Adherence-interruption risk | The consensus model's synthetic estimate that the next planned weekly adherence event will be missed. | It predicts an authored programme event, not dropout or medical deterioration. |
| Adherence Twin | A patient-specific presentation of context signals, model contributors, protective factors, and tested actions. | Its failure-point text is heuristic; it is not a biological digital twin or disease simulation. |
| Context signal | The highest-ranked inspectable graph context under authored node and edge weights. | It describes graph connectivity, not model attribution, medical importance, or causality. |
| Model contributor | A structured feature's signed contribution to the current supported model score. | It explains model mechanics; it does not identify a clinical cause. |
| Tested action | A bounded support assumption rescored by the same model and compared with other supported assumptions. | It is a planning comparison, not a recommendation or treatment-effect estimate. |
| Edge inference | Logistic-model scoring performed locally in the browser from structured features. | “Edge” describes where inference runs, not a clinically validated device. |
| Feature attribution | The signed contribution of one input to the current model score in standardised log-odds space. | Attribution explains model mechanics; it does not prove a cause. |
| Model baseline | The probability implied by the model intercept before patient-specific feature contributions are added. | It is not a population prevalence estimate. |
| Exact decomposition | The intercept plus all signed feature contributions reconstructs the displayed logistic score. | Exact refers to the calculation, not predictive certainty. |
| Local sensitivity | One input is moved within a bounded synthetic range while others remain fixed. | It is a stress test, not a confidence interval. |
| Bootstrap model spread | The 10th-90th percentile of scores from 16 patient-bootstrap models. | It describes model variation in one synthetic cohort, not clinical uncertainty or calibrated confidence. |
| Training support | Training-only 0.5th-99.5th percentile feature bounds used to detect extrapolation. | Outside-support status withholds patient score, attribution, spread, sensitivity, and ranking; it does not classify clinical severity. |
| Bounded what-if | The model is rescored after an explicit support assumption, such as lower routine disruption. | It is a planning comparison, not a causal treatment-effect estimate. |
| Knowledge graph | An in-memory explanation graph linking synthetic context, model signals, support options, safety rules, and handoff. | Edges express the prototype's decision structure, not clinical causality. |
| Centrality | A weighted measure of how connected a node is inside the current explanation graph. | More connected does not mean medically more important. |
| Tested-action ranking | Supported options ordered by scenario-score change under explicit feature assumptions. | Rankings are disabled outside training support and do not estimate treatment effects or prescribe care. |
| Deterministic safety override | Fixed rules that can suppress every tested action and force clinician handoff independently of ML or generated text. | The prototype rules require clinical governance before real deployment. |
| Structured AI output | Optional OpenAI output returned in a validated care-plan shape. | The current MVP discards provider wording and recomputes the complete deterministic plan. |
| Rules fallback | The complete local care plan used when OpenAI is absent, slow, invalid, or unavailable. | Fallback is a first-class demo mode, not an error-only screen. |
| Calibration | Comparison of average predicted risk with the observed synthetic event rate in score bins. | Synthetic calibration is not evidence of real-world clinical performance. |
| AUC | A ranking metric measuring synthetic discrimination between failure and non-failure rows. | A high synthetic AUC is pipeline evidence, not clinical validation. |
| AUPRC | Area under the precision-recall curve, reported against the held-out synthetic event rate. | It is more informative for the minority event but still synthetic-only evidence. |
| Brier score | Mean squared error of synthetic predicted probabilities. Lower is better. | It does not establish safety or treatment usefulness. |

## Avoid These Claims

- “The graph proves what caused the patient’s symptoms.”
- “The simulation shows the treatment effect.”
- “The model is clinically validated.”
- “The AI diagnoses the patient or changes medication.”
- “The confidence value is a clinical certainty estimate.”
