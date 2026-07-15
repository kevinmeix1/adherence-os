import argparse
import json
import math
import re
from pathlib import Path

import numpy as np


SEED = 42
N_PATIENTS = 1200
N_WEEKS = 10
TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15
ENSEMBLE_MEMBERS = 16
TARGET_RECALL = 0.80
L2 = 0.018
LEARNING_RATE = 0.24
MAX_ITERATIONS = 110
CONVERGENCE_TOLERANCE = 1e-6
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "adherence-model.json"
DEFAULT_FIXTURE_OUTPUT = PROJECT_ROOT / "data" / "adherence-model-fixtures.json"
FEATURE_CONTRACT_VERSION = "adherence-feature-source-v1"


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


def engineer_model_features(source):
    if source.get("contractVersion") != FEATURE_CONTRACT_VERSION:
        raise ValueError(
            f"expected feature contract {FEATURE_CONTRACT_VERSION}, "
            f"received {source.get('contractVersion')!r}"
        )

    check_in = source["checkIn"]
    text = f"{check_in['freeText']} {check_in['sideEffects']}".lower()
    routine_disruption = (
        0.44 * bool(re.search(r"work|shift|travel|busy|hectic|forgot|missed", text))
        + 0.22
        * any(re.search(r"shift|travel", factor, flags=re.IGNORECASE) for factor in source["riskFactors"])
        + 0.28 * (not check_in["medicationTaken"])
    )
    acute_symptom_mentioned = bool(re.search(r"vomit|lightheaded|pain|worse", text))
    mood_anxious = bool(
        re.search(
            r"anxious|discouraged|worried|frustrated|tired",
            f"{check_in['mood'].lower()} {text}",
        )
    )
    recent_adherence = sum(week["adherencePct"] for week in source["recentWeeks"]) / len(
        source["recentWeeks"]
    )
    recent_missed_doses = sum(
        max(0, week["dosesExpected"] - week["dosesTaken"])
        for week in source["recentWeeks"]
    )
    baseline_weight = source["baselineWeightKg"]
    current_weight = source["currentWeightKg"]
    weight_loss_pct = (
        max(0, (baseline_weight - current_weight) / baseline_weight * 100)
        if math.isfinite(baseline_weight) and baseline_weight > 0 and math.isfinite(current_weight)
        else math.nan
    )
    baseline_hba1c = source["baselineHba1cPct"]
    current_hba1c = source["currentHba1cPct"]
    hba1c_delta = (
        current_hba1c - baseline_hba1c
        if isinstance(current_hba1c, (int, float)) and isinstance(baseline_hba1c, (int, float))
        else math.nan
    )
    current_systolic = source["currentSystolicBp"]
    baseline_systolic = source["baselineSystolicBp"]
    systolic_bp = (
        current_systolic
        if isinstance(current_systolic, (int, float))
        else baseline_systolic
        if isinstance(baseline_systolic, (int, float))
        else math.nan
    )

    return {
        "week": source["week"],
        "adherence_last_2wk": recent_adherence,
        "missed_doses_2wk": recent_missed_doses,
        "nausea_score": check_in["nauseaScore"],
        "hydration_risk": max(0, 10 - check_in["hydrationScore"]),
        "energy_risk": max(0, 10 - check_in["energyScore"]),
        "appetite_suppression": max(0, 10 - check_in["appetiteScore"]),
        "weight_loss_pct": weight_loss_pct,
        "hba1c_delta": hba1c_delta,
        "systolic_bp": systolic_bp,
        "routine_disruption": min(1, routine_disruption + 0.18 * acute_symptom_mentioned),
        "side_effect_spike": max(
            0,
            check_in["nauseaScore"]
            - source["previousNauseaScore"]
            + 0.8 * acute_symptom_mentioned,
        ),
        "prior_failure": float(not check_in["medicationTaken"]),
        "mood_anxious": float(mood_anxious),
    }


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
        weight = baseline_weight
        hba1c = baseline_hba1c
        weekly_history = [
            {"adherencePct": 100.0, "dosesTaken": 1.0, "dosesExpected": 1.0, "nauseaScore": 2.0},
            {"adherencePct": 100.0, "dosesTaken": 1.0, "dosesExpected": 1.0, "nauseaScore": 2.5},
        ]
        current_missed_dose = 0.0
        schedule_risk_known = routine_fragility >= 0.46

        for week in range(1, N_WEEKS + 1):
            current_adherence = np.clip(
                100 - 24 * current_missed_dose + rng.normal(0, 3.5),
                55,
                100,
            )

            # These updates use the adherence event already observed in index week t.
            # The target sampled below is the planned dose missed in week t + 1 and
            # cannot influence this row's feature vector.
            weight = weight - max(0.05, rng.normal(0.52, 0.22)) * (current_adherence / 100)
            hba1c = hba1c - 0.035 * (current_adherence / 100) + rng.normal(0, 0.015)
            systolic_bp = baseline_bp - 0.22 * (baseline_weight - weight) + rng.normal(0, 4.5)
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
            mood_anxious = bool(
                rng.random()
                < sigmoid(-2.0 + 0.35 * nausea + 1.8 * routine_disruption + 0.8 * current_missed_dose)
            )
            routine_mentioned = bool(rng.random() < np.clip(0.06 + 0.78 * routine_disruption, 0, 0.92))
            acute_symptom_mentioned = bool(rng.random() < np.clip(0.02 + 0.09 * max(0, nausea - 4), 0, 0.58))
            free_text_parts = ["Work has been hectic" if routine_mentioned else "Routine has been steady"]
            if acute_symptom_mentioned:
                free_text_parts.append("the pain feels worse")
            source = {
                "contractVersion": FEATURE_CONTRACT_VERSION,
                "week": week,
                "recentWeeks": [
                    {
                        "adherencePct": history_week["adherencePct"],
                        "dosesTaken": history_week["dosesTaken"],
                        "dosesExpected": history_week["dosesExpected"],
                    }
                    for history_week in weekly_history
                ],
                "previousNauseaScore": weekly_history[-1]["nauseaScore"],
                "baselineWeightKg": baseline_weight,
                "currentWeightKg": weight,
                "baselineHba1cPct": baseline_hba1c,
                "currentHba1cPct": hba1c,
                "baselineSystolicBp": baseline_bp,
                "currentSystolicBp": systolic_bp,
                "riskFactors": ["Shift work"] if schedule_risk_known else ["Stable routine"],
                "checkIn": {
                    "medicationTaken": not bool(current_missed_dose),
                    "nauseaScore": nausea,
                    "hydrationScore": hydration,
                    "energyScore": energy,
                    "appetiteScore": appetite,
                    "mood": "worried" if mood_anxious else "steady",
                    "freeText": "; ".join(free_text_parts),
                    "sideEffects": "lightheaded" if acute_symptom_mentioned else "No severe symptoms reported",
                },
            }
            features = engineer_model_features(source)

            latent = (
                -3.75
                + 0.10 * (features["week"] - 1)
                - 0.035 * (features["adherence_last_2wk"] - 90)
                + 0.55 * features["missed_doses_2wk"]
                + 0.30 * (features["nausea_score"] - 3)
                + 0.35 * max(0, features["hydration_risk"] - 3)
                + 0.16 * max(0, features["energy_risk"] - 4)
                + 0.08 * (features["appetite_suppression"] - 4)
                - 0.06 * features["weight_loss_pct"]
                + 0.25 * features["hba1c_delta"]
                + 0.005 * (features["systolic_bp"] - 130)
                + 1.15 * features["routine_disruption"]
                + 0.26 * features["side_effect_spike"]
                + 0.55 * features["prior_failure"]
                + 0.34 * features["mood_anxious"]
                - 0.55 * support_response
            )
            next_week_missed_dose = float(rng.random() < sigmoid(latent))

            rows.append(
                {
                    "patient_id": patient_id,
                    "outcome_week": week + 1,
                    **features,
                    "target": next_week_missed_dose,
                    "_feature_source": source,
                }
            )

            weekly_history = [
                weekly_history[-1],
                {
                    "adherencePct": float(current_adherence),
                    "dosesTaken": float(not bool(current_missed_dose)),
                    "dosesExpected": 1.0,
                    "nauseaScore": float(nausea),
                },
            ]
            current_missed_dose = next_week_missed_dose

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


