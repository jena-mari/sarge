# Allocation algorithms

This directory is reserved for independently testable energy-allocation and fairness logic. Recipient matching is intentionally outside the current contributor-facing prototype.

## Design constraints

- Never allocate more than verified contributed energy.
- Keep donor identity and sensitive recipient data outside the algorithm where possible.
- Produce deterministic, auditable results for a given input and policy version.
- Version every policy and preserve the inputs, output, and explanation used for each run.
- Test for geographic, housing-type, timing, and demographic proxy bias before production use.
- Keep policy configuration separate from executable logic.

## Suggested structure

```text
algorithms/
  src/
    allocation/   Community-pool allocation strategies
    fairness/     Constraints and fairness evaluation
    scoring/      Transparent, versioned scoring functions
  policies/       Human-readable policy configuration
  tests/          Unit, property, simulation, and bias tests
  fixtures/       Synthetic, non-identifying test datasets
```

Algorithms should consume validated, minimal inputs from the backend and return an explainable allocation result. They should never write directly to production databases.
