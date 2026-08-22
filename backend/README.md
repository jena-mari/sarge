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
