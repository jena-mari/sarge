import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { waterFillingFairShareAllocate } from '../src/allocation/waterFillingFairShare.js';
import { checkSourceConservation, checkEligibilityRespected, checkCapsRespected, checkMonotonicInWeight } from '../src/fairness/checkInvariants.js';

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('waterFillingFairShareAllocate — exact hand-verifiable cases', () => {
  test('equal weights on a single source split it equally', () => {
    const sources = [{ id: 's1', capacityKwh: 30 }];
    const households = [
      { id: 'a', weight: 1, demandCapKwh: 100, eligibleSourceIds: ['s1'] },
      { id: 'b', weight: 1, demandCapKwh: 100, eligibleSourceIds: ['s1'] },
      { id: 'c', weight: 1, demandCapKwh: 100, eligibleSourceIds: ['s1'] },
    ];
    const result = waterFillingFairShareAllocate(sources, households);
    for (const id of ['a', 'b', 'c']) {
      assert.ok(Math.abs(result.householdTotalKwh[id] - 10) < 1e-6);
    }
  });

  test('weighted single-source split is proportional when nobody caps out', () => {
    const sources = [{ id: 's1', capacityKwh: 50 }];
    const households = [
      { id: 'a', weight: 2, demandCapKwh: 1000, eligibleSourceIds: ['s1'] },
      { id: 'b', weight: 3, demandCapKwh: 1000, eligibleSourceIds: ['s1'] },
    ];
    const result = waterFillingFairShareAllocate(sources, households);
    assert.ok(Math.abs(result.householdTotalKwh.a - 20) < 1e-6);
    assert.ok(Math.abs(result.householdTotalKwh.b - 30) < 1e-6);
  });

  test('a household ineligible for the only source receives nothing, others unaffected', () => {
    const sources = [{ id: 's1', capacityKwh: 10 }];
    const households = [
      { id: 'in', weight: 1, demandCapKwh: 10, eligibleSourceIds: ['s1'] },
      { id: 'out', weight: 1, demandCapKwh: 10, eligibleSourceIds: ['s2-does-not-exist'] },
    ];
    const result = waterFillingFairShareAllocate(sources, households);
    assert.ok(Math.abs(result.householdTotalKwh.in - 10) < 1e-6);
    assert.equal(result.householdTotalKwh.out, 0);
    assert.deepEqual(result.unservedHouseholds, ['out']);
  });
});

describe('waterFillingFairShareAllocate — multi-source reallocation', () => {
  test('when one source saturates, a household still draws from its other eligible sources', () => {
    const sources = [
      { id: 'small', capacityKwh: 2 },
      { id: 'large', capacityKwh: 20 },
    ];
    const households = [
      { id: 'multi', weight: 1, demandCapKwh: 15, eligibleSourceIds: ['small', 'large'] },
      { id: 'small-only', weight: 1, demandCapKwh: 15, eligibleSourceIds: ['small'] },
    ];
    const result = waterFillingFairShareAllocate(sources, households);
    // 'multi' should end up fully served (15) by combining both sources;
    // 'small-only' is capped by the small source's capacity.
    assert.ok(result.householdTotalKwh.multi > 2, 'multi should draw more than the small source alone could give');
    assert.ok(Math.abs(result.sourceUsedKwh.small - 2) < 1e-6 || result.sourceUsedKwh.small <= 2 + 1e-6);
  });

  test('conservation holds across multiple sources with overlapping eligibility', () => {
    const sources = [{ id: 's1', capacityKwh: 5 }, { id: 's2', capacityKwh: 7 }, { id: 's3', capacityKwh: 3 }];
    const households = [
      { id: 'a', weight: 1, demandCapKwh: 100, eligibleSourceIds: ['s1', 's2'] },
      { id: 'b', weight: 2, demandCapKwh: 100, eligibleSourceIds: ['s2', 's3'] },
      { id: 'c', weight: 0.5, demandCapKwh: 100, eligibleSourceIds: ['s1', 's3'] },
    ];
    const result = waterFillingFairShareAllocate(sources, households);
    const violations = checkSourceConservation(result.sourceUsedKwh, sources);
    assert.deepEqual(violations, []);
  });
});