def average_precision(y_true, y_score):
    order = np.argsort(-y_score)
    ordered = y_true[order]
    positives = ordered.sum()
    if positives == 0:
        return 0.0
    cumulative = np.cumsum(ordered)
    precision = cumulative / np.arange(1, len(ordered) + 1)
    return float(precision[ordered == 1].sum() / positives)


def confusion_at_threshold(y_true, y_score, threshold):
    predicted_positive = y_score >= threshold
    actual_positive = y_true == 1
    return {
        "tp": int(np.logical_and(predicted_positive, actual_positive).sum()),
        "fp": int(np.logical_and(predicted_positive, ~actual_positive).sum()),
        "fn": int(np.logical_and(~predicted_positive, actual_positive).sum()),
        "tn": int(np.logical_and(~predicted_positive, ~actual_positive).sum()),
    }


def operating_metrics(matrix):
    precision = matrix["tp"] / max(matrix["tp"] + matrix["fp"], 1)
    recall = matrix["tp"] / max(matrix["tp"] + matrix["fn"], 1)
    review_rate = (matrix["tp"] + matrix["fp"]) / max(sum(matrix.values()), 1)
    return precision, recall, review_rate


def select_recall_threshold(y_true, y_score, target_recall=TARGET_RECALL):
    candidates = np.unique(y_score)
    eligible = []
    for threshold in candidates:
        matrix = confusion_at_threshold(y_true, y_score, threshold)
        precision, recall, review_rate = operating_metrics(matrix)
        if recall >= target_recall:
            eligible.append((precision, threshold, recall, review_rate))

    if not eligible:
        return float(np.min(y_score))

    return float(max(item[1] for item in eligible))


