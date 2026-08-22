# Shared contracts

Schemas in this directory define the boundary between the frontend, backend, and allocation algorithms.

The backend remains authoritative. It must independently verify that:

- `verified_spare_kwh = max(0, generated_kwh - consumed_kwh)`
- `contributed_kwh = min(pledged_kwh, verified_spare_kwh)`
- `sarge_credits_created = contributed_kwh` for the MVP policy

Contract changes should be versioned and tested against every consumer.