describe('waterFillingFairShareAllocate — edge cases', () => {
  test('a single household with a single source gets min(capacity, demandCap)', () => {
    const result1 = waterFillingFairShareAllocate(
      [{ id: 's1', capacityKwh: 5 }],
      [{ id: 'a', weight: 1, demandCapKwh: 100, eligibleSourceIds: ['s1'] }]
    );
    assert.ok(Math.abs(result1.householdTotalKwh.a - 5) < 1e-6);

    const result2 = waterFillingFairShareAllocate(
      [{ id: 's1', capacityKwh: 100 }],
      [{ id: 'a', weight: 1, demandCapKwh: 5, eligibleSourceIds: ['s1'] }]
    );
    assert.ok(Math.abs(result2.householdTotalKwh.a - 5) < 1e-6);
  });

  test('zero-capacity source contributes nothing but does not error', () => {
    const result = waterFillingFairShareAllocate(
      [{ id: 'empty', capacityKwh: 0 }, { id: 'full', capacityKwh: 10 }],
      [{ id: 'a', weight: 1, demandCapKwh: 20, eligibleSourceIds: ['empty', 'full'] }]
    );
    assert.ok(Math.abs(result.householdTotalKwh.a - 10) < 1e-6);
  });

  test('empty household list returns an all-zero, valid result', () => {
    const result = waterFillingFairShareAllocate([{ id: 's1', capacityKwh: 10 }], []);
    assert.deepEqual(result.householdTotalKwh, {});
    assert.equal(result.sourceUsedKwh.s1, 0);
  });

  test('empty source list: every household is unserved, no error', () => {
    const result = waterFillingFairShareAllocate([], [{ id: 'a', weight: 1, demandCapKwh: 10, eligibleSourceIds: ['nonexistent'] }]);
    assert.deepEqual(result.unservedHouseholds, ['a']);
  });

  test('rejects a household with zero eligible sources', () => {
    assert.throws(() => waterFillingFairShareAllocate([{ id: 's1', capacityKwh: 10 }], [{ id: 'a', weight: 1, demandCapKwh: 10, eligibleSourceIds: [] }]));
  });

  test('rejects a non-positive weight', () => {
    assert.throws(() => waterFillingFairShareAllocate([{ id: 's1', capacityKwh: 10 }], [{ id: 'a', weight: 0, demandCapKwh: 10, eligibleSourceIds: ['s1'] }]));
  });

  test('rejects a negative demand cap', () => {
    assert.throws(() => waterFillingFairShareAllocate([{ id: 's1', capacityKwh: 10 }], [{ id: 'a', weight: 1, demandCapKwh: -1, eligibleSourceIds: ['s1'] }]));
  });

  test('rejects a negative source capacity', () => {
    assert.throws(() => waterFillingFairShareAllocate([{ id: 's1', capacityKwh: -1 }], [{ id: 'a', weight: 1, demandCapKwh: 10, eligibleSourceIds: ['s1'] }]));
  });

  test('is deterministic: identical input always produces identical output', () => {
    const sources = [{ id: 's1', capacityKwh: 10 }];
    const households = [{ id: 'a', weight: 0.7, demandCapKwh: 5, eligibleSourceIds: ['s1'] }, { id: 'b', weight: 0.3, demandCapKwh: 5, eligibleSourceIds: ['s1'] }];
    const r1 = waterFillingFairShareAllocate(sources, households);
    const r2 = waterFillingFairShareAllocate(sources, households);
    assert.deepEqual(r1.householdTotalKwh, r2.householdTotalKwh);
  });

  test('symmetry: identical households (weight, cap, eligibility) receive identical allocations', () => {
    const sources = [{ id: 's1', capacityKwh: 10 }];
    const households = [
      { id: 'twin1', weight: 1.5, demandCapKwh: 8, eligibleSourceIds: ['s1'] },
      { id: 'twin2', weight: 1.5, demandCapKwh: 8, eligibleSourceIds: ['s1'] },
    ];
    const result = waterFillingFairShareAllocate(sources, households);
    assert.ok(Math.abs(result.householdTotalKwh.twin1 - result.householdTotalKwh.twin2) < 1e-9);
  });
});