def train_logistic(x, y, mean, std, feature_names=None):
    feature_names = feature_names or [name for name, _ in FEATURES]
    x_z = (x - mean) / std
    weights = np.zeros(x_z.shape[1])
    prevalence = np.clip(y.mean(), 1e-6, 1 - 1e-6)
    intercept = np.log(prevalence / (1 - prevalence))

    for _ in range(MAX_ITERATIONS):
        pred = sigmoid(x_z @ weights + intercept)
        error = pred - y
        grad_w = x_z.T @ error / len(x_z) + L2 * weights
        grad_b = error.mean()
        weights -= LEARNING_RATE * grad_w
        intercept -= LEARNING_RATE * grad_b
        for idx, name in enumerate(feature_names):
            direction = SIGN_CONSTRAINTS.get(name)
            if direction == 1:
                weights[idx] = max(0.0, weights[idx])
            elif direction == -1:
                weights[idx] = min(0.0, weights[idx])
        if max(abs(grad_b), float(np.max(np.abs(grad_w)))) < CONVERGENCE_TOLERANCE:
            break

    return weights, float(intercept)


def score_matrix(x, mean, std, weights, intercept):
    return sigmoid(((x - mean) / std) @ weights + intercept)


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


def train_recent_adherence_challenger(
    x,
    y,
    train_mask,
    validation_mask,
    test_mask,
    feature_names,
):
    challenger_name = "adherence_last_2wk"
    feature_index = feature_names.index(challenger_name)
    challenger_x = x[:, [feature_index]]
    challenger_train = challenger_x[train_mask]
    mean = challenger_train.mean(axis=0)
    std = challenger_train.std(axis=0)
    std[std < 1e-6] = 1
    weights, intercept = train_logistic(
        challenger_train,
        y[train_mask],
        mean,
        std,
        [challenger_name],
    )
    validation_pred = score_matrix(challenger_x[validation_mask], mean, std, weights, intercept)
    test_pred = score_matrix(challenger_x[test_mask], mean, std, weights, intercept)
    threshold = select_recall_threshold(y[validation_mask], validation_pred)
    validation_matrix = confusion_at_threshold(y[validation_mask], validation_pred, threshold)
    validation_precision, validation_recall, validation_review_rate = operating_metrics(validation_matrix)
    test_matrix = confusion_at_threshold(y[test_mask], test_pred, threshold)
    test_precision, test_recall, test_review_rate = operating_metrics(test_matrix)

    return {
        "name": "Recent-adherence-only",
        "featureNames": [challenger_name],
        "comparison": "Validation-matched logistic challenger using the same patient split and recall target.",
        "threshold": round(threshold, 6),
        "testAuprc": round(average_precision(y[test_mask], test_pred), 4),
        "precisionAtThreshold": round(test_precision, 4),
        "recallAtThreshold": round(test_recall, 4),
        "reviewRateAtThreshold": round(test_review_rate, 4),
        "confusionMatrix": test_matrix,
        "thresholdSelection": {
            "method": "highest validation threshold with recall at or above target",
            "targetRecall": TARGET_RECALL,
            "validationPrecision": round(validation_precision, 4),
            "validationRecall": round(validation_recall, 4),
            "validationReviewRate": round(validation_review_rate, 4),
        },
    }


