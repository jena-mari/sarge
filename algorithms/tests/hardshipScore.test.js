import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { computeHardshipScore, computePriorityWeight, overrideReason } from '../src/scoring/hardshipScore.js';
import { HARDSHIP_POLICY_V1 } from '../policies/hardshipPolicyV1.js';
import { SAMPLE_HOUSEHOLDS_HARDSHIP } from '../fixtures/sampleHouseholds.js';

describe('computeHardshipScore — weighted formula', () => {
  test('matches the hand-computed value for household A', () => {
    const [a] = SAMPLE_HOUSEHOLDS_HARDSHIP;
    // 0.30*1.0 + 0.25*1.0 + 0.20*0.8 + 0.15*0.9 + 0.10*0.7 = 0.915
    assert.ok(Math.abs(computeHardshipScore(a, HARDSHIP_POLICY_V1) - 0.915) < 1e-9);
  });

  test('matches the hand-computed value for household B', () => {
    const [, b] = SAMPLE_HOUSEHOLDS_HARDSHIP;
    // 0.30*0.5 + 0.25*0.4 + 0.20*0.3 + 0.15*0.6 + 0.10*1.0 = 0.50
    assert.ok(Math.abs(computeHardshipScore(b, HARDSHIP_POLICY_V1) - 0.5) < 1e-9);
  });

  test('all-zero factors give a score of exactly 0', () => {
    const h = { id: 'z', income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0 };
    assert.equal(computeHardshipScore(h, HARDSHIP_POLICY_V1), 0);
  });

  test('all-one factors give a score of exactly 1', () => {
    const h = { id: 'o', income_gap: 1, area_disadvantage: 1, payment_difficulty: 1, energy_burden: 1, no_solar_access: 1 };
    assert.equal(computeHardshipScore(h, HARDSHIP_POLICY_V1), 1);
  });

  test('throws on a missing factor rather than silently treating it as 0', () => {
    const h = { id: 'missing', income_gap: 0.5, area_disadvantage: 0.5, payment_difficulty: 0.5, energy_burden: 0.5 };
    assert.throws(() => computeHardshipScore(h, HARDSHIP_POLICY_V1), TypeError);
  });

  test('policy weights sum to 1.00', () => {
    const sum = Object.values(HARDSHIP_POLICY_V1.weights).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
  });
});

describe('computeHardshipScore — out-of-range inputs are rejected, not silently clamped', () => {
  // Regression coverage for a real gap found by direct testing: a factor
  // value of 25.0 — the signature of an upstream normalization bug, e.g.
  // a raw dollar figure reaching this function instead of a 0-1 ratio —
  // used to clamp silently to 1.0, indistinguishable from a household
  // that's genuinely at maximum hardship on that factor.
  test('a factor far above 1 throws a RangeError rather than clamping to 1.0', () => {
    const h = { id: 'bad-high', income_gap: 25.0, area_disadvantage: 0.5, payment_difficulty: 0.5, energy_burden: 0.5, no_solar_access: 0.5 };
    assert.throws(() => computeHardshipScore(h, HARDSHIP_POLICY_V1), RangeError);
  });

  test('a negative factor throws a RangeError rather than clamping to 0.0', () => {
    const h = { id: 'bad-low', income_gap: -3.0, area_disadvantage: 0.5, payment_difficulty: 0.5, energy_burden: 0.5, no_solar_access: 0.5 };
    assert.throws(() => computeHardshipScore(h, HARDSHIP_POLICY_V1), RangeError);
  });

  test('values at the exact boundary (0 and 1) are still accepted', () => {
    const h = { id: 'boundary', income_gap: 0, area_disadvantage: 1, payment_difficulty: 0, energy_burden: 1, no_solar_access: 0.5 };
    assert.doesNotThrow(() => computeHardshipScore(h, HARDSHIP_POLICY_V1));
  });

  test('tiny float noise just past the boundary (e.g. 1.0000000001) is tolerated, not rejected', () => {
    const h = { id: 'float-noise', income_gap: 1 + 1e-12, area_disadvantage: 0.5, payment_difficulty: 0.5, energy_burden: 0.5, no_solar_access: 0.5 };
    assert.doesNotThrow(() => computeHardshipScore(h, HARDSHIP_POLICY_V1));
  });

  test('an out-of-range factor still throws even when it would not have changed the outcome much', () => {
    // Guards against a "clamp first, validate second" regression — the
    // point is to catch bad data regardless of how much it would have
    // moved the final score.
    const h = { id: 'small-overshoot', income_gap: 1.2, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0 };
    assert.throws(() => computeHardshipScore(h, HARDSHIP_POLICY_V1), RangeError);
  });

  test('override flags short-circuit before range validation runs (a life-support household with garbage factor data still gets 1.0, not an error)', () => {
    const h = { id: 'override-with-bad-data', life_support_flag: 1, income_gap: 999, area_disadvantage: -50, payment_difficulty: 0.5, energy_burden: 0.5, no_solar_access: 0.5 };
    assert.equal(computeHardshipScore(h, HARDSHIP_POLICY_V1), 1.0);
  });
});

