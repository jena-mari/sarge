import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { allocateTiered, allocateTieredWithReserve, partitionTiers, HIGH_NEED_AREA_IS_HARD_OVERRIDE } from '../src/allocation/tieredAllocation.js';
import { checkPoolConservation, checkCapsRespected } from '../src/fairness/checkInvariants.js';
import { HARDSHIP_POLICY_V1 } from '../policies/hardshipPolicyV1.js';
import { SAMPLE_HOUSEHOLDS_HARDSHIP, SAMPLE_CAP_KWH } from '../fixtures/sampleHouseholds.js';

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('partitionTiers', () => {
  test('life_support_flag households go to Tier 0, everyone else to Tier 1', () => {
    const { tier0, tier1 } = partitionTiers(SAMPLE_HOUSEHOLDS_HARDSHIP);
    assert.deepEqual(tier0.map((h) => h.id), ['household-e']);
    assert.deepEqual(
      tier1.map((h) => h.id),
      ['household-a', 'household-b', 'household-c', 'household-d']
    );
  });

  test('HIGH_NEED_AREA_IS_HARD_OVERRIDE defaults to false: a high-need-area-only household stays in Tier 1', () => {
    assert.equal(HIGH_NEED_AREA_IS_HARD_OVERRIDE, false);
    const households = [{ id: 'hn', life_support_flag: 0, is_high_need_area: 1, capKwh: 5 }];
    const { tier0, tier1 } = partitionTiers(households);
    assert.deepEqual(tier0, []);
    assert.deepEqual(tier1.map((h) => h.id), ['hn']);
  });

  test('empty input gives two empty tiers', () => {
    const { tier0, tier1 } = partitionTiers([]);
    assert.deepEqual(tier0, []);
    assert.deepEqual(tier1, []);
  });
});

describe('allocateTiered — the documented hospital scenario', () => {
  // Mirrors algorithm/scoring_and_tiered_allocation.py's __main__ smoke
  // example exactly, so the two implementations can be checked against
  // the same hand-computed numbers.
  const households = [
    {
      id: 'hospital_1',
      life_support_flag: 1,
      is_high_need_area: 0,
      income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0,
      capKwh: 8,
    },
    {
      id: 'h1', // hardship = 0.30*.5 + 0.25*.4 + 0.20*.3 + 0.15*.6 + 0.10*1.0 = 0.50
      life_support_flag: 0, is_high_need_area: 0,
      income_gap: 0.5, area_disadvantage: 0.4, payment_difficulty: 0.3, energy_burden: 0.6, no_solar_access: 1.0,
      capKwh: 6,
    },
    {
      id: 'h2', // hardship = 0.30*.1 + 0.25*.1 + 0.20*.1 + 0.15*.2 + 0.10*0 = 0.105
      life_support_flag: 0, is_high_need_area: 0,
      income_gap: 0.1, area_disadvantage: 0.1, payment_difficulty: 0.1, energy_burden: 0.2, no_solar_access: 0.0,
      capKwh: 6,
    },
  ];

  test('Tier 0 (hospital) is served in full from the 10 kWh pool before Tier 1 is even considered', () => {
    const result = allocateTiered(households, 10, HARDSHIP_POLICY_V1);
    assert.ok(Math.abs(result.combinedAllocationKwh.hospital_1 - 8) < 1e-6);
  });

  test('Tier 1 splits the 2 kWh leftover proportional to hardship weight (0.50 vs 0.105)', () => {
    const result = allocateTiered(households, 10, HARDSHIP_POLICY_V1);
    // 0.50/0.605 * 2 = 1.652893..., 0.105/0.605 * 2 = 0.347107...
    assert.ok(Math.abs(result.combinedAllocationKwh.h1 - 1.652893) < 1e-4);
    assert.ok(Math.abs(result.combinedAllocationKwh.h2 - 0.347107) < 1e-4);
  });

  test('the split is a genuine bypass, not just a priority weight: scarce pool still serves the hospital first', () => {
    // Pool (5) is smaller than the hospital's own cap (8) and much
    // smaller than combined demand (20). If life_support_flag were only
    // a priority *weight* (as hardshipScore.js alone would treat it),
    // Nash welfare would still give the ordinary households a
    // meaningful share here. A genuine bypass gives the hospital the
    // entire pool and leaves Tier 1 with nothing.
    const result = allocateTiered(households, 5, HARDSHIP_POLICY_V1);
    assert.ok(Math.abs(result.combinedAllocationKwh.hospital_1 - 5) < 1e-6);
    assert.equal(result.combinedAllocationKwh.h1, 0);
    assert.equal(result.combinedAllocationKwh.h2, 0);
    assert.equal(result.tier1Result, null);
  });
});

