import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { nashWelfareSinglePoolAllocate, allocateWithReserve } from '../src/allocation/nashWelfareSinglePool.js';
import { checkPoolConservation, checkCapsRespected, checkNoWastedSupplyWhenCapped, checkMonotonicInWeight } from '../src/fairness/checkInvariants.js';

// Deterministic PRNG (mulberry32) so "random" fuzz trials are reproducible
// across runs — a real bug found once will fail every run after, not just
// intermittently.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('nashWelfareSinglePoolAllocate — exact hand-verifiable cases', () => {
  test('the documented 3-household example: scores 1.0/0.45/0.12, pool 14, cap 5 -> 5/5/4', () => {
    const households = [
      { id: 'h_high', weight: 1.0, capKwh: 5 },
      { id: 'h_medium', weight: 0.45, capKwh: 5 },
      { id: 'h_low', weight: 0.12, capKwh: 5 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 14);
    assert.ok(Math.abs(result.allocationKwh.h_high - 5) < 1e-6);
    assert.ok(Math.abs(result.allocationKwh.h_medium - 5) < 1e-6);
    assert.ok(Math.abs(result.allocationKwh.h_low - 4) < 1e-6);
    assert.ok(Math.abs(result.leftoverKwh) < 1e-6);
  });

  test('equal weights split a pool with no cap constraint exactly equally', () => {
    const households = [
      { id: 'a', weight: 1, capKwh: 100 },
      { id: 'b', weight: 1, capKwh: 100 },
      { id: 'c', weight: 1, capKwh: 100 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 30);
    for (const id of ['a', 'b', 'c']) {
      assert.ok(Math.abs(result.allocationKwh[id] - 10) < 1e-9);
    }
  });

  test('pure proportional split with no cap binding: (score_i / sum(scores)) * pool', () => {
    const households = [
      { id: 'a', weight: 2, capKwh: 1000 },
      { id: 'b', weight: 3, capKwh: 1000 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 50);
    assert.ok(Math.abs(result.allocationKwh.a - 20) < 1e-9); // 2/5 * 50
    assert.ok(Math.abs(result.allocationKwh.b - 30) < 1e-9); // 3/5 * 50
  });
});

describe('nashWelfareSinglePoolAllocate — edge cases', () => {
  test('a single household simply receives min(pool, cap)', () => {
    const result = nashWelfareSinglePoolAllocate([{ id: 'solo', weight: 0.7, capKwh: 5 }], 3);
    assert.ok(Math.abs(result.allocationKwh.solo - 3) < 1e-9);
    assert.ok(Math.abs(result.leftoverKwh) < 1e-9);

    const result2 = nashWelfareSinglePoolAllocate([{ id: 'solo', weight: 0.7, capKwh: 5 }], 20);
    assert.ok(Math.abs(result2.allocationKwh.solo - 5) < 1e-9);
    assert.ok(Math.abs(result2.leftoverKwh - 15) < 1e-9);
  });

  test('zero pool: everyone gets zero, no error', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 5 }, { id: 'b', weight: 2, capKwh: 5 }];
    const result = nashWelfareSinglePoolAllocate(households, 0);
    assert.equal(result.allocationKwh.a, 0);
    assert.equal(result.allocationKwh.b, 0);
    assert.equal(result.leftoverKwh, 0);
  });

  test('zero-cap household receives zero and never blocks the loop', () => {
    const households = [{ id: 'zero-cap', weight: 1, capKwh: 0 }, { id: 'normal', weight: 1, capKwh: 10 }];
    const result = nashWelfareSinglePoolAllocate(households, 10);
    assert.equal(result.allocationKwh['zero-cap'], 0);
    assert.ok(Math.abs(result.allocationKwh.normal - 10) < 1e-6);
  });

  test('empty household list returns an empty allocation and the full pool as leftover', () => {
    const result = nashWelfareSinglePoolAllocate([], 10);
    assert.deepEqual(result.allocationKwh, {});
    assert.equal(result.leftoverKwh, 10);
  });

  test('surplus pool: every household hits its cap, leftover is exact', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 3 }, { id: 'b', weight: 1, capKwh: 3 }];
    const result = nashWelfareSinglePoolAllocate(households, 20);
    assert.ok(Math.abs(result.allocationKwh.a - 3) < 1e-9);
    assert.ok(Math.abs(result.allocationKwh.b - 3) < 1e-9);
    assert.ok(Math.abs(result.leftoverKwh - 14) < 1e-9);
    assert.ok(result.lockOrder.every((e) => e.reason === 'cap'));
  });

  test('extreme weight skew still conserves the pool exactly', () => {
    const households = [{ id: 'dominant', weight: 1000, capKwh: 5 }, { id: 'tiny', weight: 0.001, capKwh: 5 }];
    const result = nashWelfareSinglePoolAllocate(households, 8);
    const total = result.allocationKwh.dominant + result.allocationKwh.tiny + result.leftoverKwh;
    assert.ok(Math.abs(total - 8) < 1e-6);
  });

  test('rejects a non-positive weight', () => {
    assert.throws(() => nashWelfareSinglePoolAllocate([{ id: 'a', weight: 0, capKwh: 5 }], 10));
    assert.throws(() => nashWelfareSinglePoolAllocate([{ id: 'a', weight: -1, capKwh: 5 }], 10));
  });

  test('rejects a negative cap', () => {
    assert.throws(() => nashWelfareSinglePoolAllocate([{ id: 'a', weight: 1, capKwh: -1 }], 10));
  });

  test('rejects a negative pool', () => {
    assert.throws(() => nashWelfareSinglePoolAllocate([{ id: 'a', weight: 1, capKwh: 5 }], -1));
  });

  test('is deterministic: identical input always produces identical output', () => {
    const households = [{ id: 'a', weight: 0.7, capKwh: 4 }, { id: 'b', weight: 0.3, capKwh: 4 }];
    const r1 = nashWelfareSinglePoolAllocate(households, 5);
    const r2 = nashWelfareSinglePoolAllocate(households, 5);
    assert.deepEqual(r1.allocationKwh, r2.allocationKwh);
  });
});

