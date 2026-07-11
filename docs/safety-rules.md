# Safety Rules

Adherence OS is a chronic-care support prototype. It helps patients stay adherent and helps clinicians prioritise follow-up. It does not diagnose, prescribe, change doses, or replace care teams.

## Hard Rules

1. Do not diagnose or suggest a differential diagnosis.
2. Do not recommend medication dose changes, stopping medication, restarting medication, or substitutions.
3. Do not reassure away severe or worsening symptoms.
4. Red flags escalate to a clinician or urgent care language.
5. Patient guidance should stay behavioural, supportive, and bounded.
6. Clinician output is a summary and draft message, not an automated clinical decision.

## Red Flags In The Prototype

- Chest pain or breathlessness.
- Severe or worsening abdominal pain.
- Fainting, blackout, severe dizziness, or dehydration concern.
- Vomiting or inability to keep fluids down.
- Pregnancy concern.
- Self-harm language.

## Deterministic Thresholds

| Result | Prototype boundary |
|---|---|
| Urgent handoff | Any red-flag phrase, or hydration at 1/10 or lower |
| Same-day review | Hydration at 2/10, or missed medication with nausea at 6/10 or higher |
| Watch | Latest adherence below 85%, nausea at 5/10 or higher, or two soft rule hits |
| High-nausea evidence | Nausea at 7/10 or higher; this records evidence but does not by itself create urgent status |

These are deterministic prototype rules for the synthetic demo, not clinically validated treatment thresholds.

Red-flag phrase matching is clause-aware: explicit denials such as “no chest pain” do not create an urgent result, while a later positive clause still can. This is a bounded demo parser, not a substitute for clinical language review.

The severe, persistent abdominal-pain and dehydration framing follows current UK medicines-safety guidance for GLP-1 medicines. See the [MHRA Drug Safety Update](https://www.gov.uk/drug-safety-update/glp-1-receptor-agonists-and-dual-glp-1-slash-gip-receptor-agonists-strengthened-warnings-on-acute-pancreatitis-including-necrotising-and-fatal-cases).

## Demo Framing

Say: "The AI is not replacing the clinician. It is deciding which mode is safe: coaching, async review, or escalation."

Avoid saying: "The AI tells the patient what to do medically."
