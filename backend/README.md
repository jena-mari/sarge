# Backend

This directory is reserved for Sarge's server-side implementation.

## Proposed responsibilities

- Contributor accounts, properties, and consent preferences
- Smart-meter, inverter, VPP, and report ingestion adapters
- Verified energy readings and provenance
- Contribution pledges and capped contribution records
- Sarge Credit ledger and proposed reward redemptions
- Impact reports and auditable community-allocation events
- Authentication, authorisation, privacy, retention, and operational logging

## Suggested structure

```text
backend/
  src/
    api/          HTTP routes and request validation
    domain/       Contribution, credit, and reporting rules
    services/     Application workflows and integrations
    persistence/  Repositories, migrations, and storage adapters
  tests/
    unit/
    integration/
```

The backend should validate all incoming payloads against `contracts/`. It must calculate recognised contributions server-side; client calculations are presentational only.

No framework or database has been selected yet, so this space intentionally avoids locking the project into an implementation prematurely.

## One deliberate, narrow exception: `src/nash_welfare_service/`

This one piece is Python (FastAPI + cvxpy), not a framework decision for
the backend as a whole. It exists because the multi-source Nash-welfare
allocation problem (multiple sources, per-household eligibility) doesn't
have a closed-form solution the way the single-pool case does, and two
independent from-scratch JS solver attempts were built, tested against a
known-correct reference, and found to be wrong or non-convergent — see
`src/nash_welfare_service/README.md` for the full diagnosis, including
the exact input that broke each attempt. Rather than ship either broken
attempt or spend more time on a third numerical method with no proof of
correctness, this reuses cvxpy — the same convex solver already used and
verified in this project's algorithm-design work — behind a narrow HTTP
endpoint that the JS side calls via
`src/clients/nashWelfareMultiSourceClient.js`.

This does not decide the framework/database for contributor accounts,
the credit ledger, or the rest of the "Proposed responsibilities" above
— those remain open. If and when a JS backend is built there, its
`services/` layer would call `clients/nashWelfareMultiSourceClient.js`
the same way any other caller does; the Python service stays an isolated
dependency of one specific capability, not the backend's runtime.
