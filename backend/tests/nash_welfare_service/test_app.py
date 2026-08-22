"""
HTTP-level tests for backend/src/nash_welfare_service/app.py, using
FastAPI's TestClient (in-process — no real network socket needed for
these, unlike backend/tests/clients/nashWelfareMultiSourceClient.test.js
which does start a real server for a genuine end-to-end check).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src" / "nash_welfare_service"))

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_documented_hospital_scenario_end_to_end():
    # Same scenario used throughout this project's JS and Python test
    # suites, so the numbers are directly comparable across all three
    # implementations (single-pool JS, tiered Python, and this service).
    body = {
        "households": [
            {"id": "hospital_1", "weight": 1.0, "cap": 8.0, "eligible": ["battery_1"]},
            {"id": "h1", "weight": 0.5, "cap": 6.0, "eligible": ["battery_1"]},
            {"id": "h2", "weight": 0.105, "cap": 6.0, "eligible": ["battery_1"]},
        ],
        "sources": [{"id": "battery_1", "capacity": 10.0}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 200
    data = resp.json()
    # Values computed directly from the engine (not hand-guessed) before
    # writing this assertion — weights 1.0/0.5/0.105, pool 10, caps 8/6/6,
    # none of the caps bind here.
    assert abs(data["total"]["hospital_1"] - 6.230572) < 1e-3
    assert abs(data["total"]["h1"] - 3.115199) < 1e-3
    assert abs(data["total"]["h2"] - 0.654229) < 1e-3
    assert data["solver_status"] == "optimal"


def test_multi_source_with_eligibility_constraints():
    body = {
        "households": [
            {"id": "a", "weight": 1.0, "cap": 100.0, "eligible": ["s1", "s2"]},
            {"id": "b", "weight": 1.0, "cap": 100.0, "eligible": ["s2"]},
        ],
        "sources": [{"id": "s1", "capacity": 5.0}, {"id": "s2", "capacity": 5.0}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 200
    data = resp.json()
    # b can ONLY draw from s2 — must never appear against s1.
    assert "s1" not in data["amount"].get("b", {})
    assert data["used"]["s1"] <= 5.0 + 1e-6
    assert data["used"]["s2"] <= 5.0 + 1e-6


def test_rejects_zero_weight_with_400_not_500():
    body = {
        "households": [{"id": "a", "weight": 0.0, "cap": 5.0, "eligible": ["s1"]}],
        "sources": [{"id": "s1", "capacity": 10.0}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    # pydantic's gt=0 constraint on `weight` catches this before it even
    # reaches the engine -> 422 (request validation failure).
    assert resp.status_code == 422


def test_rejects_household_eligible_for_no_provided_source_with_400():
    body = {
        "households": [{"id": "a", "weight": 1.0, "cap": 5.0, "eligible": ["does-not-exist"]}],
        "sources": [{"id": "s1", "capacity": 10.0}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 400
    assert "does-not-exist" in resp.json()["detail"] or "a" in resp.json()["detail"]


def test_rejects_duplicate_household_ids():
    body = {
        "households": [
            {"id": "dup", "weight": 1.0, "cap": 5.0, "eligible": ["s1"]},
            {"id": "dup", "weight": 2.0, "cap": 5.0, "eligible": ["s1"]},
        ],
        "sources": [{"id": "s1", "capacity": 10.0}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 400


def test_rejects_empty_households_list():
    body = {"households": [], "sources": [{"id": "s1", "capacity": 10.0}]}
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 422


def test_rejects_negative_capacity():
    body = {
        "households": [{"id": "a", "weight": 1.0, "cap": 5.0, "eligible": ["s1"]}],
        "sources": [{"id": "s1", "capacity": -1.0}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 422


def test_tied_source_prices_regression_over_http():
    # HTTP-level replay of the tied-price bug (see engine.py's docstring
    # and test_engine.py's dedicated regression test) — confirms the
    # fix holds through the full request/response cycle, not just at
    # the engine's Python API.
    body = {
        "households": [
            {"id": "h0", "weight": 0.32846811344392046, "cap": 8.667975406896538, "eligible": ["s0", "s1"]},
            {"id": "h1", "weight": 0.05392219625366556, "cap": 14.01452582650843, "eligible": ["s0", "s1"]},
            {"id": "h2", "weight": 1.5632139402814724, "cap": 13.117839059117767, "eligible": ["s0", "s1"]},
            {"id": "h3", "weight": 1.6526635570383617, "cap": 1.7098528796737815, "eligible": ["s0", "s1"]},
        ],
        "sources": [{"id": "s0", "capacity": 3.3875216727655943}, {"id": "s1", "capacity": 19.675041602542535}],
    }
    resp = client.post("/allocate/nash-welfare-multi-source", json=body)
    assert resp.status_code == 200
    data = resp.json()
    total_delivered = sum(data["total"].values())
    total_capacity = sum(s["capacity"] for s in body["sources"])
    assert total_delivered <= total_capacity + 1e-3
