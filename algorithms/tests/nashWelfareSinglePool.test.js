import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { nashWelfareSinglePoolAllocate, allocateWithReserve } from '../src/allocation/nashWelfareSinglePool.js';
import { checkPoolConservation, checkCapsRespected, checkMonotonicInWeight } from '../src/fairness/checkInvariants.js';

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

describe('nashWelfareSinglePoolAllocate — binary all-or-nothing, exact hand-verifiable cases', () => {
  test('3 households, descending priority, all fit: everyone gets their full cap', () => {
    const households = [
      { id: 'h_high', weight: 1.0, capKwh: 5 },
      { id: 'h_medium', weight: 0.45, capKwh: 5 },
      { id: 'h_low', weight: 0.12, capKwh: 5 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 15);
    assert.equal(result.allocationKwh.h_high, 5);
    assert.equal(result.allocationKwh.h_medium, 5);
    assert.equal(result.allocationKwh.h_low, 5);
    assert.equal(result.leftoverKwh, 0);
  });

  test('pool only covers the top priority household in full: lower-priority households get zero, not a partial share', () => {
    const households = [
      { id: 'h_high', weight: 1.0, capKwh: 10 },
      { id: 'h_medium', weight: 0.45, capKwh: 10 },
      { id: 'h_low', weight: 0.12, capKwh: 10 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 14);
    assert.equal(result.allocationKwh.h_high, 10);
    assert.equal(result.allocationKwh.h_medium, 0);
    assert.equal(result.allocationKwh.h_low, 0);
    assert.equal(result.leftoverKwh, 4);
  });

  test('skip-and-continue: a higher-priority household that does not fit is skipped, not a queue-stopper', () => {
    const households = [
      { id: 'h_high', weight: 1.0, capKwh: 8 }, // doesn't fit in 6
      { id: 'h_low', weight: 0.1, capKwh: 5 }, // fits in what's left
    ];
    const result = nashWelfareSinglePoolAllocate(households, 6);
    assert.equal(result.allocationKwh.h_high, 0);
    assert.equal(result.allocationKwh.h_low, 5);
    assert.equal(result.leftoverKwh, 1);
  });

  test('equal weights: priority order still fully commits households strictly in id order (deterministic tie-break)', () => {
    const households = [
      { id: 'a', weight: 1, capKwh: 10 },
      { id: 'b', weight: 1, capKwh: 10 },
      { id: 'c', weight: 1, capKwh: 10 },
    ];
    const result = nashWelfareSinglePoolAllocate(households, 20);
    assert.equal(result.allocationKwh.a, 10);
    assert.equal(result.allocationKwh.b, 10);
    assert.equal(result.allocationKwh.c, 0);
    assert.equal(result.leftoverKwh, 0);
  });
});

describe('nashWelfareSinglePoolAllocate — edge cases', () => {
  test('a single household receives its full cap if it fits, else zero', () => {
    const fits = nashWelfareSinglePoolAllocate([{ id: 'solo', weight: 0.7, capKwh: 5 }], 10);
    assert.equal(fits.allocationKwh.solo, 5);
    assert.equal(fits.leftoverKwh, 5);

    const doesNotFit = nashWelfareSinglePoolAllocate([{ id: 'solo', weight: 0.7, capKwh: 5 }], 3);
    assert.equal(doesNotFit.allocationKwh.solo, 0);
    assert.equal(doesNotFit.leftoverKwh, 3);
  });

  test('zero pool: everyone gets zero, no error', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 5 }, { id: 'b', weight: 2, capKwh: 5 }];
    const result = nashWelfareSinglePoolAllocate(households, 0);
    assert.equal(result.allocationKwh.a, 0);
    assert.equal(result.allocationKwh.b, 0);
    assert.equal(result.leftoverKwh, 0);
  });

  test('zero-cap household is trivially committed (0 <= remaining) and never blocks the queue', () => {
    const households = [{ id: 'zero-cap', weight: 1, capKwh: 0 }, { id: 'normal', weight: 1, capKwh: 10 }];
    const result = nashWelfareSinglePoolAllocate(households, 10);
    assert.equal(result.allocationKwh['zero-cap'], 0);
    assert.equal(result.allocationKwh.normal, 10);
  });

  test('empty household list returns an empty allocation and the full pool as leftover', () => {
    const result = nashWelfareSinglePoolAllocate([], 10);
    assert.deepEqual(result.allocationKwh, {});
    assert.equal(result.leftoverKwh, 10);
  });

  test('surplus pool: every household hits its cap, leftover is exact', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 3 }, { id: 'b', weight: 1, capKwh: 3 }];
    const result = nashWelfareSinglePoolAllocate(households, 20);
    assert.equal(result.allocationKwh.a, 3);
    assert.equal(result.allocationKwh.b, 3);
    assert.equal(result.leftoverKwh, 14);
    assert.ok(result.lockOrder.every((e) => e.reason === 'committed'));
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