describe('allocateTiered — multiple Tier 0 households', () => {
  test('two life-support households split a scarce pool fairly by their own hardship weight, not by arrival order', () => {
    const households = [
      { id: 'hosp_a', life_support_flag: 1, income_gap: 0.9, area_disadvantage: 0.9, payment_difficulty: 0.9, energy_burden: 0.9, no_solar_access: 0.9, capKwh: 10 },
      { id: 'hosp_b', life_support_flag: 1, income_gap: 0.1, area_disadvantage: 0.1, payment_difficulty: 0.1, energy_burden: 0.1, no_solar_access: 0.1, capKwh: 10 },
      { id: 'ordinary', life_support_flag: 0, income_gap: 1, area_disadvantage: 1, payment_difficulty: 1, energy_burden: 1, no_solar_access: 1, capKwh: 10 },
    ];
    // Both hospitals get hardship_score = 1.0 (override), so they split
    // the scarce pool EQUALLY regardless of their underlying factors —
    // the override makes them identical in Tier 0's eyes.
    const result = allocateTiered(households, 6, HARDSHIP_POLICY_V1);
    assert.ok(Math.abs(result.combinedAllocationKwh.hosp_a - 3) < 1e-6);
    assert.ok(Math.abs(result.combinedAllocationKwh.hosp_b - 3) < 1e-6);
    assert.equal(result.combinedAllocationKwh.ordinary, 0);
  });
});

describe('allocateTiered — edge cases', () => {
  test('no Tier 0 households: behaves exactly like a plain Tier-1-only allocation', () => {
    const households = [
      { id: 'a', life_support_flag: 0, income_gap: 0.5, area_disadvantage: 0.5, payment_difficulty: 0.5, energy_burden: 0.5, no_solar_access: 0.5, capKwh: 10 },
      { id: 'b', life_support_flag: 0, income_gap: 0.1, area_disadvantage: 0.1, payment_difficulty: 0.1, energy_burden: 0.1, no_solar_access: 0.1, capKwh: 10 },
    ];
    const result = allocateTiered(households, 5, HARDSHIP_POLICY_V1);
    assert.equal(result.tier0Result, null);
    assert.ok(Math.abs(result.combinedAllocationKwh.a + result.combinedAllocationKwh.b - 5) < 1e-6);
  });

  test('no Tier 1 households: pool leftover after Tier 0 is reported honestly, not silently dropped', () => {
    const households = [{ id: 'hosp', life_support_flag: 1, income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0, capKwh: 5 }];
    const result = allocateTiered(households, 10, HARDSHIP_POLICY_V1);
    assert.ok(Math.abs(result.combinedAllocationKwh.hosp - 5) < 1e-6);
    assert.ok(Math.abs(result.leftoverKwh - 5) < 1e-6);
  });

  test('empty household list: empty allocation, full pool reported as leftover', () => {
    const result = allocateTiered([], 10, HARDSHIP_POLICY_V1);
    assert.deepEqual(result.combinedAllocationKwh, {});
    assert.equal(result.leftoverKwh, 10);
  });

  test('extraShares is passed through unchanged to both tiers', () => {
    const households = [
      { id: 'hosp', life_support_flag: 1, income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0, capKwh: 5, extra_scores: { contribution_score: 0.8 } },
      { id: 'ord', life_support_flag: 0, income_gap: 1, area_disadvantage: 1, payment_difficulty: 1, energy_burden: 1, no_solar_access: 1, capKwh: 5, extra_scores: { contribution_score: 0.2 } },
    ];
    // Should not throw, and should not fall back to the no-extraShares path.
    assert.doesNotThrow(() => allocateTiered(households, 10, HARDSHIP_POLICY_V1, { contribution_score: 0.3 }));
  });

  test('a household missing a configured extra score throws, in either tier', () => {
    const households = [{ id: 'hosp', life_support_flag: 1, income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0, capKwh: 5 }];
    assert.throws(() => allocateTiered(households, 10, HARDSHIP_POLICY_V1, { contribution_score: 0.3 }));
  });
});

