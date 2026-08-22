# Nash welfare multi-source allocation service

A small, single-purpose Python/FastAPI service that solves the general
multi-source Maximum Nash Welfare (Eisenberg-Gale) allocation problem —
multiple sources, each with its own capacity, where households are only
eligible for a subset of sources.

## Why this is Python, not JS, and why it's a separate service

The rest of this project's allocation logic (`algorithms/`) is pure,
dependency-free JS by design (see `algorithms/README.md`: "no network,
database, clock, or global-state dependencies"). That works for the
single-pool Nash-welfare case
(`algorithms/src/allocation/nashWelfareSinglePool.js`), which has an
exact closed-form solution reachable by sorting.

The general multi-source case does not have an equivalent closed form.
Two independent hand-rolled JS solver attempts were built and tested
against this same engine as ground truth before this service existed:

1. **Simultaneous (Jacobi) price tâtonnement** — every source's price
   adjusts at once each round based on excess demand. Oscillated and
   failed to converge in 109 of 200 random trials.
2. **Coordinate-wise (Gauss-Seidel) price bisection** — solved one
   source's price at a time, holding the others fixed. Converged
   cleanly every time, but landed on a *wrong* answer whenever the true
   optimum required two or more sources to share an identical
   equilibrium price — which happens whenever households' eligible-source
   sets overlap, i.e. the normal case for a shared battery network, not
   a rare edge case. One concrete failure: four households were given
   their full demand caps (37.5 kWh total) against only ~23 kWh of real
   combined capacity — a genuine conservation violation. Root cause:
   household demand collapses discontinuously (100% → 0%) the instant
   one source's price moves even slightly above another's, and
   coordinate-wise bisection walks straight past the exact tie a correct
   answer sometimes requires.

Both failure modes are captured as permanent regression tests here (see
`backend/tests/nash_welfare_service/test_engine.py`'s
`test_regression_tied_source_prices_no_conservation_violation` and the
equivalent HTTP-level test in `test_app.py`) — the specific numbers that
broke the JS attempts, now asserted to produce a correct, conservation-safe
result.

Rather than keep iterating on a novel numerical method with no
correctness proof, this service reuses cvxpy — a real, general-purpose
convex solver — via the same Eisenberg-Gale formulation already used and
verified elsewhere in this project's algorithm design work
(`algorithm/nash_allocation.py`, `engine/nash_welfare.py`). The
mathematics is identical; only the language and the deployment shape
(a running process instead of an in-process JS function) are new.

## What this costs you operationally — said plainly

Adding this service means the product is no longer a pure Next.js/Vite
app — it needs a Python process running alongside it whenever multi-source
Nash-welfare allocation is needed. In development that's one extra
terminal (`uvicorn app:app --reload --port 8001`). In production it's an
extra deployable (a container, a small managed Python service, etc.) with
its own health checks and its own failure mode to handle — the JS client
(`backend/src/clients/nashWelfareMultiSourceClient.js`) surfaces "service
unreachable" as a clear error rather than crashing silently, but your team
still needs to decide what the product does when that happens (retry,
fall back to the single-pool engine if the request happens to fit it,
show an error). That's a real, deliberate trade-off, not a free upgrade —
if multi-source eligibility constraints (per-locality batteries, embedded
networks, etc.) turn out not to be a real requirement for your actual
deployment, the JS-only single-pool engine avoids all of this and stays
running as an in-process function.

## Running it

```bash
cd backend/src/nash_welfare_service
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

Health check: `GET http://localhost:8001/health` → `{"status": "ok"}`

## API

`POST /allocate/nash-welfare-multi-source`

```json
{
  "households": [
    { "id": "hospital_1", "weight": 1.0, "cap": 8.0, "eligible": ["battery_1"] },
    { "id": "h1", "weight": 0.5, "cap": 6.0, "eligible": ["battery_1"] }
  ],
  "sources": [
    { "id": "battery_1", "capacity": 10.0 }
  ]
}
```

Returns `{ amount, total, used, objective_value, solver_status }` — see
`app.py`'s `AllocationResponse` model. Invalid input (a household
eligible for no provided source, duplicate ids, non-positive weight,
negative capacity) returns `400`/`422` with a descriptive message rather
than a stack trace; a solver convergence failure (extremely unlikely for
this problem class, but possible under pathological input) returns `502`.

## Testing

```bash
# Engine + HTTP-level tests (Python)
pip install pytest
pytest backend/tests/nash_welfare_service/ -v

# JS client integration test — starts this service as a real subprocess
# and makes real HTTP calls against it, not mocked
node --test backend/tests/clients/nashWelfareMultiSourceClient.test.js
```

The JS integration test skips itself (with a clear warning, not a
failure) if `python3 -m uvicorn` can't start within 15 seconds — most
commonly because `requirements.txt` hasn't been installed in whatever
Python environment `python3` resolves to.
