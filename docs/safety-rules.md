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
- Severe, persistent, worsening, agonising, or unbearable stomach, upper-abdominal, belly, or tummy pain, including pain that spreads or radiates to the back.
- Fainting, blackout, severe dizziness, or dehydration concern.
- Vomiting or throwing up, inability to drink or keep fluids down, or reports that sips come back up.
- Pregnancy concern.
- Self-harm language, with direct statements such as "I want to kill myself" treated as possible immediate danger.

## Deterministic Thresholds

| Result | Prototype boundary |
|---|---|
| Urgent route | Any active red-flag phrase, or hydration at 1/10 or lower; coaching is suppressed and one immediate action is shown |
| Same-day review | Hydration at 2/10, or missed medication with nausea at 6/10 or higher; a draft is prepared and remains pending manual review |
| Watch | Latest adherence below 85%, nausea at 5/10 or higher, or two soft rule hits; coaching continues with no active escalation |
| High-nausea evidence | Nausea at 7/10 or higher; this records evidence but does not by itself create urgent status |

These are deterministic prototype rules for the synthetic demo, not clinically validated treatment thresholds.

## Prototype Urgent Routes

| Active phrase family | Route displayed by the prototype |
|---|---|
| Chest pain or breathlessness | Call 999 or go to A&E now; do not drive yourself |
| Severe or persistent abdominal pain with vomiting or inability to keep fluids down | Call NHS 111 now for urgent assessment; use 999 or A&E if pain is sudden or so severe that it is hard to think or talk |
| Immediate self-harm language | Call 999 or go to A&E now; stay with a trusted person while getting help if possible |
| Other self-harm language | Call NHS 111 and select the mental-health option; use 999 or A&E if there is immediate danger |
| Other urgent prototype rules | Call NHS 111; use 999 or A&E for immediate danger or severe symptoms |

These destinations are conservative prototype messages, not validated triage. They are based on current public wording from [NHS chest-pain guidance](https://www.nhs.uk/conditions/chest-pain/), [NHS vomiting guidance](https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/), [NHS urgent mental-health guidance](https://www.nhs.uk/nhs-services/mental-health-services/), and the MHRA warning below. The prototype cannot assess severity, place calls, contact emergency services, or determine which service will accept a patient.

Urgent mode returns one immediate safety action rather than a seven-day coaching sequence. All adherence-twin coaching moves are also suppressed while the urgent rule is active. A clinician handoff draft may be prepared for context, but it remains pending manual review.

## Bounded Parser Limits

Each free-text input field is matched separately through hard newline boundaries, so a denial in `sideEffects` cannot suppress an active phrase in `freeText`. Within a field, only symptom-scoped denials such as "no chest pain", "I don't have chest pain", or "I am not experiencing chest pain" suppress that phrase. Uncertainty such as "I am not sure why I have chest pain" does not count as a denial. Apostrophes and common Unicode punctuation are normalised before matching, so direct phrases such as "I can’t keep myself safe" follow the same emergency route as their plain-ASCII form. A later positive clause still wins over an earlier denied clause.

The only resolved-history exception applies to vomiting and fluid-intolerance matches. It requires a past-time marker such as "last week" or "yesterday", followed by `but` or `however`, followed by an explicit recovery phrase such as "I am fine now". A later current match still escalates. Immediate self-harm language is never suppressed by this history rule.

This is a small English phrase parser, not clinical-language understanding. It can miss or misread spelling variants, slang, quoted or hypothetical speech, indirect references, complex timelines, and languages other than English. Its phrase coverage and routing need clinical governance, representative evaluation, and a safer fallback before real-world use.

The severe, persistent abdominal-pain and dehydration framing follows current UK medicines-safety guidance for GLP-1 medicines. See the [MHRA Drug Safety Update](https://www.gov.uk/drug-safety-update/glp-1-receptor-agonists-and-dual-glp-1-slash-gip-receptor-agonists-strengthened-warnings-on-acute-pancreatitis-including-necrotising-and-fatal-cases).

## Review And Transport Semantics

- `watch`: `escalation.needed=false` and `urgency=none`; coaching continues and no handoff is active.
- `review`: `escalation.needed=true` and `urgency=same_day`; a clinician-review draft is prepared and remains pending manual review.
- `urgent`: `escalation.needed=true` and `urgency=urgent`; coaching is suppressed, a destination-specific action is shown, and any clinician handoff remains a pending draft.

There is no message, queue, notification, emergency-call, or clinical-record transport in this MVP. "Draft" never means that a clinician or service has been contacted.

## Internal Heuristic Fields

The care-plan and adherence-profile schemas contain no confidence field. The UI reports model spread only from the patient-bootstrap ensemble and explicitly states that this is not a confidence interval or clinical certainty.

## Deterministic Provider Merge

The optional provider does not own any `CarePlan` field. After a schema-valid provider response, `applySafetyOverrides` recomputes the complete plan from the checked-in patient record and check-in, then returns those deterministic values. This includes risk, headline, patient action, explanation, safety notice, escalation, clinician summary and draft, signals, next-check-in window, rule hits, trace, judge-facing proof, adherence profile, support plan, and unsafe-request demo.

No provider-generated care wording survives this merge in the current MVP. A `deterministic-rules` source label with provider-attempt metadata means a schema-valid provider call completed; it does not mean provider wording was shown or used for the care decision.

A separate phrase scan of generated care and handoff text can add the audit hit `guardrail removed unsafe medication or diagnosis language`, including for dose-change language such as “twice as much” and direct pancreatitis claims. That scan is evidence only: safety does not depend on the phrase list because the generated plan is discarded whether or not a phrase matches.

This merge contract makes the prototype reproducible and prevents generated text from weakening its fixed rules. It does not make the rules, thresholds, phrase coverage, or resulting actions clinically validated; all require clinical governance and validation before any real-world use.

## Demo Framing

Say: "The adherence model informs planning, while deterministic prototype rules decide whether coaching is suppressed and which help route is shown."

Avoid saying: "The AI tells the patient what to do medically."
