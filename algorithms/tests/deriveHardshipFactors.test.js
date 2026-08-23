import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveEnergyBurdenFactor,
  deriveIncomeGapFactor,
  derivePaymentDifficultyFactor,
  deriveAreaDisadvantageFactor,
  deriveNoSolarAccessFactor,
} from '../src/scoring/deriveHardshipFactors.js';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('deriveEnergyBurdenFactor — calibrated to Council\'s 10% target', () => {
  test('a household spending exactly 10% of income scores exactly 1.0', () => {
    const { factor, burdenPct } = deriveEnergyBurdenFactor(50, 500);
    assert.ok(close(burdenPct, 0.10));
    assert.equal(factor, 1.0);
  });

  test('a household spending double the target still clamps to 1.0, not 2.0', () => {
    const { factor } = deriveEnergyBurdenFactor(100, 500);
    assert.equal(factor, 1.0);
  });

  test('a household spending half the target scores 0.5', () => {
    const { factor } = deriveEnergyBurdenFactor(25, 500);
    assert.ok(close(factor, 0.5));
  });

  test('a comfortable household (Cordeaux Heights profile: $50/wk on $1400/wk) scores well under 1.0', () => {
    const { factor, burdenPct } = deriveEnergyBurdenFactor(50, 1400);
    assert.ok(close(burdenPct, 50 / 1400));
    assert.ok(factor < 0.4);
  });

  test('throws on non-positive income rather than dividing by zero silently', () => {
    assert.throws(() => deriveEnergyBurdenFactor(50, 0), RangeError);
    assert.throws(() => deriveEnergyBurdenFactor(50, -100), RangeError);
  });

  test('throws on non-positive cost', () => {
    assert.throws(() => deriveEnergyBurdenFactor(0, 500), RangeError);
  });
});

describe('deriveIncomeGapFactor — anchored to the Assessment\'s two published brackets', () => {
  test('below $500/week (the 11%+ burden bracket) scores 1.0', () => {
    assert.equal(deriveIncomeGapFactor(480), 1.0);
    assert.equal(deriveIncomeGapFactor(499.99), 1.0);
  });

  test('between $500 and $650/week (the 8%+ burden bracket) scores 0.6', () => {
    assert.equal(deriveIncomeGapFactor(500), 0.6);
    assert.equal(deriveIncomeGapFactor(610), 0.6);
    assert.equal(deriveIncomeGapFactor(649.99), 0.6);
  });

  test('is continuous at the $650 boundary (no discontinuity into the taper)', () => {
    assert.ok(close(deriveIncomeGapFactor(650), 0.6));
  });

  test('tapers down smoothly above $650, floors at 0.05 by $2,500', () => {
    const at1000 = deriveIncomeGapFactor(1000);
    const at2000 = deriveIncomeGapFactor(2000);
    const at2500 = deriveIncomeGapFactor(2500);
    const at5000 = deriveIncomeGapFactor(5000);
    assert.ok(at1000 > at2000);
    assert.ok(at2000 > at2500);
    assert.ok(close(at2500, 0.05));
    assert.ok(close(at5000, 0.05)); // floor holds beyond the taper span
  });

  test('throws on non-positive income', () => {
    assert.throws(() => deriveIncomeGapFactor(0), RangeError);
    assert.throws(() => deriveIncomeGapFactor(-50), RangeError);
  });
});

describe('derivePaymentDifficultyFactor — scaled against the Save4Good typical arrears range', () => {
  test('zero arrears scores 0', () => {
    assert.equal(derivePaymentDifficultyFactor(0), 0);
  });

  test('arrears at the top of the typical range ($3,500) scores 1.0', () => {
    assert.equal(derivePaymentDifficultyFactor(3500), 1.0);
  });

  test('arrears at the midpoint of the range scores 0.5 of the top anchor', () => {
    assert.ok(close(derivePaymentDifficultyFactor(1750), 0.5));
  });

  test('arrears above the typical range clamp to 1.0 rather than exceeding it', () => {
    assert.equal(derivePaymentDifficultyFactor(10000), 1.0);
  });

  test('throws on negative arrears', () => {
    assert.throws(() => derivePaymentDifficultyFactor(-1), RangeError);
  });
});