def evaluate_support_gate(x_test, y_test, test_pred, threshold, exported_features):
    supported = np.ones(len(x_test), dtype=bool)
    for index, feature in enumerate(exported_features):
        values = x_test[:, index]
        feature_supported = (values >= feature["support"]["low"]) & (
            values <= feature["support"]["high"]
        )
        if feature["support"]["kind"] == "binary":
            feature_supported &= np.isin(values, [0, 1])
        supported &= feature_supported

    supported_rows = int(supported.sum())
    abstained_rows = int((~supported).sum())
    supported_y = y_test[supported]
    supported_pred = test_pred[supported]
    supported_matrix = confusion_at_threshold(supported_y, supported_pred, threshold)
    supported_precision, supported_recall, supported_review_rate = operating_metrics(supported_matrix)
    total_events = int(y_test.sum())
    supported_events = int(supported_y.sum())
    abstained_events = total_events - supported_events

    return {
        "method": "Training-only marginal bounds applied unchanged to held-out synthetic rows.",
        "testRows": int(len(x_test)),
        "supportedRows": supported_rows,
        "abstainedRows": abstained_rows,
        "coverage": round(supported_rows / len(x_test), 4),
        "abstentionRate": round(abstained_rows / len(x_test), 4),
        "supportedEventCoverage": round(supported_events / max(total_events, 1), 4),
        "abstainedEvents": abstained_events,
        "abstainedEventRate": round(abstained_events / max(abstained_rows, 1), 4),
        "testAuprc": round(average_precision(supported_y, supported_pred), 4),
        "precisionAtThreshold": round(supported_precision, 4),
        "recallAtThreshold": round(supported_recall, 4),
        "reviewRateAtThreshold": round(supported_review_rate, 4),
        "confusionMatrix": supported_matrix,
    }


