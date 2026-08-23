"""
Multi-source Nash welfare allocation — the exact Eisenberg-Gale convex
program, solved via cvxpy.

WHY THIS SERVICE EXISTS
------------------------
This is the general case the JS side of this project cannot solve on its
own: multiple sources, each with its own capacity, where households are
only eligible for a subset of sources (locality/network constraints).
JS has a closed-form solution for the single-pool case
(`algorithms/src/allocation/nashWelfareSinglePool.js`) — that's exact and
fast because a single shared pool has one stationary point reachable by
sorting. The multi-source case does not have an equivalent closed form:
the true optimum can require two or more sources to land at *exactly* the
same equilibrium price simultaneously (this happens whenever households'
eligible-source sets overlap heavily — the normal case for a shared
council battery network, not an edge case), and no local/coordinate
numerical scheme reliably finds that without also handling a genuine
discontinuity in household demand at ties.

That's not a hand-wave — it was verified directly. Two independent
hand-rolled attempts at a dependency-free JS solver were built and tested
against this same engine as ground truth:

  1. Simultaneous (Jacobi) price tâtonnement — oscillated and failed to
     converge in 109 of 200 random trials.
  2. Coordinate-wise (Gauss-Seidel) price bisection — converged cleanly
     every time, but landed on a wrong fixed point in cases requiring a
     tied price across sources: one concrete case gave four households
     their full demand cap (37.5 kWh total) against only 23 kWh of real
     combined capacity — a genuine conservation violation, traced to the
     coordinate-descent scheme walking past the exact price where two
     sources should have shared demand, because household demand
     collapses discontinuously (100% -> 0%) the instant one source's
     price moves even slightly above another's.

Rather than keep iterating on a numerical method with no proof of
correctness for this problem class, this service reuses the engine
that's already been fuzz-tested (20,000+ trials) and cross-validated
against an independent closed-form reference — see
`algorithm/nash_allocation.py` in the project's algorithm-design
history, which this file is adapted from — and exposes it over HTTP so
the JS/Node side can call it instead of reimplementing a solver.

THE ALGORITHM
--------------
    maximize   sum_i  weight_i * log( amount_i + EPSILON )
    subject to amount_i = sum_j x[i, j]
               sum_i x[i, j] <= capacity_j              for every source j
               0 <= amount_i <= cap_i                    for every household i
               x[i, j] = 0 whenever household i isn't eligible for source j

Proved by Eisenberg & Gale (1959) to be identical to the Competitive
Equilibrium from Equal Incomes for this problem class — see this
project's algorithm documentation for the full citation trail (Kelly,
Maulloo & Tan 1998; Nash 1950; Caragiannis et al. 2019).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import cvxpy as cp

EPSILON = 1e-6


@dataclass(frozen=True)
class Household:
    id: str
    weight: float
    cap: float
    eligible: frozenset

    def __post_init__(self):
        if self.weight <= 0:
            raise ValueError(f"Household {self.id!r}: weight must be > 0")
        if self.cap < 0:
            raise ValueError(f"Household {self.id!r}: cap must be >= 0")
        if not self.eligible:
            raise ValueError(f"Household {self.id!r}: must be eligible for at least one source")


@dataclass(frozen=True)
class Source:
    id: str
    capacity: float

    def __post_init__(self):
        if self.capacity < 0:
            raise ValueError(f"Source {self.id!r}: capacity must be >= 0")


@dataclass
class Allocation:
    amount: Dict[str, Dict[str, float]]   # household_id -> source_id -> kWh
    total: Dict[str, float]                # household_id -> total kWh
    used: Dict[str, float]                 # source_id -> total kWh drawn
    objective_value: Optional[float]
    solver_status: str


def allocate(households: List[Household], sources: List[Source], solver: Optional[str] = None) -> Allocation:
    """Solve the multi-source Eisenberg-Gale program exactly. Deterministic:
    identical (households, sources) always produce the same result."""

    source_ids = {s.id for s in sources}
    x: Dict[str, Dict[str, cp.Variable]] = {
        h.id: {sid: cp.Variable(nonneg=True) for sid in h.eligible if sid in source_ids}
        for h in households
    }

    constraints = []

    for s in sources:
        drawers = [x[h.id][s.id] for h in households if s.id in x[h.id]]
        if drawers:
            constraints.append(cp.sum(drawers) <= s.capacity)

    amount_expr = {}
    for h in households:
        vars_for_h = list(x[h.id].values())
        amount_expr[h.id] = cp.sum(vars_for_h) if vars_for_h else 0.0
        if vars_for_h:
            constraints.append(amount_expr[h.id] <= h.cap)

    log_terms = [h.weight * cp.log(amount_expr[h.id] + EPSILON) for h in households if x[h.id]]
    if not log_terms:
        raise ValueError("No household is eligible for any source — nothing to allocate.")

    problem = cp.Problem(cp.Maximize(cp.sum(log_terms)), constraints)
    problem.solve(solver=solver or "CLARABEL")

    if problem.status not in ("optimal", "optimal_inaccurate"):
        raise RuntimeError(f"Solver did not converge: status={problem.status}")

    amount: Dict[str, Dict[str, float]] = {h.id: {} for h in households}
    for h in households:
        for sid, var in x[h.id].items():
            val = max(float(var.value), 0.0) if var.value is not None else 0.0
            if val > 1e-9:
                amount[h.id][sid] = val

    total = {hid: sum(v.values()) for hid, v in amount.items()}
    used = {s.id: sum(amount[h.id].get(s.id, 0.0) for h in households) for s in sources}

    return Allocation(
        amount=amount,
        total=total,
        used=used,
        objective_value=float(problem.value) if problem.value is not None else None,
        solver_status=problem.status,
    )