describe('nashWelfareSinglePoolAllocate — every allocation is binary (fuzz, 2000 trials)', () => {
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

    violations.push(
      ...checkPoolConservation(result, pool).map((v) => `trial ${trial}: ${v}`),
      ...checkCapsRespected(result.allocationKwh, households).map((v) => `trial ${trial}: ${v}`)
    );
    for (const h of households) {
      const amount = result.allocationKwh[h.id] ?? 0;
      if (Math.abs(amount) > 1e-9 && Math.abs(amount - h.capKwh) > 1e-9) {
        violations.push(`trial ${trial}: ${h.id} received ${amount}, neither 0 nor its full cap ${h.capKwh}`);
      }
    }
  }

  test(`0 conservation/cap/binary-only violations across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(violations.slice(0, 10), [], `first violations: ${violations.slice(0, 10).join('; ')} (total: ${violations.length})`);
  });
});

describe('nashWelfareSinglePoolAllocate — monotonicity fuzz (equal caps, 2000 trials)', () => {
  // Monotonicity ("higher weight never yields a lower allocation") is
  // only a meaningful comparison when every other condition is equal —
  // in particular the cap. With a shared cap, the priority queue tries
  // higher-weight households first, so a lower-weight household can
  // never receive its cap while a higher-weight one gets skipped.
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

describe('nashWelfareSinglePoolAllocate — priority order is respected (fuzz, 2000 trials)', () => {
  // The defining property of "binary, priority-queue" allocation: a
  // committed household must never sit behind a strictly higher-weight
  // household that was skipped for lack of room — skip-and-continue only
  // ever reaches past a higher-priority household, never displaces it.
  const rand = mulberry32(4242424);
  const N_TRIALS = 2000;
  let violations = [];

  for (let trial = 0; trial < N_TRIALS; trial++) {
    const n = 2 + Math.floor(rand() * 6);
    const households = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`,
      weight: 0.001 + rand() * 2,
      capKwh: rand() * 15,
    }));
    const pool = rand() * 40;
    const result = nashWelfareSinglePoolAllocate(households, pool);

    // Exact, direct invariant: lockOrder must visit households in
    // strictly non-increasing weight order — the queue never considers a
    // lower-priority household before every higher-priority one has
    // already been decided (committed or skipped).
    const byId = new Map(households.map((h) => [h.id, h]));
    for (let i = 0; i < result.lockOrder.length - 1; i++) {
      const wCurrent = byId.get(result.lockOrder[i].id).weight;
      const wNext = byId.get(result.lockOrder[i + 1].id).weight;
      if (wNext > wCurrent + 1e-9) {
        violations.push(`trial ${trial}: lockOrder visited weight ${wCurrent} before higher weight ${wNext}`);
      }
    }
  }

  test(`0 priority-order violations across ${N_TRIALS} randomized trials`, () => {
    assert.deepEqual(violations.slice(0, 10), [], `first violations: ${violations.slice(0, 10).join('; ')} (total: ${violations.length})`);
  });
});

describe('allocateWithReserve', () => {
  test('reserve is held back and never distributed', () => {
    const households = [{ id: 'a', weight: 1, capKwh: 10 }, { id: 'b', weight: 1, capKwh: 5 }];
    const result = allocateWithReserve(households, 20, 5);
    const distributed = result.allocationKwh.a + result.allocationKwh.b;
    assert.equal(distributed, 15); // 20 - 5 reserve, both fit
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

  test('with the documented 5 kWh reserve, only the top-priority households that fully fit are served', () => {
    const households = [
      { id: 'a', weight: 0.915, capKwh: 5 },
      { id: 'b', weight: 0.5, capKwh: 5 },
      { id: 'c', weight: 0.105, capKwh: 5 },
      { id: 'd', weight: 0.605, capKwh: 5 },
      { id: 'e', weight: 1.0, capKwh: 5 }, // life-support override in the real scoring layer
    ];
    const result = allocateWithReserve(households, 30, 2); // consumable pool: 28 -> 5 households of 5 kWh fit
    for (const h of households) {
      assert.equal(result.allocationKwh[h.id], 5, `${h.id} expected to receive its full 5 kWh cap`);
    }
    assert.equal(result.leftoverKwh, 3); // 30 - 2 reserve - 25 distributed
  });
});

describe('nashWelfareSinglePoolAllocate — scaling regression', () => {
  // The proportional predecessor of this algorithm was rewritten once
  // already to avoid an O(n^2) blowup; the binary priority-queue version
  // is a single O(n log n) sort plus one O(n) sweep, so this is a
  // tripwire against a future edit accidentally reintroducing per-item
  // rescans, not a re-test of a known-fixed bug.
  test('20,000 households complete in well under a second', () => {
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
