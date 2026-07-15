# ADR 0001: Use A Modular Monolith

- Status: Accepted
- Date: 2026-07-12

## Context

The hackathon product has one browser experience, two route handlers, three synthetic patients, no authentication, no database, and no independently scaling workload. The judged workflow must run reliably on one laptop.

## Decision

Use a Next.js modular monolith. Keep safety, ML, graph, provider, validation, and patient-summary logic in typed domain modules, while React owns presentation and local session state.

## Consequences

- One install, build, server, smoke path, and rollback point.
- Domain boundaries remain inspectable without network contracts.
- The main client module and CSS files are larger than ideal.
- Persistence, identity, messaging, and telemetry are deferred until real product requirements justify separate infrastructure.

## Rejected Alternatives

- **Microservices:** more failure modes and no scale benefit for the MVP.
- **Event broker and workers:** no durable asynchronous workflow exists.
- **Client-only static app:** would remove the optional provider boundary and server validation proof.