describe('waterFillingFairShareAllocate — fuzz invariants (1000 trials)', () => {
  const rand = mulberry32(31415926);
  const N_TRIALS = 1000;
  let violations = [];

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const nSources = 1 + Math.floor(rand() * 4);
    const sources = Array.from({ length: nSources }, (_, i) => ({ id: `s${i}`, capacityKwh: rand() * 20 }));
    const sourceIds = sources.map((s) => s.id);

    const nHouseholds = 1 + Math.floor(rand() * 6);
    const households = Array.from({ length: nHouseholds }, (_, i) => {
      const eligibleCount = 1 + Math.floor(rand() * nSources);
      const shuffled = [...sourceIds].sort(() => rand() - 0.5);
      return {
        id: `h${i}`,
        weight: 0.001 + rand() * 2,
        demandCapKwh: rand() * 15,
        eligibleSourceIds: shuffled.slice(0, eligibleCount),
      };
    });

    const result = waterFillingFairShareAllocate(sources, households);

    violations.push(
      ...checkSourceConservation(result.sourceUsedKwh, sources).map((v) => `trial ${trial}: ${v}`),
      ...checkEligibilityRespected(result.allocationKwh, households).map((v) => `trial ${trial}: ${v}`),
      ...checkCapsRespected(
        Object.fromEntries(households.map((h) => [h.id, result.householdTotalKwh[h.id]])),
        households.map((h) => ({ id: h.id, capKwh: h.demandCapKwh }))
      ).map((v) => `trial ${trial}: ${v}`)
    );
  }

  test(`0 conservation/eligibility/cap violations across ${N_TRIALS} randomized multi-source trials`, () => {
    assert.deepEqual(violations.slice(0, 10), [], `first violations: ${violations.slice(0, 10).join('; ')} (total: ${violations.length})`);
  });
});

describe('waterFillingFairShareAllocate — monotonicity fuzz (equal cap/eligibility, 500 trials)', () => {
  const rand = mulberry32(27182818);
  const N_TRIALS = 500;
  let violations = [];

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const sources = [{ id: 's1', capacityKwh: rand() * 20 }];
    const n = 2 + Math.floor(rand() * 5);
    const sharedCap = 1 + rand() * 10;
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      weight: 0.001 + rand() * 2,
      demandCapKwh: sharedCap,
      eligibleSourceIds: ['s1'],
    }));
    const result = waterFillingFairShareAllocate(sources, households);
    violations.push(...checkMonotonicInWeight(result.householdTotalKwh, households.map((h) => ({ id: h.id, weight: h.weight }))).map((v) => `trial ${trial}: ${v}`));
  }

  test(`0 monotonicity violations across ${N_TRIALS} equal-cap/eligibility randomized trials`, () => {
    assert.deepEqual(violations.slice(0, 10), [], `first violations: ${violations.slice(0, 10).join('; ')} (total: ${violations.length})`);
  });
});

describe('waterFillingFairShareAllocate — Pareto efficiency fuzz (200 trials)', () => {
  // No source should end with unused capacity while a household still
  // eligible for it is below its demand cap and could have absorbed more.
  const rand = mulberry32(16180339);
  const N_TRIALS = 200;
  let violations = [];

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const sources = [{ id: 's1', capacityKwh: rand() * 15 }];
    const n = 1 + Math.floor(rand() * 4);
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      weight: 0.01 + rand() * 2,
      demandCapKwh: rand() * 10,
      eligibleSourceIds: ['s1'],
    }));
    const result = waterFillingFairShareAllocate(sources, households);
    const spareCapacity = sources[0].capacityKwh - result.sourceUsedKwh.s1;
    if (spareCapacity > 1e-6) {
      const someoneCouldAbsorbMore = households.some((h) => result.householdTotalKwh[h.id] < h.demandCapKwh - 1e-6);
      if (someoneCouldAbsorbMore) {
        violations.push(`trial ${trial}: spare capacity ${spareCapacity} left unused while an eligible household is still under its cap`);
      }
    }
  }

  test(`no wasted capacity across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(violations, []);
  });
});
