"""
Correctness tests for backend/src/nash_welfare_service/engine.py — the
multi-source Nash welfare solver.

This mirrors the same properties already proven for the reference
implementation this service is adapted from (conservation, caps,
eligibility, symmetry, scale invariance, determinism), plus a permanent
regression test for the exact tied-price scenario that broke both
hand-rolled JS solver attempts before this service was built — see
engine.py's module docstring for the full story.
"""

import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src" / "nash_welfare_service"))

import pytest

from engine import Household, Source, allocate

EPS = 1e-4  # the log-barrier (EPSILON=1e-6 inside the objective) means exact
            # equality isn't meaningful at machine precision — see engine.py


def mk_household(id_, weight, cap, eligible):
    return Household(id=id_, weight=weight, cap=cap, eligible=frozenset(eligible))


def mk_source(id_, capacity):
    return Source(id=id_, capacity=capacity)


# ---------------------------------------------------------------------------
# The exact scenario that broke both hand-rolled JS solver attempts
# ---------------------------------------------------------------------------
def test_regression_tied_source_prices_no_conservation_violation():
    """This is trial 62 from the JS solver-prototyping session, verbatim.
    The true optimum requires source s0 and s1 to land at the identical
    equilibrium price (~0.0464) — a coordinate-wise bisection scheme
    couldn't discover this and instead gave every household its full
    demand cap (37.5 kWh total) against only ~23 kWh of real capacity.
    This test exists so that property can never silently regress here."""
    sources = [mk_source("s0", 3.3875216727655943), mk_source("s1", 19.675041602542535)]
    households = [
        mk_household("h0", 0.32846811344392046, 8.667975406896538, ["s0", "s1"]),
        mk_household("h1", 0.05392219625366556, 14.01452582650843, ["s0", "s1"]),
        mk_household("h2", 1.5632139402814724, 13.117839059117767, ["s0", "s1"]),
        mk_household("h3", 1.6526635570383617, 1.7098528796737815, ["s0", "s1"]),
    ]
    result = allocate(households, sources)

    total_delivered = sum(result.total.values())
    total_capacity = sum(s.capacity for s in sources)
    assert total_delivered <= total_capacity + 1e-3, (
        f"conservation violated: delivered {total_delivered} against only {total_capacity} of real capacity"
    )
    for s in sources:
        assert result.used[s.id] <= s.capacity + 1e-6

    # Sanity-check against the true values a correct convex solve gives
    # (independently confirmed via cvxpy during diagnosis of the bug).
    assert math.isclose(result.total["h2"], 13.117839037212978, abs_tol=1e-3)
    assert math.isclose(result.total["h3"], 1.709852877841601, abs_tol=1e-3)


# ---------------------------------------------------------------------------
# Core safety properties
# ---------------------------------------------------------------------------
def test_conservation_never_exceeds_capacity():
    random.seed(11)
    for _ in range(200):
        n, m = random.randint(1, 6), random.randint(1, 4)
        source_ids = [f"s{j}" for j in range(m)]
        sources = [mk_source(sid, random.random() * 20) for sid in source_ids]
        households = [
            mk_household(f"h{i}", 0.01 + random.random() * 2, random.random() * 15,
                         random.sample(source_ids, random.randint(1, m)))
            for i in range(n)
        ]
        result = allocate(households, sources)
        for s in sources:
            assert result.used[s.id] <= s.capacity + 1e-6


def test_demand_cap_never_exceeded():
    random.seed(22)
    for _ in range(200):
        n, m = random.randint(1, 6), random.randint(1, 4)
        source_ids = [f"s{j}" for j in range(m)]
        sources = [mk_source(sid, random.random() * 20) for sid in source_ids]
        households = [
            mk_household(f"h{i}", 0.01 + random.random() * 2, random.random() * 15,
                         random.sample(source_ids, random.randint(1, m)))
            for i in range(n)
        ]
        result = allocate(households, sources)
        for h in households:
            assert result.total.get(h.id, 0.0) <= h.cap + 1e-4


def test_eligibility_never_violated():
    random.seed(33)
    for _ in range(200):
        n, m = random.randint(1, 6), random.randint(2, 4)
        source_ids = [f"s{j}" for j in range(m)]
        sources = [mk_source(sid, random.random() * 20) for sid in source_ids]
        households = [
            mk_household(f"h{i}", 0.01 + random.random() * 2, random.random() * 15,
                         random.sample(source_ids, random.randint(1, m - 1)))
            for i in range(n)
        ]
        result = allocate(households, sources)
        for h in households:
            for sid, amount in result.amount.get(h.id, {}).items():
                assert sid in h.eligible, f"{h.id} drew {amount} from ineligible source {sid}"


def test_symmetry_axiom():
    sources = [mk_source("s1", 10.0)]
    households = [
        mk_household("twin1", 1.5, 8.0, ["s1"]),
        mk_household("twin2", 1.5, 8.0, ["s1"]),
    ]
    result = allocate(households, sources)
    assert math.isclose(result.total["twin1"], result.total["twin2"], abs_tol=1e-4)


def test_scale_invariance_axiom():
    sources = [mk_source("s1", 10.0)]
    households1 = [mk_household("a", 0.4, 6.0, ["s1"]), mk_household("b", 0.9, 6.0, ["s1"])]
    households2 = [mk_household("a", 4.0, 6.0, ["s1"]), mk_household("b", 9.0, 6.0, ["s1"])]
    r1, r2 = allocate(households1, sources), allocate(households2, sources)
    assert math.isclose(r1.total["a"], r2.total["a"], abs_tol=1e-3)
    assert math.isclose(r1.total["b"], r2.total["b"], abs_tol=1e-3)


def test_deterministic_repeatable():
    sources = [mk_source("s1", 8.0), mk_source("s2", 5.0)]
    households = [mk_household("a", 0.7, 6.0, ["s1", "s2"]), mk_household("b", 0.3, 6.0, ["s1"])]
    r1 = allocate(households, sources)
    r2 = allocate(households, sources)
    assert r1.total == r2.total


def test_rejects_invalid_input():
    with pytest.raises(ValueError):
        mk_household("bad", 0.0, 10.0, ["s1"])
    with pytest.raises(ValueError):
        mk_household("bad", 1.0, -5.0, ["s1"])
    with pytest.raises(ValueError):
        mk_household("bad", 1.0, 10.0, [])
    with pytest.raises(ValueError):
        mk_source("bad", -1.0)


def test_no_eligible_household_raises():
    sources = [mk_source("s1", 10.0)]
    households = [mk_household("a", 1.0, 5.0, ["nonexistent-source"])]
    with pytest.raises(ValueError):
        allocate(households, sources)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
