# ADR 0002: Keep Safety Deterministic And Independent

- Status: Accepted
- Date: 2026-07-12

## Context

The product uses both an adherence-risk model and an optional LLM. Neither is a suitable owner for urgent symptom routing, medication boundaries, or escalation destinations.

## Decision

Evaluate typed flags, phrase backstops, and configured thresholds in deterministic code. Run safety independently from model support. Recompute the complete displayed plan after any provider attempt.

## Consequences

- Red flags remain active when the model abstains or scores low.
- Provider failure or unsafe wording cannot weaken the decision.
- Rules are explicit, testable, and easy to audit.
- Rules remain authored heuristics and require clinical governance before production.

## Rejected Alternatives

- **LLM-owned triage:** nondeterministic and difficult to validate.
- **Model threshold as safety threshold:** confuses adherence prediction with medical risk.
- **Generated plan with a final text filter only:** unsafe because structure and destination could already be wrong.
