# Shared contracts

Schemas in this directory define the boundary between the frontend, backend, and allocation algorithms.

The backend remains authoritative. It must independently verify that:

- `verified_spare_kwh = max(0, generated_kwh - consumed_kwh)`
- `contributed_kwh = min(pledged_kwh, verified_spare_kwh)`
- `sarge_credits_created = contributed_kwh` for the MVP policy

Product and settlement boundaries:

- SARGE Credits are civic recognition points, not payment for electricity.
- SARGE does not buy, sell, settle, or physically route electricity.
- Electricity retailer accounts and feed-in tariffs remain outside SARGE and are not modified by this calculation.
- Recipient allocation values are kWh-equivalent program-accounting units, not claims of physical electricity delivery.

Contract changes should be versioned and tested against every consumer.
