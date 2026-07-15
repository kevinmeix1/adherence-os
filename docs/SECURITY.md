# Security

## Scope

Adherence OS is a synthetic-data hackathon prototype. It is designed to demonstrate secure defaults and explicit safety boundaries, not production healthcare compliance. No real patient data, credentials, or clinical deployment claim belongs in this repository.

## Implemented Controls

### Data And Privacy

- Every checked-in patient and outcome is synthetic and visibly labelled.
- Patient JSON is runtime-validated before use.
- Free text, patient records, and generated clinical content are not written to application logs.
- Review drafts remain in browser memory and are never described as sent.
- Health output contains only non-sensitive synthetic readiness metadata.

### Input And Output Boundaries

- `POST /api/care-plan` validates requests with Zod.
- Patient identifiers in the request and check-in must match a known synthetic record.
- Provider output is schema-validated.
- Unsafe diagnosis and medication-change language is removed by deterministic post-provider logic.
- The full displayed plan is recomputed from deterministic rules.
- Model artifacts, feature contracts, and patient files fail early when malformed.

### AI And Model Safety

- The provider cannot own risk scoring, escalation, or the final displayed plan.
- Provider calls use an eight-second timeout and zero retries.
- Missing keys, errors, and invalid output return a disclosed deterministic fallback.
- Feature-source version drift fails before model scoring.
- Missing, non-finite, invalid-binary, and out-of-bound features suppress patient-specific model evidence.
- Deterministic red flags always suppress coaching, even when the model abstains.

### Browser And Secret Hygiene

- `.env`, `.env.local`, logs, build output, Playwright output, and local TypeScript state are ignored.
- `.env.example` contains names and safe defaults only.
- Baseline headers deny framing, disable MIME sniffing, constrain referrers, and disable camera, microphone, and geolocation permissions.
- React renders text content without unsafe HTML injection APIs.
- GitHub Actions uses read-only repository contents permission and requires no application secret.

## Public Deployment Boundary

The keyless app may be shared as a hackathon preview after production smoke and browser tests pass. Do **not** put `OPENAI_API_KEY` on a public deployment of this MVP. The care-plan route has no authentication or rate limiting, so a public paid key would create an abuse and cost risk.

## Explicitly Not Implemented

- Authentication, authorisation, role-based access, or tenant isolation.
- Persistent audit, consent, retention, deletion, or subject-access workflows.
- Database encryption policy or key rotation.
- Rate limiting, WAF, bot protection, or abuse monitoring.
- Content Security Policy with per-request nonces.
- Dependency or container vulnerability attestation beyond lockfile and CI installation.
- Formal clinical safety case, DPIA, penetration test, compliance certification, or production incident response.

These are not optional in a real healthcare deployment. They are omitted because the MVP contains only synthetic data and must remain easy to run locally.

## Production Target Controls

Before real data or a paid provider is enabled, add:

1. Identity provider integration with patient, navigator, clinician, and administrator roles.
2. Server-side authorisation on every record and action.
3. Tenant-aware persistence with encryption, immutable audit events, retention, and deletion policy.
4. Rate limiting and per-user/provider budgets.
5. Central secret manager and short-lived workload credentials.
6. PII classification, redaction, and log-field allowlists.
7. CSP nonces, CSRF review, dependency scanning, SAST, DAST, and penetration testing.
8. Clinical safety management, privacy impact assessment, data-processing agreements, and deployment approval.

## Reporting A Security Issue

Do not open a public issue containing a credential, real patient record, or exploit payload. Revoke exposed credentials first, remove sensitive material from all affected systems, and contact the repository owner privately. This public prototype has no formal bounty or response SLA.

Threat analysis: [THREAT_MODEL.md](THREAT_MODEL.md). Deployment boundary: [deployment.md](deployment.md).
