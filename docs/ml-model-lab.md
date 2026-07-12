# ML Model Record

The Model record is the technical spine of Adherence OS. It shows a complete, synthetic machine-learning path:

1. Generate a synthetic GLP-1 chronic-care cohort.
2. Build versioned raw sources from two persisted weekly records plus the current check-in, then derive all 14 features through one documented semantic contract.
3. Build prospective examples where index week `t` predicts a planned adherence event missed in week `t + 1`.
4. Split by patient into 70% training, 15% validation, and 15% held-out test cohorts.
5. Train one monotonic consensus model plus 16 patient-bootstrap members with NumPy and projected-gradient sign constraints.
6. Select the operating threshold on validation patients for at least 80% recall, then report it unchanged on test patients.
7. Train a predeclared recent-adherence-only logistic challenger on the same training patients, select its threshold against the same validation recall target, and compare both once on untouched test patients.
8. Export the browser model, raw-source contract version, training-only 0.5th-99.5th percentile marginal bounds, all-row metrics, challenger results, and runtime-gate coverage; keep raw and scoring parity fixtures in a separate test-only JSON file.
9. Run edge inference in the browser and expose the bootstrap 10th-90th percentile model spread only when every marginal bound passes.
10. Reconstruct a supported consensus score exactly from the intercept and signed standardized feature contributions.
11. When any observed feature is missing, non-finite, invalid-binary, or outside its configured marginal bound, withhold the patient score, attribution, spread, sensitivity, and numeric what-if ranking everywhere in the product.
12. Keep clinical safety decisions outside every model result.

## Model

Target: next-week planned adherence-event interruption risk.

Training artifact: [data/adherence-model.json](../data/adherence-model.json)

Test-only scoring fixtures: [data/adherence-model-fixtures.json](../data/adherence-model-fixtures.json)

Training script: [scripts/train_adherence_model.py](../scripts/train_adherence_model.py)

Run:

```bash
python3 -m pip install -r requirements-model.txt
pnpm train:model
pnpm check:model
```

## All-Row Synthetic Test Readout

- ROC-AUC: 0.8328.
- AUPRC: 0.5174 against a 12.6% held-out event rate.
- Brier score: 0.0829; Brier skill: 0.2464 against the training-prevalence baseline.
- Recall: 77.0%; precision: 29.3%; review rate: 32.9% at the validation-selected threshold.

These values demonstrate that the code path has synthetic signal. They are not clinical validation, evidence of patient benefit, or a proposed production operating point.

The selected synthetic operating point is deliberately recall-oriented: it recovers about three in four held-out synthetic interruptions while flagging about one in three test rows, and about three in ten flagged rows are positive. The at-least-80% target was selected on validation patients; the unchanged threshold reaches 77.0% on untouched test patients. These are ungated model metrics over all 1,800 test rows.

## Validation-Matched Challenger

| Untouched synthetic test rows | 14-feature model | Recent-adherence-only |
|---|---:|---:|
| AUPRC | 0.5174 | 0.2370 |
| Recall | 77.0% | 71.2% |
| Precision | 29.3% | 15.8% |
| Rows flagged | 32.9% | 56.6% |

Both logistic models use the same patient-isolated split and select their threshold only on validation patients against the same at-least-80% recall target. The held-out comparison shows that the multivariate synthetic pipeline prioritises fewer rows at higher precision than a lagging adherence-only signal. It does not demonstrate real staffing savings, patient benefit, or clinical validity.

## Runtime-Gate Readout

- Supported coverage: 90.0%, or 1,620 of 1,800 held-out rows.
- Abstention: 10.0%, or 180 rows; 48 held-out events occur in that abstained set.
- Scored-subset AUPRC: 0.4438.
- Scored-subset recall: 73.6%; precision: 26.5%; rows flagged within the scored subset: 30.6%.

The all-row challenger comparison and the runtime-gated readout answer different questions and must not be mixed. The first compares model ranking under a common validation protocol. The second reports what remains after the presentation gate withholds unsupported rows. Neither is a proposed production operating point; both would require clinical, operational, and economic validation.

## Marginal Bounds

The presentation gate requires a complete finite feature vector and checks each feature independently. Continuous features use the training-only 0.5th-99.5th percentile range; binary features must remain in their valid set. Missing, non-finite, invalid-binary, and out-of-range values create typed violations and withhold numeric presentation. Passing this gate means only that no individual value exceeded those configured checks. It does not establish that the full feature combination is plausible, detect joint-distribution or semantic drift, or validate the prediction clinically.

Model support and deterministic safety are evaluated independently. Supported and safety-clear inputs may expose bounded planning comparisons. Unsupported but safety-clear inputs keep the deterministic care plan active but show no patient score, ranked action, or risk-reduction path. Any active safety rule suppresses coaching whether the model is supported or abstains.

The artifact is bound to `adherence-feature-source-v1`. Python training and TypeScript inference both derive recent adherence, recent missed doses, routine disruption, side-effect spike, biomarker changes, and the remaining features from the same documented source fields and time window. Twelve Python-generated raw cases cover six recorded-dose and six missed-dose check-ins and reproduce all 14 TypeScript feature values to `1e-9`; twenty additional rows verify consensus and bootstrap scoring parity. Contract-version drift throws before scoring, and a missing raw value becomes a typed abstention. This is software parity on synthetic fixtures, not retrospective feature validation on real eMed data.

## Demo Talk Track

"The LLM is not guessing risk. A leakage-safe monotonic model predicts a future synthetic adherence event from information available at the current check-in. Sixteen patient-bootstrap members expose model spread, exact log-odds contributions explain the consensus score, and a support gate abstains before the system extrapolates. The deterministic safety engine remains independent and can override the entire coaching path."

## Safety Boundary

The model predicts adherence risk only. It does not diagnose, prescribe, change medication, or make autonomous clinical triage decisions.

The bootstrap spread is model variation inside one authored synthetic cohort. It is shown only when every marginal feature bound passes and is not a confidence interval or clinical uncertainty estimate. The sensitivity range is a separate one-feature-at-a-time stress test: the baseline must pass every marginal bound, and each perturbation is clamped to the same exported training-only range before it is scored. What-if score changes are assumptions, not treatment effects or causal estimates.