describe('computeHardshipScore — hard overrides', () => {
  test('life_support_flag forces score to 1.0 regardless of low weighted factors', () => {
    const [, , , , e] = SAMPLE_HOUSEHOLDS_HARDSHIP;
    assert.equal(e.life_support_flag, 1);
    assert.equal(computeHardshipScore(e, HARDSHIP_POLICY_V1), 1.0);
  });

  test('the weighted-only score for the life-support household would have been much lower', () => {
    const [, , , , e] = SAMPLE_HOUSEHOLDS_HARDSHIP;
    const withoutOverride = { ...e, life_support_flag: 0 };
    const weightedOnly = computeHardshipScore(withoutOverride, HARDSHIP_POLICY_V1);
    assert.ok(weightedOnly < 0.25, `expected a low weighted-only score, got ${weightedOnly}`);
  });

  test('is_high_need_area alone also forces score to 1.0', () => {
    const h = { id: 'hn', is_high_need_area: 1, income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0 };
    assert.equal(computeHardshipScore(h, HARDSHIP_POLICY_V1), 1.0);
  });

  test('both flags set simultaneously still just gives 1.0 (no double-counting)', () => {
    const h = { id: 'both', life_support_flag: 1, is_high_need_area: 1, income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0 };
    assert.equal(computeHardshipScore(h, HARDSHIP_POLICY_V1), 1.0);
  });

  test('overrideReason reports which flag caused the override', () => {
    const [, , , , e] = SAMPLE_HOUSEHOLDS_HARDSHIP;
    assert.equal(overrideReason(e, HARDSHIP_POLICY_V1), 'life_support_flag');
    const normal = SAMPLE_HOUSEHOLDS_HARDSHIP[0];
    assert.equal(overrideReason(normal, HARDSHIP_POLICY_V1), null);
  });

  test('override short-circuits before any factor is even read (missing factors do not throw)', () => {
    const h = { id: 'override-only', life_support_flag: 1 };
    assert.equal(computeHardshipScore(h, HARDSHIP_POLICY_V1), 1.0);
  });
});

describe('computePriorityWeight', () => {
  test('reduces to the hardship score alone when no extra shares are given', () => {
    const [a] = SAMPLE_HOUSEHOLDS_HARDSHIP;
    assert.equal(computePriorityWeight(a, HARDSHIP_POLICY_V1), computeHardshipScore(a, HARDSHIP_POLICY_V1));
  });

  test('never returns exactly 0 even for a household with all-zero factors (Nash welfare needs weight > 0)', () => {
    const h = { id: 'z', income_gap: 0, area_disadvantage: 0, payment_difficulty: 0, energy_burden: 0, no_solar_access: 0 };
    assert.ok(computePriorityWeight(h, HARDSHIP_POLICY_V1) > 0);
  });

  test('combines hardship with an extra score via weighted geometric mean', () => {
    const h = {
      id: 'combo',
      income_gap: 1, area_disadvantage: 1, payment_difficulty: 1, energy_burden: 1, no_solar_access: 1, // hardship = 1.0
      extra_scores: { contribution_score: 0.5 },
    };
    const weight = computePriorityWeight(h, HARDSHIP_POLICY_V1, { contribution_score: 0.3 });
    // hardship^0.7 * contribution^0.3 = 1^0.7 * 0.5^0.3
    const expected = Math.pow(1, 0.7) * Math.pow(0.5, 0.3);
    assert.ok(Math.abs(weight - expected) < 1e-9);
  });

  test('throws when an extra share is configured but the household is missing that score', () => {
    const h = { id: 'no-extra', income_gap: 0.5, area_disadvantage: 0.5, payment_difficulty: 0.5, energy_burden: 0.5, no_solar_access: 0.5 };
    assert.throws(() => computePriorityWeight(h, HARDSHIP_POLICY_V1, { contribution_score: 0.3 }));
  });
});
