import argparse
import json
import math
from pathlib import Path

import numpy as np


SEED = 42
N_PATIENTS = 1200
N_WEEKS = 10
TRAIN_RATIO = 0.78
L2 = 0.018
LR = 0.18
EPOCHS = 1800
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "adherence-model.json"


FEATURES = [
    ("week", "Programme week"),
    ("adherence_last_2wk", "Recent adherence"),
    ("missed_doses_2wk", "Missed doses in last 2 weeks"),
    ("nausea_score", "Nausea burden"),
    ("hydration_risk", "Low hydration risk"),
    ("energy_risk", "Low energy risk"),
    ("appetite_suppression", "Low appetite"),
    ("weight_loss_pct", "Weight loss from baseline"),
    ("hba1c_delta", "HbA1c change"),
    ("systolic_bp", "Systolic blood pressure"),
    ("routine_disruption", "Routine disruption"),
    ("side_effect_spike", "Side-effect spike"),
    ("prior_failure", "Prior adherence failure"),
    ("mood_anxious", "Anxious or discouraged mood"),
]


# Directional constraints keep correlated synthetic features from learning
# clinically implausible signs while still allowing a coefficient to shrink to zero.
SIGN_CONSTRAINTS = {
    "week": 1,
    "adherence_last_2wk": -1,
    "missed_doses_2wk": 1,
    "nausea_score": 1,
    "hydration_risk": 1,
    "energy_risk": 1,
    "appetite_suppression": 1,
    "weight_loss_pct": -1,
    "hba1c_delta": 1,
    "systolic_bp": 1,
    "routine_disruption": 1,
    "side_effect_spike": 1,
    "prior_failure": 1,
    "mood_anxious": 1,
}


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -35, 35)))


def make_synthetic_cohort():
    rng = np.random.default_rng(SEED)
    rows = []

    for patient_id in range(N_PATIENTS):
        baseline_weight = rng.normal(96, 15)
        baseline_hba1c = rng.normal(6.5, 0.9)
        baseline_bp = rng.normal(132, 13)
        nausea_sensitivity = rng.beta(2.2, 4.8)
        routine_fragility = rng.beta(2.6, 3.2)
        support_response = rng.beta(4.2, 2.6)
        prior_failure = 0
        weight = baseline_weight
        hba1c = baseline_hba1c
        recent_adherence = 100.0
        previous_nausea = rng.uniform(1, 4)

        for week in range(1, N_WEEKS + 1):
            dose_step = 1 if week in (5, 9) else 0
            routine_disruption = np.clip(
                rng.beta(2, 5) + 0.24 * routine_fragility + rng.normal(0, 0.06),
                0,
                1,
            )
            nausea = np.clip(
                1.2
                + 5.8 * nausea_sensitivity
                + 1.25 * dose_step
                + 1.1 * routine_disruption
                + rng.normal(0, 1.1),
                0,
                10,
            )
            hydration = np.clip(
                8.6 - 0.45 * nausea - 1.25 * routine_disruption + rng.normal(0, 1.0),
                0,
                10,
            )
            energy = np.clip(
                7.2 - 0.28 * nausea - 1.0 * routine_disruption + rng.normal(0, 0.9),
                0,
                10,
            )
            appetite = np.clip(
                8.0 - 0.55 * nausea - 0.35 * week + rng.normal(0, 1.0),
                0,
                10,
            )
            side_effect_spike = max(0, nausea - previous_nausea)
            mood_anxious = float(
                rng.random()
                < sigmoid(-2.0 + 0.35 * nausea + 1.8 * routine_disruption + 0.8 * prior_failure)
            )

            latent = (
                -4.15
                + 0.11 * week
                - 0.026 * recent_adherence
                + 0.37 * prior_failure
                + 0.34 * nausea
                + 0.42 * max(0, 4 - hydration)
                + 0.16 * max(0, 5 - energy)
                + 1.15 * routine_disruption
                + 0.26 * side_effect_spike
                + 0.34 * mood_anxious
                - 0.82 * support_response
            )
            failure_prob = sigmoid(latent)
            failure = float(rng.random() < failure_prob)
            missed_doses_2wk = np.clip(
                rng.poisson(max(0.05, 0.35 + 2.1 * failure_prob + 0.9 * prior_failure)),
                0,
                7,
            )
            adherence = np.clip(100 - missed_doses_2wk * 7.2 - 16 * failure + rng.normal(0, 4.0), 35, 100)
            recent_adherence = 0.58 * recent_adherence + 0.42 * adherence
            weight = weight - max(0.05, rng.normal(0.52, 0.22)) * (adherence / 100)
            hba1c = hba1c - 0.035 * (adherence / 100) + rng.normal(0, 0.015)
            systolic_bp = baseline_bp - 0.22 * (baseline_weight - weight) + rng.normal(0, 4.5)
            weight_loss_pct = (baseline_weight - weight) / baseline_weight * 100

            rows.append(
                {
                    "patient_id": patient_id,
                    "week": week,
                    "adherence_last_2wk": recent_adherence,
                    "missed_doses_2wk": missed_doses_2wk,
                    "nausea_score": nausea,
                    "hydration_risk": max(0, 10 - hydration),
                    "energy_risk": max(0, 10 - energy),
                    "appetite_suppression": max(0, 10 - appetite),
                    "weight_loss_pct": weight_loss_pct,
                    "hba1c_delta": hba1c - baseline_hba1c,
                    "systolic_bp": systolic_bp,
                    "routine_disruption": routine_disruption,
                    "side_effect_spike": side_effect_spike,
                    "prior_failure": prior_failure,
                    "mood_anxious": mood_anxious,
                    "target": failure,
                }
            )

            prior_failure = failure
            previous_nausea = nausea

    return rows