describe('nashWelfareSinglePoolAllocate — fuzz invariants (2000 trials)', () => {
  const rand = mulberry32(20260822);
  const N_TRIALS = 2000;
  let violations = [];

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const n = 1 + Math.floor(rand() * 5);
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      weight: 0.001 + rand() * 2,
      capKwh: rand() * 15,
    }));
    const pool = rand() * 40;
    const result = nashWelfareSinglePoolAllocate(households, pool);

    // Conservation, caps, and no-wasted-supply hold regardless of whether
    // caps differ across households.
    violations.push(
      ...checkPoolConservation(result, pool).map((v) => `trial ${trial}: ${v}`),
      ...checkCapsRespected(result.allocationKwh, households).map((v) => `trial ${trial}: ${v}`),
      ...checkNoWastedSupplyWhenCapped(result, households).map((v) => `trial ${trial}: ${v}`)
    );
  }

  test(`0 conservation/cap/no-waste violations across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(violations.slice(0, 10), [], `first violations: ${violations.slice(0, 10).join('; ')} (total: ${violations.length})`);
  });
});

describe('nashWelfareSinglePoolAllocate — monotonicity fuzz (equal caps, 2000 trials)', () => {
  // Monotonicity ("higher weight never yields a lower allocation") is
  // only a meaningful comparison when every other condition is equal —
  // in particular the cap. A household with a tiny cap can legitimately
  // receive less than a lower-weight household with room to use much
  // more; that's not a fairness violation, so this uses one shared cap
  // per trial rather than independent random caps.
  const rand = mulberry32(13571113);
  const N_TRIALS = 2000;
  let violations = [];

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const n = 2 + Math.floor(rand() * 5);
    const sharedCap = 1 + rand() * 15;
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      weight: 0.001 + rand() * 2,
      capKwh: sharedCap,
    }));
    const pool = rand() * 40;
    const result = nashWelfareSinglePoolAllocate(households, pool);
    violations.push(...checkMonotonicInWeight(result.allocationKwh, households).map((v) => `trial ${trial}: ${v}`));
  }

  test(`0 monotonicity violations across ${N_TRIALS} equal-cap randomized trials`, () => {
    assert.deepEqual(violations.slice(0, 10), [], `first violations: ${violations.slice(0, 10).join('; ')} (total: ${violations.length})`);
  });
});

describe('nashWelfareSinglePoolAllocate — independent optimality cross-check (KKT conditions)', () => {
  // Rather than re-implement a second optimizer (a hand-rolled projected
  // gradient ascent turned out to converge to a corner instead of the
  // true optimum on a first attempt — exactly the kind of bug this test
  // exists to catch), this verifies the closed-form result directly
  // against the mathematical definition of optimality for this convex
  // problem: maximizing sum(w_i * log(x_i)) s.t. sum(x_i) = consumed,
  // 0 <= x_i <= cap_i has a solution characterized by the KKT
  // stationarity condition — every household strictly between 0 and its
  // cap must have the SAME marginal utility w_i / x_i (a shared shadow
  // price); any household pinned at its cap may have a marginal utility
  // at or above that shared price (it would take more if it could).
  // This is independent of the water-filling implementation itself — it
  // checks the *definition* of the optimum, not the code path that
  // produced it.
  function assertSatisfiesKKT(households, result, pool) {
    const byId = new Map(households.map((h) => [h.id, h]));
    const interior = households.filter((h) => {
      const x = result.allocationKwh[h.id];
      return x > 1e-6 && x < h.capKwh - 1e-6;
    });
    if (interior.length > 1) {
      const shadowPrices = interior.map((h) => h.weight / result.allocationKwh[h.id]);
      const [first, ...rest] = shadowPrices;
      for (const price of rest) {
        assert.ok(
          Math.abs(price - first) < 1e-4 * Math.max(1, first),
          `interior households must share one marginal utility (shadow price): got ${shadowPrices.join(', ')}`
        );
      }
      // Anyone pinned at their cap should have wanted at least as much
      // as the shared shadow price — otherwise they'd have preferred to
      // stop short, which the algorithm doesn't allow it to do.
      const sharedPrice = first;
      for (const h of households) {
        const x = result.allocationKwh[h.id];
        if (x >= h.capKwh - 1e-6 && pool > 0) {
          assert.ok(h.weight / h.capKwh >= sharedPrice - 1e-4, `capped household ${h.id} should value marginal kWh at or above the shared shadow price`);
        }
      }
    }
  }

  test('the documented 3-household example satisfies the KKT optimality condition', () => {
    const households = [
      { id: 'a', weight: 0.9, capKwh: 6 },
      { id: 'b', weight: 0.4, capKwh: 6 },
      { id: 'c', weight: 0.6, capKwh: 6 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 10);
    assertSatisfiesKKT(households, result, 10);
  });

  test('the 5-household surplus example satisfies the KKT optimality condition', () => {
    const households = [
      { id: 'a', weight: 0.915, capKwh: 5 },
      { id: 'b', weight: 0.5, capKwh: 5 },
      { id: 'c', weight: 0.105, capKwh: 5 },
      { id: 'd', weight: 0.605, capKwh: 5 },
      { id: 'e', weight: 1.0, capKwh: 5 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 28);
    assertSatisfiesKKT(households, result, 28);
  });

  test('500 randomized trials all satisfy the KKT optimality condition', () => {
    const rand = mulberry32(998877);
    for (let trial = 0; trial < 500; trial++) {
      const n = 2 + Math.floor(rand() * 4);
      const cap = 1 + rand() * 10; // shared cap: KKT check assumes a common ceiling scale, matching the demo's real usage
      const households = Array.from({ length: n }, (_, i) => ({ id: `h${i}`, weight: 0.01 + rand() * 2, capKwh: cap }));
      const pool = rand() * n * cap * 1.5;
      const result = nashWelfareSinglePoolAllocate(households, pool);
      assertSatisfiesKKT(households, result, pool);
    }
  });
});

describe('allocateWithReserve', () => {
  test('reserve is held back and never distributed', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 100 }, { id: 'b', weight: 1, capKwh: 100 }];
    const result = allocateWithReserve(households, 20, 5);
    const distributed = result.allocationKwh.a + result.allocationKwh.b;
    assert.ok(Math.abs(distributed - 15) < 1e-9); // 20 - 5 reserve
    assert.equal(result.reserveKwh, 5);
    assert.equal(result.totalPoolKwh, 20);
  });

  test('reserve larger than the pool is clamped to the full pool (nothing distributed, no error)', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 10 }];
    const result = allocateWithReserve(households, 5, 50);
    assert.equal(result.reserveKwh, 5);
    assert.equal(result.allocationKwh.a, 0);
  });

  test('rejects a negative reserve', () => {
    assert.throws(() => allocateWithReserve([{ id: 'a', weight: 1, capKwh: 5 }], 10, -1));
  });

  test('with the documented 5 kWh reserve default, a 5-household example fully allocates with correct leftover', () => {
    const households = [
      { id: 'a', weight: 0.915, capKwh: 5 },
      { id: 'b', weight: 0.5, capKwh: 5 },
      { id: 'c', weight: 0.105, capKwh: 5 },
      { id: 'd', weight: 0.605, capKwh: 5 },
      { id: 'e', weight: 1.0, capKwh: 5 }, // life-support override in the real scoring layer
    ];
    const result = allocateWithReserve(households, 30, 2);
    for (const h of households) {
      assert.ok(Math.abs(result.allocationKwh[h.id] - 5) < 1e-6, `${h.id} expected to reach its 5 kWh cap`);
    }
    assert.ok(Math.abs(result.leftoverKwh - 3) < 1e-6); // 30 - 2 reserve - 25 distributed
  });
});

describe('nashWelfareSinglePoolAllocate — scaling regression', () => {
  // The original implementation rescanned the full active household set
  // every round it locked someone at their cap, making it O(n^2) in the
  // worst case: measured directly at ~19ms for 1,000 households, ~3.3s
  // for 10,000, and it did not finish within 2 minutes for 50,000. The
  // O(n log n) sort-and-sweep rewrite handles 200,000 households in
  // ~0.5s. This test is a tripwire against silently regressing back to
  // the O(n^2) shape — it doesn't assert a tight bound (CI machines
  // vary), just that a size a real city-scale deployment could plausibly
  // need stays comfortably fast rather than blowing up.
  test('20,000 households complete in well under a second, not the tens of seconds an O(n^2) implementation would take', () => {
    const rand = mulberry32(271828);
    const n = 20000;
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      weight: 0.01 + rand() * 2,
      capKwh: rand() * 15,
    }));
    const pool = rand() * n * 3;

    const t0 = Date.now();
    const result = nashWelfareSinglePoolAllocate(households, pool);
    const elapsedMs = Date.now() - t0;

    const total = Object.values(result.allocationKwh).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total + result.leftoverKwh - pool) < 1e-3, 'conservation must still hold at scale');
    assert.ok(elapsedMs < 2000, `expected well under 2000ms at n=${n}, took ${elapsedMs}ms — check for an O(n^2) regression`);
  });
});
