import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { WOLLONGONG_DEMO_HOUSEHOLDS, WOLLONGONG_DEMO_POOL_KWH } from '../fixtures/wollongongDemoHouseholds.js';
import { allocateTiered, partitionTiers } from '../src/allocation/tieredAllocation.js';
import { computePriorityWeight } from '../src/scoring/hardshipScore.js';
import { HARDSHIP_POLICY_V1 } from '../policies/hardshipPolicyV1.js';
import { explainAllocation } from '../src/explain/explainAllocation.js';
import { checkCapsRespected } from '../src/fairness/checkInvariants.js';

// End-to-end integration test: real (cited) Wollongong data flowing
// through fixture construction -> tiered Nash-welfare allocation ->
// per-household explanation, checked against the shared fairness
// invariants used everywhere else in this test suite.

describe('WOLLONGONG_DEMO_HOUSEHOLDS — tiered allocation over real-grounded data', () => {
  const result = allocateTiered(WOLLONGONG_DEMO_HOUSEHOLDS, WOLLONGONG_DEMO_POOL_KWH, HARDSHIP_POLICY_V1);

  test('the life-support household (Figtree F) is in tier0', () => {
    assert.ok(result.tier0HouseholdIds.includes('wlg-figtree-life-support-f'));
  });

  test('every other household is in tier1', () => {
    const nonLifeSupportIds = WOLLONGONG_DEMO_HOUSEHOLDS.filter((h) => h.id !== 'wlg-figtree-life-support-f').map((h) => h.id);
    for (const id of nonLifeSupportIds) {
      assert.ok(result.tier1HouseholdIds.includes(id));
    }
  });

  test('no household receives negative kWh or more than its own cap', () => {
    const violations = checkCapsRespected(result.combinedAllocationKwh, WOLLONGONG_DEMO_HOUSEHOLDS);
    assert.deepEqual(violations, []);
  });

  test('total allocated plus leftover equals the pool (conservation)', () => {
    const totalAllocated = Object.values(result.combinedAllocationKwh).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(totalAllocated + result.leftoverKwh - WOLLONGONG_DEMO_POOL_KWH) < 1e-6);
  });

  test('the life-support household is served even though its own hardship factors are low', () => {
    assert.ok(result.combinedAllocationKwh['wlg-figtree-life-support-f'] > 0);
  });

  test('priority-suburb households outweigh the Cordeaux Heights comparison household', () => {
    const priorityIds = ['wlg-bellambi-a', 'wlg-warrawong-b', 'wlg-cringila-c', 'wlg-koonawarra-d'];
    const comparison = WOLLONGONG_DEMO_HOUSEHOLDS.find((h) => h.id === 'wlg-cordeaux-heights-e');
    const comparisonWeight = computePriorityWeight(comparison, HARDSHIP_POLICY_V1);
    for (const id of priorityIds) {
      const h = WOLLONGONG_DEMO_HOUSEHOLDS.find((hh) => hh.id === id);
      const weight = computePriorityWeight(h, HARDSHIP_POLICY_V1);
      assert.ok(weight > comparisonWeight, `${id} (${weight}) should outweigh Cordeaux Heights comparison (${comparisonWeight})`);
    }
  });

  test('the Coniston household (not a Council priority suburb) reaches high hardship via the weighted formula alone, not the area override', () => {
    const h = WOLLONGONG_DEMO_HOUSEHOLDS.find((hh) => hh.id === 'wlg-coniston-g');
    assert.equal(h.is_high_need_area, 0, 'Coniston is not one of the five named priority suburbs');
    const score = computePriorityWeight(h, HARDSHIP_POLICY_V1);
    // Not overridden, so this reflects the household's own income/energy
    // cost/arrears — proving the formula itself differentiates hardship,
    // not just the is_high_need_area override.
    assert.ok(score > 0.5, `expected genuine formula-driven hardship, got weight ${score}`);
  });

  test('priority-suburb households (Bellambi, Warrawong, Cringila, Koonawarra) are all forced to the override ceiling, tied with each other', () => {
    // Documents a real interaction this fixture work surfaced:
    // hardshipPolicyV1.js already treats is_high_need_area as a hard
    // OVERRIDE field. Once it's wired to real named priority suburbs,
    // every household there gets forced to hardship_score 1.0 alike,
    // regardless of its own individual circumstances — worth knowing,
    // not silently relied on.
    const ids = ['wlg-bellambi-a', 'wlg-warrawong-b', 'wlg-cringila-c', 'wlg-koonawarra-d'];
    const scores = ids.map((id) => {
      const h = WOLLONGONG_DEMO_HOUSEHOLDS.find((hh) => hh.id === id);
      return computePriorityWeight(h, HARDSHIP_POLICY_V1);
    });
    for (const s of scores) assert.equal(s, scores[0]);
  });

  test('every tier1 household produces a coherent explanation', () => {
    const { tier1 } = partitionTiers(WOLLONGONG_DEMO_HOUSEHOLDS);
    for (const h of tier1) {
      const explanation = explainAllocation({
        household: h,
        policy: HARDSHIP_POLICY_V1,
        priorityWeight: computePriorityWeight(h, HARDSHIP_POLICY_V1),
        tier: 'tier1',
        allocatedKwh: result.combinedAllocationKwh[h.id],
        capKwh: h.capKwh,
        suburb: h.suburb,
        weeklyEnergyBurdenPct: h.weeklyEnergyBurdenPct,
      });
      assert.equal(typeof explanation.plainLanguageSummary, 'string');
      assert.ok(explanation.plainLanguageSummary.length > 0);
      assert.equal(explanation.householdId, h.id);
    }
  });

  test('the Bellambi household explanation names Council\'s priority-suburb finding', () => {
    const h = WOLLONGONG_DEMO_HOUSEHOLDS.find((hh) => hh.id === 'wlg-bellambi-a');
    const explanation = explainAllocation({
      household: h,
      policy: HARDSHIP_POLICY_V1,
      priorityWeight: computePriorityWeight(h, HARDSHIP_POLICY_V1),
      tier: 'tier1',
      allocatedKwh: result.combinedAllocationKwh[h.id],
      capKwh: h.capKwh,
      suburb: h.suburb,
      weeklyEnergyBurdenPct: h.weeklyEnergyBurdenPct,
    });
    assert.match(explanation.plainLanguageSummary, /Bellambi/);
    assert.match(explanation.plainLanguageSummary, /highest-priority/);
  });
});