describe('allocateTiered — using the shared sample fixtures', () => {
  test('household-e (life-support, deliberately low underlying hardship) still gets served first', () => {
    const households = SAMPLE_HOUSEHOLDS_HARDSHIP.map((h) => ({ ...h, capKwh: SAMPLE_CAP_KWH }));
    // Scarce pool: less than household-e's cap alone, and far less than
    // everyone's combined demand — the scenario where a soft weight
    // would fail household-e but a hard bypass won't.
    const result = allocateTiered(households, 3, HARDSHIP_POLICY_V1);
    assert.ok(Math.abs(result.combinedAllocationKwh['household-e'] - 3) < 1e-6);
    for (const h of households) {
      if (h.id !== 'household-e') assert.equal(result.combinedAllocationKwh[h.id], 0);
    }
  });
});

describe('allocateTiered — fuzz invariants (1000 trials)', () => {
  const rand = mulberry32(20260822);
  const N_TRIALS = 1000;
  let conservationViolations = [];
  let capViolations = [];
  let bypassViolations = [];

  const randFactor = () => rand();

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const n = 1 + Math.floor(rand() * 6);
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      life_support_flag: rand() < 0.3 ? 1 : 0,
      is_high_need_area: 0,
      income_gap: randFactor(),
      area_disadvantage: randFactor(),
      payment_difficulty: randFactor(),
      energy_burden: randFactor(),
      no_solar_access: randFactor(),
      capKwh: rand() * 15,
    }));
    const poolKwh = rand() * 40;

    const result = allocateTiered(households, poolKwh, HARDSHIP_POLICY_V1);

    conservationViolations.push(
      ...checkPoolConservation({ allocationKwh: result.combinedAllocationKwh, leftoverKwh: result.leftoverKwh }, poolKwh).map(
        (v) => `trial ${trial}: ${v}`
      )
    );
    capViolations.push(
      ...checkCapsRespected(
        result.combinedAllocationKwh,
        households.map((h) => ({ id: h.id, capKwh: h.capKwh }))
      ).map((v) => `trial ${trial}: ${v}`)
    );

    // Bypass invariant: Tier 1 must receive nothing until Tier 0 is
    // either fully served (every Tier 0 household at its cap) or the
    // pool itself ran out on Tier 0. This is the property that makes
    // this module different from just feeding hardshipScore.js's
    // weight=1.0 override into a single shared pool.
    const tier1Total = result.tier1HouseholdIds.reduce((sum, id) => sum + (result.combinedAllocationKwh[id] ?? 0), 0);
    if (tier1Total > 1e-6) {
      const tier0AllAtCap = result.tier0HouseholdIds.every((id) => {
        const h = households.find((hh) => hh.id === id);
        return (result.combinedAllocationKwh[id] ?? 0) >= h.capKwh - 1e-6;
      });
      if (!tier0AllAtCap) {
        bypassViolations.push(`trial ${trial}: Tier 1 received ${tier1Total} while a Tier 0 household was still below its cap`);
      }
    }
  }

  test(`0 conservation violations across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(conservationViolations.slice(0, 10), [], `first violations: ${conservationViolations.slice(0, 10).join('; ')} (total: ${conservationViolations.length})`);
  });

  test(`0 cap violations across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(capViolations.slice(0, 10), [], `first violations: ${capViolations.slice(0, 10).join('; ')} (total: ${capViolations.length})`);
  });

  test(`0 bypass violations across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(bypassViolations.slice(0, 10), [], `first violations: ${bypassViolations.slice(0, 10).join('; ')} (total: ${bypassViolations.length})`);
  });
});

describe('allocateTieredWithReserve — composing the reserve and the hard override', () => {
  // Before this function existed, allocateWithReserve (nashWelfareSinglePool.js)
  // and allocateTiered existed as two independent mechanisms with no way
  // to use both together. These tests establish the composition: reserve
  // comes off the top unconditionally, then tiering runs on what's left.
  const households = [
    { id: 'hospital', life_support_flag: 1, income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0, capKwh: 8 },
    { id: 'ordinary', life_support_flag: 0, income_gap: 0.5, area_disadvantage: 0.4, payment_difficulty: 0.3, energy_burden: 0.6, no_solar_access: 1.0, capKwh: 6 },
  ];

  test('reserve is removed before tiering ever sees the pool', () => {
    // Pool 10, reserve 2 -> consumable 8, all of which the hospital's
    // hard override can claim (its cap is exactly 8).
    const result = allocateTieredWithReserve(households, 10, 2, HARDSHIP_POLICY_V1);
    assert.equal(result.reserveKwh, 2);
    assert.equal(result.totalPoolKwh, 10);
    assert.ok(Math.abs(result.combinedAllocationKwh.hospital - 8) < 1e-6);
    assert.equal(result.combinedAllocationKwh.ordinary, 0);
  });

  test('with no reserve, behaves identically to allocateTiered alone', () => {
    const withZeroReserve = allocateTieredWithReserve(households, 10, 0, HARDSHIP_POLICY_V1);
    const plain = allocateTiered(households, 10, HARDSHIP_POLICY_V1);
    assert.deepEqual(withZeroReserve.combinedAllocationKwh, plain.combinedAllocationKwh);
    assert.equal(withZeroReserve.reserveKwh, 0);
  });

  test('reserve larger than the pool is clamped to the full pool — nothing distributed, no error, hospital included', () => {
    const result = allocateTieredWithReserve(households, 5, 50, HARDSHIP_POLICY_V1);
    assert.equal(result.reserveKwh, 5);
    assert.equal(result.combinedAllocationKwh.hospital, 0);
    assert.equal(result.combinedAllocationKwh.ordinary, 0);
  });

  test('rejects a negative reserve', () => {
    assert.throws(() => allocateTieredWithReserve(households, 10, -1, HARDSHIP_POLICY_V1));
  });

  test('conservation holds across the full pool including the untouched reserve (50 trials)', () => {
    const rand = mulberry32(1618033);
    for (let trial = 0; trial < 50; trial++) {
      const n = 1 + Math.floor(rand() * 5);
      const trialHouseholds = Array.from({ length: n }, (_, i) => ({
        id: `h${i}`,
        life_support_flag: rand() < 0.3 ? 1 : 0,
        income_gap: rand(), area_disadvantage: rand(), payment_difficulty: rand(), energy_burden: rand(), no_solar_access: rand(),
        capKwh: rand() * 15,
      }));
      const poolKwh = rand() * 40;
      const reserveKwh = rand() * 10;

      const result = allocateTieredWithReserve(trialHouseholds, poolKwh, reserveKwh, HARDSHIP_POLICY_V1);
      const distributed = Object.values(result.combinedAllocationKwh).reduce((a, b) => a + b, 0);
      const total = distributed + result.leftoverKwh + result.reserveKwh;
      assert.ok(Math.abs(total - poolKwh) < 1e-3, `trial ${trial}: distributed(${distributed}) + leftover(${result.leftoverKwh}) + reserve(${result.reserveKwh}) = ${total}, expected ${poolKwh}`);
    }
  });
});
