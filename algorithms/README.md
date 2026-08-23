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
    explain/      Turns a hardship score + allocation into a human-readable, auditable explanation
  policies/       Human-readable policy configuration
  tests/          Unit, property, simulation, and bias tests
  fixtures/       Synthetic, non-identifying test datasets
```

Algorithms should consume validated, minimal inputs from the backend and return an explainable allocation result. They should never write directly to production databases.

## Real-world data grounding

`policies/wollongongEquityDataV1.js` holds cited reference figures from
Council's own Energy Equity Framework and Assessment documents (the
10% energy-burden target, the two published income brackets, the named
priority suburbs, per-suburb solar density, etc.).
`src/scoring/deriveHardshipFactors.js` turns a household's own raw
inputs (weekly income, weekly energy cost, current arrears, suburb,
solar ownership) into the 0-1 hardship factors `hardshipScore.js`
expects — each derivation function's docstring states plainly whether
it's directly sourced from Council's data or a documented heuristic
built to fit around real, cited anchor points. `fixtures/wollongongDemoHouseholds.js`
uses these derivations to build fabricated, non-identifying demo
households grounded in real suburb statistics, and
`src/explain/explainAllocation.js` turns a household's hardship score,
tier assignment, and final allocation into the human-readable,
per-factor explanation this README's own design constraints call for
("preserve... the explanation used for each run") but that nothing in
this codebase actually produced before now.

One real interaction this data work surfaced, worth knowing rather
than relying on silently: `hardshipPolicyV1.js` already treats
`is_high_need_area` as a hard override field (forces `hardship_score`
straight to 1.0), a design decision that predates this file. Now that
`is_high_need_area` is wired to Council's five actual named priority
suburbs, every household in Warrawong/Cringila/Bellambi/Koonawarra/Berkeley
gets forced to that same ceiling together, regardless of its own
individual income, arrears, or energy burden — see the
`wollongongDemoHouseholds.test.js` test that documents this explicitly.
That may be exactly the intended equity stance (these suburbs are
Council's own stated priority), but it does mean those five suburbs'
households don't exercise the weighted formula the way a household in
a non-priority suburb does — worth a deliberate team decision, not an
accident of how the data was wired up.

### v2: real suburb-level SEIFA data supersedes the suburb-list heuristic

`policies/wollongongEquityDataV2.js` adds real ABS SEIFA Index of
Relative Socio-economic Disadvantage (IRSD) 2021 scores, published per
individual Wollongong suburb ("profile area") by profile.id.com.au's
Wollongong City community profile report — itself compiling the same
underlying ABS Census 2021 data `frontend/algorithm/docs/DataProvenance.jsx`
describes at the coarser, blended SA2 level.

This changes two things, both scoped narrowly to `area_disadvantage`:

- `deriveAreaDisadvantageFactor(suburb)` now returns `1 - nationalPercentile/100`
  using each suburb's real, individually-published SEIFA percentile,
  instead of a binary "is this one of the five priority suburbs" check.
  A suburb not individually published falls back to the Wollongong City
  LGA-wide percentile (42), not an arbitrary low baseline.
- `fixtures/wollongongDemoHouseholds.js` now derives `is_high_need_area`
  from `isHighNeedAreaBySeifa()` (real percentile <= 10) instead of the
  hand-maintained priority-suburb list. Worth stating plainly: this
  produces the *same* five suburbs Council's own Assessment names
  (Warrawong 2, Cringila 3, Bellambi 5, Koonawarra 6, Berkeley 7 — all
  comfortably inside the threshold, with real daylight to the next most
  disadvantaged suburb, Unanderra - Kembla Grange, at 14). That agreement
  between an independent ABS statistic and Council's own suburb-level
  fieldwork is a genuine, citable cross-validation, not just a renamed
  version of the same list — `wollongongEquityDataV2.test.js` checks it
  explicitly.

`no_solar_access` is untouched — it still uses `wollongongEquityDataV1.js`'s
per-suburb solar-installation CSV figures, unaffected by this change.

**Still open, deliberately not resolved by v2:** the energy-burden
threshold (Council's own 10% target vs. `DataProvenance.jsx`'s 6% ECA
benchmark) and whether `income_gap` should move from the Assessment's
two published income brackets onto the ABS Census median income figure
(itself cited two slightly different ways — $1,682/week via ABS
QuickStats, $1,637/week via profile.id's own compilation — both
recorded in `wollongongEquityDataV2.js`). See
`system_audit_vs_real_data.md` §1 for the full reasoning; both remain a
team decision, not something this file resolved unilaterally.