def auc_score(y_true, y_score):
    order = np.argsort(y_score)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, len(y_score) + 1)
    positive = y_true == 1
    n_pos = positive.sum()
    n_neg = len(y_true) - n_pos
    rank_sum = ranks[positive].sum()
    return float((rank_sum - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def calibration_bins(y_true, y_score, bins=8):
    edges = np.linspace(0, 1, bins + 1)
    out = []
    for i in range(bins):
        lo, hi = edges[i], edges[i + 1]
        mask = (y_score >= lo) & (y_score < hi if i < bins - 1 else y_score <= hi)
        if mask.sum() == 0:
            continue
        out.append(
            {
                "bin": f"{lo:.2f}-{hi:.2f}",
                "count": int(mask.sum()),
                "predicted": round(float(y_score[mask].mean()), 4),
                "observed": round(float(y_true[mask].mean()), 4),
            }
        )
    return out


def train_model(rows):
    feature_names = [name for name, _ in FEATURES]
    x = np.array([[row[name] for name in feature_names] for row in rows], dtype=float)
    y = np.array([row["target"] for row in rows], dtype=float)
    patient_ids = np.array([row["patient_id"] for row in rows])
    train_patients = set(range(int(N_PATIENTS * TRAIN_RATIO)))
    train_mask = np.array([patient_id in train_patients for patient_id in patient_ids])

    x_train, y_train = x[train_mask], y[train_mask]
    x_test, y_test = x[~train_mask], y[~train_mask]
    mean = x_train.mean(axis=0)
    std = x_train.std(axis=0)
    std[std < 1e-6] = 1
    x_train_z = (x_train - mean) / std
    x_test_z = (x_test - mean) / std

    weights = np.zeros(x_train_z.shape[1])
    intercept = np.log(y_train.mean() / (1 - y_train.mean()))

    for _ in range(EPOCHS):
        pred = sigmoid(x_train_z @ weights + intercept)
        error = pred - y_train
        grad_w = x_train_z.T @ error / len(x_train_z) + L2 * weights
        grad_b = error.mean()
        weights -= LR * grad_w
        for idx, (name, _) in enumerate(FEATURES):
            direction = SIGN_CONSTRAINTS.get(name)
            if direction == 1:
                weights[idx] = max(0.0, weights[idx])
            elif direction == -1:
                weights[idx] = min(0.0, weights[idx])
        intercept -= LR * grad_b

    test_pred = sigmoid(x_test_z @ weights + intercept)
    threshold = 0.35
    predicted_positive = test_pred >= threshold
    actual_positive = y_test == 1
    tp = int(np.logical_and(predicted_positive, actual_positive).sum())
    fp = int(np.logical_and(predicted_positive, ~actual_positive).sum())
    fn = int(np.logical_and(~predicted_positive, actual_positive).sum())
    tn = int(np.logical_and(~predicted_positive, ~actual_positive).sum())

    metrics = {
        "samples": int(len(rows)),
        "patients": N_PATIENTS,
        "trainPatients": int(N_PATIENTS * TRAIN_RATIO),
        "testPatients": int(N_PATIENTS - int(N_PATIENTS * TRAIN_RATIO)),
        "positiveRate": round(float(y.mean()), 4),
        "testAuc": round(auc_score(y_test, test_pred), 4),
        "testBrier": round(float(((test_pred - y_test) ** 2).mean()), 4),
        "threshold": threshold,
        "precisionAtThreshold": round(tp / max(tp + fp, 1), 4),
        "recallAtThreshold": round(tp / max(tp + fn, 1), 4),
        "confusionMatrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "calibration": calibration_bins(y_test, test_pred),
    }

    return {
        "version": "2026-07-10-edge-logistic-monotonic-v2",
        "modelType": "monotonic standardized logistic regression",
        "target": "7-day adherence failure risk",
        "trainedAt": "2026-07-10",
        "cohort": {
            "patients": N_PATIENTS,
            "weeksPerPatient": N_WEEKS,
            "rows": len(rows),
            "generationSeed": SEED,
            "description": "Synthetic GLP-1 metabolic care cohort with adherence, symptoms, biomarkers, routine disruption and clinician escalation labels.",
        },
        "features": [
            {
                "name": name,
                "label": label,
                "mean": round(float(mean[idx]), 6),
                "std": round(float(std[idx]), 6),
                "weight": round(float(weights[idx]), 6),
            }
            for idx, (name, label) in enumerate(FEATURES)
        ],
        "intercept": round(float(intercept), 6),
        "constraints": {
            "method": "projected gradient descent",
            "featureDirections": {
                name: "increases risk" if direction == 1 else "decreases risk"
                for name, direction in SIGN_CONSTRAINTS.items()
            },
        },
        "metrics": metrics,
        "modelCard": {
            "intendedUse": "Rank short-term adherence-failure risk and guide supportive intervention selection in a supervised chronic-care workflow.",
            "notFor": "Diagnosis, medication decisions, autonomous clinical triage, or use without clinician-approved safety rules.",
            "edgeInference": "The exported JSON model runs locally in the browser over structured features; raw free text is not needed for the risk score.",
            "explainability": "The score is exactly decomposed into an intercept plus standardized feature contributions in log-odds space.",
            "limitations": [
                "Synthetic data demonstrates the ML pipeline; real deployment would need retrospective validation on eMed outcomes.",
                "Prediction is calibrated for adherence risk, not medical safety risk.",
                "Clinician review remains required for red-flag symptoms and medication questions.",
            ],
        },
    }


def compare_reproduction(expected, actual, path="modelData", errors=None):
    if errors is None:
        errors = []

    if type(expected) is not type(actual):
        errors.append(f"{path}: expected {type(expected).__name__}, got {type(actual).__name__}")
        return errors

    if isinstance(expected, dict):
        if expected.keys() != actual.keys():
            missing = sorted(expected.keys() - actual.keys())
            extra = sorted(actual.keys() - expected.keys())
            errors.append(f"{path}: key mismatch (missing={missing}, extra={extra})")
            return errors
        for key in expected:
            compare_reproduction(expected[key], actual[key], f"{path}.{key}", errors)
    elif isinstance(expected, list):
        if len(expected) != len(actual):
            errors.append(f"{path}: expected {len(expected)} items, got {len(actual)}")
            return errors
        for index, (expected_item, actual_item) in enumerate(zip(expected, actual)):
            compare_reproduction(expected_item, actual_item, f"{path}[{index}]", errors)
    elif isinstance(expected, float):
        tolerance = 1e-9 if path.startswith("modelData.sampleRows") else 1e-6
        if not math.isclose(expected, actual, rel_tol=tolerance, abs_tol=tolerance):
            errors.append(f"{path}: expected {expected}, got {actual}")
    elif expected != actual:
        errors.append(f"{path}: expected {expected!r}, got {actual!r}")

    return errors


def parse_args():
    parser = argparse.ArgumentParser(description="Train the deterministic synthetic adherence model.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Retrain in memory and fail if the checked-in artifact has drifted.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Artifact path to write or compare (defaults to data/adherence-model.json).",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    rows = make_synthetic_cohort()
    artifact = train_model(rows)
    sample_rows = [{key: float(value) if isinstance(value, np.floating) else int(value) if isinstance(value, np.integer) else value for key, value in row.items()} for row in rows[:16]]
    output = {"artifact": artifact, "sampleRows": sample_rows}

    if args.check:
        if not args.output.exists():
            raise SystemExit(f"model check failed: {args.output} does not exist")
        expected = json.loads(args.output.read_text(encoding="utf-8"))
        errors = compare_reproduction(expected, output)
        if errors:
            details = "\n".join(f"- {error}" for error in errors[:12])
            remaining = len(errors) - 12
            suffix = f"\n- ...and {remaining} more differences" if remaining > 0 else ""
            raise SystemExit(f"model check failed with {len(errors)} difference(s):\n{details}{suffix}")
        print(
            f"model check passed | version={artifact['version']} "
            f"auc={artifact['metrics']['testAuc']} brier={artifact['metrics']['testBrier']}"
        )
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(
        f"wrote {args.output} | auc={artifact['metrics']['testAuc']} "
        f"brier={artifact['metrics']['testBrier']} samples={artifact['metrics']['samples']}"
    )


if __name__ == "__main__":
    main()
