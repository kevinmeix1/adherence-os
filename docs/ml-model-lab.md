# ML Model Lab

The Model Lab is the technical spine of Adherence OS. It shows a complete machine-learning path:

1. Generate a synthetic GLP-1 chronic-care cohort.
2. Train a monotonic logistic model with NumPy and projected-gradient sign constraints.
3. Export the model as JSON.
4. Run edge inference in the browser.
5. Reconstruct the current score exactly from the intercept and signed standardized feature contributions.
6. Perturb one bounded feature at a time to show local score sensitivity and distance from the classifier threshold.
7. Rescore explicit what-if intervention assumptions.
8. Map graph nodes to model, simulation, rule, or context provenance.
9. Keep clinical safety decisions outside the model.

## Model

Target: 7-day adherence failure risk.

Training artifact: [data/adherence-model.json](../data/adherence-model.json)

Training script: [scripts/train_adherence_model.py](../scripts/train_adherence_model.py)

Run:

```bash
pnpm train:model
```

## Demo Talk Track

"The LLM is not guessing risk. A monotonic local model trained on synthetic patient-week data scores structured home-care signals. The Model Lab reconstructs the score from its intercept and signed log-odds contributions, then varies one bounded input at a time to show whether the result is locally stable. The graph identifies whether each explanation comes from the model, a bounded simulation, deterministic safety logic, or patient context."

## Safety Boundary

The model predicts adherence risk only. It does not diagnose, prescribe, change medication, or make autonomous clinical triage decisions.

The sensitivity range is not a confidence interval or a measure of clinical uncertainty. It is a transparent one-feature-at-a-time stress test around the current synthetic input.
