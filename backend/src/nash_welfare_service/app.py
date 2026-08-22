"""
HTTP wrapper around the multi-source Nash welfare engine (see engine.py
for why this exists as a separate service instead of a JS port).

Run locally:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8001

Then POST to http://localhost:8001/allocate/nash-welfare-multi-source
with a body matching AllocationRequest below.

This is intentionally a single, narrow endpoint — it does one job
(solve the convex program) and does not touch a database, authenticate
requests, or persist anything. Request validation is handled by
pydantic; domain errors from the engine (e.g. a household eligible for
no source) come back as 400 with the engine's own error message, not a
generic 500 — the caller should be able to tell "your input was
invalid" apart from "the solver itself failed."
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from engine import Household, Source, allocate

app = FastAPI(
    title="Nash Welfare Multi-Source Allocation Service",
    description=(
        "Solves the general multi-source Eisenberg-Gale (Maximum Nash Welfare) "
        "allocation problem. See engine.py for the full rationale and citation trail."
    ),
    version="1.0.0",
)


class HouseholdIn(BaseModel):
    id: str
    weight: float = Field(..., gt=0, description="Precomputed priority weight (e.g. from hardshipScore.js)")
    cap: float = Field(..., ge=0, description="Most this household can usefully receive this period")
    eligible: List[str] = Field(..., min_length=1, description="IDs of sources this household may draw from")


class SourceIn(BaseModel):
    id: str
    capacity: float = Field(..., ge=0)

    @field_validator("id")
    @classmethod
    def id_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("source id must not be blank")
        return v


class AllocationRequest(BaseModel):
    households: List[HouseholdIn] = Field(..., min_length=1)
    sources: List[SourceIn] = Field(..., min_length=1)


class AllocationResponse(BaseModel):
    amount: Dict[str, Dict[str, float]]
    total: Dict[str, float]
    used: Dict[str, float]
    objective_value: Optional[float]
    solver_status: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/allocate/nash-welfare-multi-source", response_model=AllocationResponse)
def allocate_endpoint(request: AllocationRequest) -> AllocationResponse:
    duplicate_household_ids = _find_duplicates([h.id for h in request.households])
    if duplicate_household_ids:
        raise HTTPException(status_code=400, detail=f"Duplicate household ids: {sorted(duplicate_household_ids)}")

    duplicate_source_ids = _find_duplicates([s.id for s in request.sources])
    if duplicate_source_ids:
        raise HTTPException(status_code=400, detail=f"Duplicate source ids: {sorted(duplicate_source_ids)}")

    source_ids = {s.id for s in request.sources}
    for h in request.households:
        if not any(sid in source_ids for sid in h.eligible):
            raise HTTPException(
                status_code=400,
                detail=f"Household {h.id!r} has no eligible source among the sources provided in this request.",
            )

    try:
        households = [Household(id=h.id, weight=h.weight, cap=h.cap, eligible=frozenset(h.eligible)) for h in request.households]
        sources = [Source(id=s.id, capacity=s.capacity) for s in request.sources]
        result = allocate(households, sources)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        # The convex program itself failed to converge — this is a solver
        # problem, not a caller-input problem, so 502 (upstream failure)
        # rather than 400/422.
        raise HTTPException(status_code=502, detail=str(exc))

    return AllocationResponse(
        amount=result.amount,
        total=result.total,
        used=result.used,
        objective_value=result.objective_value,
        solver_status=result.solver_status,
    )


def _find_duplicates(ids: List[str]) -> set:
    seen, dupes = set(), set()
    for i in ids:
        (dupes if i in seen else seen).add(i)
    return dupes