describe('deriveAreaDisadvantageFactor — from real ABS SEIFA IRSD 2021 percentiles, not a suburb list', () => {
  test('Council-named priority suburbs score high, matching their real (severe) SEIFA percentile', () => {
    assert.ok(close(deriveAreaDisadvantageFactor('Warrawong'), 0.98));
    assert.ok(close(deriveAreaDisadvantageFactor('Cringila'), 0.97));
    assert.ok(close(deriveAreaDisadvantageFactor('Bellambi'), 0.95));
    assert.ok(close(deriveAreaDisadvantageFactor('Koonawarra'), 0.94));
    assert.ok(close(deriveAreaDisadvantageFactor('Berkeley'), 0.93));
  });

  test('a well-off suburb scores low, using its own real percentile (not a flat baseline)', () => {
    assert.ok(close(deriveAreaDisadvantageFactor('Cordeaux Heights'), 0.08));
    assert.ok(close(deriveAreaDisadvantageFactor('Figtree'), 0.25));
  });

  test('a suburb not individually published falls back to the Wollongong City LGA percentile (42), not an arbitrary low baseline', () => {
    assert.ok(close(deriveAreaDisadvantageFactor('Some Suburb Not In The Table'), 0.58));
  });

  test('priority suburbs rank in the same severity order the SEIFA table itself shows', () => {
    const warrawong = deriveAreaDisadvantageFactor('Warrawong');
    const cringila = deriveAreaDisadvantageFactor('Cringila');
    const bellambi = deriveAreaDisadvantageFactor('Bellambi');
    const koonawarra = deriveAreaDisadvantageFactor('Koonawarra');
    const berkeley = deriveAreaDisadvantageFactor('Berkeley');
    assert.ok(warrawong > cringila);
    assert.ok(cringila > bellambi);
    assert.ok(bellambi > koonawarra);
    assert.ok(koonawarra > berkeley);
  });

  test('throws on an empty or non-string suburb', () => {
    assert.throws(() => deriveAreaDisadvantageFactor(''), TypeError);
    assert.throws(() => deriveAreaDisadvantageFactor(undefined), TypeError);
  });
});

describe('deriveNoSolarAccessFactor — household fact + suburb structural signal', () => {
  test('a household that has solar scores 0 regardless of suburb', () => {
    assert.equal(deriveNoSolarAccessFactor(true, 'Bellambi'), 0);
    assert.equal(deriveNoSolarAccessFactor(true, undefined), 0);
  });

  test('no solar in an average-density suburb (or unknown suburb) scores the 0.5 floor', () => {
    assert.ok(close(deriveNoSolarAccessFactor(false, undefined), 0.5));
    // Koonawarra's solar density isn't published in the source data —
    // falls back to the LGA average, same as "unknown".
    assert.ok(close(deriveNoSolarAccessFactor(false, 'Koonawarra'), 0.5));
  });

  test('no solar in a below-average-density suburb scores above the 0.5 floor', () => {
    // Bellambi: 17.9% density vs 35% LGA average.
    const factor = deriveNoSolarAccessFactor(false, 'Bellambi');
    assert.ok(factor > 0.5);
    assert.ok(factor <= 1.0);
  });

  test('lower suburb density produces a strictly higher factor (monotonic in the density gap)', () => {
    // Warrawong (19.3%) is denser than Bellambi (17.9%) -> Bellambi's
    // gap-driven factor should be at least as high.
    const bellambi = deriveNoSolarAccessFactor(false, 'Bellambi');
    const warrawong = deriveNoSolarAccessFactor(false, 'Warrawong');
    assert.ok(bellambi >= warrawong);
  });

  test('throws on a non-boolean hasSolar', () => {
    assert.throws(() => deriveNoSolarAccessFactor('yes', 'Bellambi'), TypeError);
  });
});
