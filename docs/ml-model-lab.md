# ML Model Record

The Model record is the technical spine of Adherence OS. It shows a complete, synthetic machine-learning path:

1. Generate a synthetic GLP-1 chronic-care cohort.
2. Build prospective examples where index week `t` predicts a planned adherence event missed in week `t + 1`.
3. Split by patient into 70% training, 15% validation, and 15% held-out test cohorts.
4. Train one monotonic consensus model plus 16 patient-bootstrap members with NumPy and projected-gradient sign constraints.
5. Select the operating threshold on validation patients for at least 80% recall, then report it unchanged on test patients.
6. Export the models, 0.5th-99.5th percentile training-support bounds, metrics, and parity fixtures as JSON.
7. Run edge inference in the browser and expose the bootstrap 10th-90th percentile model spread only inside training support.
8. Reconstruct a supported consensus score exactly from the intercept and signed standardized feature contributions.
9. When the observed vector is outside synthetic training support, withhold the patient score, attribution, spread, sensitivity, and numeric what-if ranking everywhere in the product.
10. Keep clinical safety decisions outside every model result.

## Model

Target: next-week planned adherence-event interruption risk.

Training artifact: [data/adherence-model.json](../data/adherence-model.json)

Training script: [scripts/train_adherence_model.py](../scripts/train_adherence_model.py)

Run:

```bash
python3 -m pip install -r requirements-model.txt
pnpm train:model
pnpm check:model
```

## Current Synthetic Test Readout

- ROC-AUC: 0.8098.
- AUPRC: 0.5008 against a 16.6% held-out event rate.
- Brier score: 0.1091; Brier skill: 0.2122 against the training-prevalence baseline.
- Recall: 79.6%; precision: 31.6%; review rate: 41.8% at the validation-selected threshold.

These values demonstrate that the code path has synthetic signal. They are not clinical validation, evidence of patient benefit, or a proposed production operating point.

## Demo Talk Track

"The LLM is not guessing risk. A leakage-safe monotonic model predicts a future synthetic adherence event from information available at the current check-in. Sixteen patient-bootstrap members expose model spread, exact log-odds contributions explain the consensus score, and a support gate abstains before the system extrapolates. The deterministic safety engine remains independent and can override the entire coaching path."

## Safety Boundary

The model predicts adherence risk only. It does not diagnose, prescribe, change medication, or make autonomous clinical triage decisions.

The bootstrap spread is model variation inside one authored synthetic cohort. It is shown only for supported patient inputs and is not a confidence interval or clinical uncertainty estimate. The sensitivity range is a separate one-feature-at-a-time stress test and is also withheld outside support. What-if score changes are assumptions, not treatment effects or causal estimates.