def train_model(rows):
    feature_names = [name for name, _ in FEATURES]
    x = np.array([[row[name] for name in feature_names] for row in rows], dtype=float)
    y = np.array([row["target"] for row in rows], dtype=float)
    patient_ids = np.array([row["patient_id"] for row in rows])
    train_count = int(N_PATIENTS * TRAIN_RATIO)
    validation_count = int(N_PATIENTS * VALIDATION_RATIO)
    validation_end = train_count + validation_count
    train_mask = patient_ids < train_count
    validation_mask = (patient_ids >= train_count) & (patient_ids < validation_end)
    test_mask = patient_ids >= validation_end

    x_train, y_train = x[train_mask], y[train_mask]
    x_validation, y_validation = x[validation_mask], y[validation_mask]
    x_test, y_test = x[test_mask], y[test_mask]
    mean = x_train.mean(axis=0)
    std = x_train.std(axis=0)
    std[std < 1e-6] = 1
    weights, intercept = train_logistic(x_train, y_train, mean, std, feature_names)
    validation_pred = score_matrix(x_validation, mean, std, weights, intercept)
    test_pred = score_matrix(x_test, mean, std, weights, intercept)
    threshold = select_recall_threshold(y_validation, validation_pred)
    validation_matrix = confusion_at_threshold(y_validation, validation_pred, threshold)
    validation_precision, validation_recall, validation_review_rate = operating_metrics(validation_matrix)
    test_matrix = confusion_at_threshold(y_test, test_pred, threshold)
    test_precision, test_recall, test_review_rate = operating_metrics(test_matrix)

    bootstrap_rng = np.random.default_rng(SEED + 101)
    train_patient_ids = np.arange(train_count)
    ensemble_members = []
    for member_index in range(ENSEMBLE_MEMBERS):
        sampled_patients = bootstrap_rng.choice(train_patient_ids, size=train_count, replace=True)
        sampled_indices = (
            sampled_patients[:, None] * N_WEEKS + np.arange(N_WEEKS)[None, :]
        ).reshape(-1)
        member_weights, member_intercept = train_logistic(
            x[sampled_indices],
            y[sampled_indices],
            mean,
            std,
            feature_names,
        )
        ensemble_members.append(
            {
                "id": f"bootstrap-{member_index + 1:02d}",
                "intercept": round(member_intercept, 6),
                "weights": [round(float(value), 6) for value in member_weights],
            }
        )

    train_prevalence = float(y_train.mean())
    baseline_brier = float(((train_prevalence - y_test) ** 2).mean())
    test_brier = float(((test_pred - y_test) ** 2).mean())
    test_auprc = average_precision(y_test, test_pred)
    brier_skill = 1 - test_brier / baseline_brier
    claim_status = (
        "synthetic-skill-demonstrated"
        if test_auprc > float(y_test.mean()) and brier_skill > 0
        else "no-demonstrated-skill"
    )

    exported_features = [
        {
            "name": name,
            "label": label,
            "mean": round(float(mean[idx]), 6),
            "std": round(float(std[idx]), 6),
            "weight": round(float(weights[idx]), 6),
            "support": {
                "kind": "binary" if name in ("prior_failure", "mood_anxious") else "continuous",
                "low": round(float(np.quantile(x_train[:, idx], 0.005)), 6),
                "high": round(float(np.quantile(x_train[:, idx], 0.995)), 6),
            },
        }
        for idx, (name, label) in enumerate(FEATURES)
    ]
    challenger_benchmark = train_recent_adherence_challenger(
        x,
        y,
        train_mask,
        validation_mask,
        test_mask,
        feature_names,
    )
    support_evaluation = evaluate_support_gate(
        x_test,
        y_test,
        test_pred,
        threshold,
        exported_features,
    )
    metrics = {
        "samples": int(len(rows)),
        "patients": N_PATIENTS,
        "trainPatients": train_count,
        "validationPatients": validation_count,
        "testPatients": N_PATIENTS - validation_end,
        "positiveRate": round(float(y.mean()), 4),
        "testAuc": round(auc_score(y_test, test_pred), 4),
        "testAuprc": round(test_auprc, 4),
        "testBrier": round(test_brier, 4),
        "baselineBrier": round(baseline_brier, 4),
        "brierSkill": round(brier_skill, 4),
        "threshold": round(threshold, 6),
        "precisionAtThreshold": round(test_precision, 4),
        "recallAtThreshold": round(test_recall, 4),
        "reviewRateAtThreshold": round(test_review_rate, 4),
        "confusionMatrix": test_matrix,
        "thresholdSelection": {
            "method": "highest validation threshold with recall at or above target",
            "targetRecall": TARGET_RECALL,
            "validationPrecision": round(validation_precision, 4),
            "validationRecall": round(validation_recall, 4),
            "validationReviewRate": round(validation_review_rate, 4),
        },
        "claimStatus": claim_status,
        "challengerBenchmark": challenger_benchmark,
        "supportEvaluation": support_evaluation,
        "calibration": calibration_bins(y_test, test_pred),
    }

    return {
        "version": "2026-07-12-edge-logistic-bootstrap-v5",
        "modelType": "monotonic standardized logistic regression with patient-bootstrap spread",
        "target": "next-week planned adherence-event interruption risk",
        "trainedAt": "2026-07-12",
        "cohort": {
            "patients": N_PATIENTS,
            "weeksPerPatient": N_WEEKS,
            "rows": len(rows),
            "generationSeed": SEED,
            "description": "Synthetic GLP-1 metabolic care cohort. Each index-week feature vector predicts a planned adherence event missed in the following week; future outcomes never enter same-row features.",
        },
        "featureContract": {
            "version": FEATURE_CONTRACT_VERSION,
            "historyWindow": "two most recent persisted weekly records plus the current check-in",
            "predictionPoint": "current check-in before the next planned adherence event",
            "missingInputPolicy": "abstain before patient-specific ML evidence is shown",
        },
        "features": exported_features,
        "intercept": round(float(intercept), 6),
        "constraints": {
            "method": "projected gradient descent",
            "featureDirections": {
                name: "increases risk" if direction == 1 else "decreases risk"
                for name, direction in SIGN_CONSTRAINTS.items()
            },
        },
        "ensemble": {
            "method": "16-member patient-level bootstrap",
            "members": ensemble_members,
            "spread": "10th to 90th percentile across bootstrap members; not a clinical confidence interval.",
        },
        "metrics": metrics,
        "modelCard": {
            "intendedUse": "Rank synthetic next-week adherence-interruption risk for supervised support prioritisation.",
            "notFor": "Diagnosis, medication decisions, autonomous clinical triage, or use without clinician-approved safety rules.",
            "edgeInference": "The exported JSON model runs locally in the browser over structured features derived from the check-in and prior programme history.",
            "explainability": "The score is exactly decomposed into an intercept plus standardized feature contributions in log-odds space.",
            "limitations": [
                "Synthetic data demonstrates the ML pipeline; real deployment would need retrospective validation on eMed outcomes.",
                "Prediction is calibrated for adherence risk, not medical safety risk.",
                "Bootstrap spread describes model variation in this synthetic cohort; it is not a confidence interval or clinical uncertainty estimate.",
                "Clinician review remains required for red-flag symptoms and medication questions.",
            ],
        },
        "trainingRuntime": {
            "python": ">=3.10",
            "numpy": "1.26.4",
            "seed": SEED,
            "maxIterations": MAX_ITERATIONS,
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
        tolerance = 1e-9 if ".sampleRows" in path else 1e-6
        if not math.isclose(expected, actual, rel_tol=tolerance, abs_tol=tolerance):
            errors.append(f"{path}: expected {expected}, got {actual}")
    elif expected != actual:
        errors.append(f"{path}: expected {expected!r}, got {actual!r}")

    return errors


def score_exported_row(row, artifact):
    feature_values = np.array([row[feature["name"]] for feature in artifact["features"]])
    mean = np.array([feature["mean"] for feature in artifact["features"]])
    std = np.array([feature["std"] for feature in artifact["features"]])
    standardized = (feature_values - mean) / std
    consensus_weights = np.array([feature["weight"] for feature in artifact["features"]])
    consensus = float(sigmoid(standardized @ consensus_weights + artifact["intercept"]))
    member_scores = np.array(
        [
            sigmoid(standardized @ np.array(member["weights"]) + member["intercept"])
            for member in artifact["ensemble"]["members"]
        ]
    )
    supported = all(
        feature["support"]["low"] <= row[feature["name"]] <= feature["support"]["high"]
        and (
            feature["support"]["kind"] != "binary"
            or row[feature["name"]] in (0, 1)
        )
        for feature in artifact["features"]
    )
    return {
        "expected_consensus_risk": round(consensus, 12),
        "expected_p10": round(float(np.quantile(member_scores, 0.1)), 12),
        "expected_p90": round(float(np.quantile(member_scores, 0.9)), 12),
        "expected_supported": int(supported),
    }


def json_compatible(value):
    if isinstance(value, dict):
        return {key: json_compatible(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_compatible(item) for item in value]
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


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
    parser.add_argument(
        "--fixture-output",
        type=Path,
        default=DEFAULT_FIXTURE_OUTPUT,
        help="Parity-fixture path to write or compare (defaults to data/adherence-model-fixtures.json).",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    rows = make_synthetic_cohort()
    artifact = train_model(rows)
    test_rows = [row for row in rows if row["patient_id"] >= N_PATIENTS * (TRAIN_RATIO + VALIDATION_RATIO)]
    fixture_rows = [row for row in test_rows if row["target"] == 1][:10]
    fixture_rows += [row for row in test_rows if row["target"] == 0][:10]
    sample_rows = []
    for row in fixture_rows:
        exported_row = {
            "patient_id": row["patient_id"],
            "week": row["week"],
            "outcome_week": row["outcome_week"],
            **{name: row[name] for name, _ in FEATURES},
            "target": row["target"],
        }
        exported_row = json_compatible(exported_row)
        exported_row.update(score_exported_row(exported_row, artifact))
        sample_rows.append(exported_row)
    feature_fixture_rows = [
        row for row in test_rows if not row["_feature_source"]["checkIn"]["medicationTaken"]
    ][:6]
    feature_fixture_rows += [
        row for row in test_rows if row["_feature_source"]["checkIn"]["medicationTaken"]
    ][:6]
    feature_rows = [
        {
            "id": f"patient-{row['patient_id']}-week-{row['week']}",
            "source": json_compatible(row["_feature_source"]),
            "expectedFeatures": json_compatible({name: row[name] for name, _ in FEATURES}),
        }
        for row in feature_fixture_rows
    ]
    output = {"artifact": artifact}
    fixture_output = {
        "contractVersion": FEATURE_CONTRACT_VERSION,
        "featureRows": feature_rows,
        "sampleRows": sample_rows,
    }

    if args.check:
        if not args.output.exists():
            raise SystemExit(f"model check failed: {args.output} does not exist")
        if not args.fixture_output.exists():
            raise SystemExit(f"model check failed: {args.fixture_output} does not exist")
        expected = json.loads(args.output.read_text(encoding="utf-8"))
        errors = compare_reproduction(expected, output)
        expected_fixtures = json.loads(args.fixture_output.read_text(encoding="utf-8"))
        errors += compare_reproduction(expected_fixtures, fixture_output, path="modelFixtures")
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
    args.fixture_output.parent.mkdir(parents=True, exist_ok=True)
    args.fixture_output.write_text(json.dumps(fixture_output, indent=2), encoding="utf-8")
    print(
        f"wrote {args.output} and {args.fixture_output} | auc={artifact['metrics']['testAuc']} "
        f"brier={artifact['metrics']['testBrier']} samples={artifact['metrics']['samples']}"
    )


if __name__ == "__main__":
    main()
