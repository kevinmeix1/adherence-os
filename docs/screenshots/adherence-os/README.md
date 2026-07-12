# Adherence OS Screenshot Evidence

Every image in this directory is produced by `scripts/capture-walkthrough.mjs` from a running production build. The same files are mirrored to `public/walkthrough/` for GitHub and browser rendering.

## 01 Live Twin Coaching

![Graph-first coaching decision](01-live-twin-coaching.png)

Shows the first judged viewport: one synthetic patient, supported next-week adherence risk, evidence graph, bounded action, and safety state. Notice that graph provenance and the operational decision share one screen without presenting the model as medical triage.

## 02 Attribution Driver

![Selected model attribution](02-attribution-driver.png)

Shows a selected model contributor with evidence and provenance. It solves the reviewer question “why did this score move?” through exact signed model decomposition rather than generated explanation text.

## 03 Bounded Support Route

![Selected bounded support comparison](03-bounded-support-route.png)

Shows an explicit feature-assumption comparison and its rescored scenario. Notice the non-causal language, support gate, and stable graph interaction.

## 04 Safety Escalation

![Model abstention with deterministic escalation](04-safety-escalation.png)

Shows the central safety contract: patient-specific ML evidence is withheld, coaching routes disappear, and deterministic NHS 111 routing remains active. The user problem is urgent support without waiting for another model or appointment.

## 05 Clinician Handoff Review

![Local clinician review draft](05-clinician-handoff-review.png)

Shows a structured in-memory draft, trigger, longitudinal summary, delivery state, and audit trace. Notice that the interface says “Not sent” and never invents assignment or delivery infrastructure.

## 06 Patient Check-In

![Patient home check-in](06-patient-check-in.png)

Shows the patient-facing structured task, current-symptom flags, and persistent review action. It demonstrates role-specific UX rather than reusing the dense technical graph interface.

## 07 Model Evidence

![Held-out model and feature-contract evidence](07-model-evidence.png)

Shows the all-row challenger comparison, separate runtime-gated population, artifact provenance, and `adherence-feature-source-v1`. Notice the synthetic-validation caveat and the absence of a fabricated production claim.

## 08 Mobile Coaching

![320 pixel coaching layout](08-mobile-live-twin.png)

Shows graph-first coaching at 320 px without page overflow. Presenter controls retain usable targets and the decision remains readable.

## 09 Mobile Safety

![320 pixel urgent layout](09-mobile-safety-escalation.png)

Shows the narrow safety reading order: destination and human handoff precede graph exploration. This is the mobile safety requirement, not decorative responsiveness.

## Reproduce

```bash
pnpm build
pnpm start
APP_URL=http://127.0.0.1:3000 pnpm capture:walkthrough
```
