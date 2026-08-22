# Backend tests

Reserve this directory for unit, integration, contract, security, and migration tests. Contribution capping and credit-ledger idempotency should be treated as critical invariants.

## What's here so far

- `nash_welfare_service/` — Python tests (pytest) for the multi-source
  Nash-welfare engine and its HTTP wrapper, including permanent
  regression tests for the two specific numerical bugs found while
  evaluating (and rejecting) hand-rolled JS alternatives.
- `clients/` — a JS integration test that starts the real Python service
  as a subprocess and makes real HTTP calls against it (not mocked).
  Skips itself with a clear message if the Python environment isn't set
  up locally, rather than failing.
