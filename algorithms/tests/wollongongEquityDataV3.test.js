import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  ABS_SAL_DECILE_BY_SUBURB,
  ABS_SAL_LOCALITIES_WITHOUT_SCORE,
  createAreaDisadvantageResolver,
  resolveAreaDisadvantage,
} from '../policies/wollongongEquityDataV3.js';
import { WOLLONGONG_LGA_SEIFA_IRSD, IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD } from '../policies/wollongongEquityDataV2.js';

const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('resolveAreaDisadvantage — Tier 1 (ABS SAL), real production wiring', () => {
  test('a decile-1 suburb resolves via ABS SAL to area_disadvantage 1.0 and is_high_need_area true', () => {
    const result = resolveAreaDisadvantage('Warrawong');
    assert.equal(result.source, 'ABS SAL');
    assert.equal(result.decile, 1);
    assert.equal(result.percentile, 2);
    assert.equal(result.area_disadvantage, 1.0);
    assert.equal(result.is_high_need_area, true);
    assert.equal(result.matchedArea, 'Warrawong');
  });

  test('a decile-10 (least disadvantaged) suburb resolves to area_disadvantage 0 and is_high_need_area false', () => {
    const result = resolveAreaDisadvantage('Cordeaux Heights');
    assert.equal(result.source, 'ABS SAL');
    assert.equal(result.decile, 10);
    assert.equal(result.area_disadvantage, 0);
    assert.equal(result.is_high_need_area, false);
  });

  test('a mid-decile suburb (Figtree, decile 8) computes (10 - decile) / 9 exactly', () => {
    const result = resolveAreaDisadvantage('Figtree');
    assert.equal(result.decile, 8);
    assert.ok(close(result.area_disadvantage, (10 - 8) / 9));
  });

  test('is_high_need_area is true only at decile 1, not decile 2 — a real boundary case', () => {
    assert.equal(resolveAreaDisadvantage('Warrawong').decile, 1);
    assert.equal(resolveAreaDisadvantage('Warrawong').is_high_need_area, true);
    assert.equal(resolveAreaDisadvantage('Fernhill').decile, 2);
    assert.equal(resolveAreaDisadvantage('Fernhill').is_high_need_area, false);
  });

  test('the Unanderra fix: resolves via ABS SAL as its own suburb, decile 1, high-need true', () => {
    // This is the specific case the tiered rule exists for. Before this
    // resolver, area_disadvantage came from wollongongEquityDataV2.js's
    // profile.id table alone, which blends Unanderra into "Unanderra -
    // Kembla Grange" (percentile 14, NOT high-need — see
    // wollongongEquityDataV2.test.js, which still correctly documents
    // that as v2's own, isolated behaviour). ABS SAL draws Unanderra as
    // its own suburb and shows its real, individual disadvantage.
    const result = resolveAreaDisadvantage('Unanderra');
    assert.equal(result.source, 'ABS SAL');
    assert.equal(result.decile, 1);
    assert.equal(result.is_high_need_area, true);
    assert.equal(result.area_disadvantage, 1.0);
  });

  test('the six real ABS SAL decile-1 suburbs are exactly Council\'s five priority suburbs plus Unanderra', () => {
    const decileOne = Object.entries(ABS_SAL_DECILE_BY_SUBURB)
      .filter(([, v]) => v.decile === 1)
      .map(([name]) => name)
      .sort();
    assert.deepEqual(decileOne, ['Bellambi', 'Berkeley', 'Cringila', 'Koonawarra', 'Unanderra', 'Warrawong'].sort());
  });

  test('ABS SAL is checked before profile.id even for a suburb profile.id also covers (Tier 1 wins, not just "no Tier 2 match")', () => {
    // Dapto is an alias in wollongongEquityDataV2.js ("Dapto -
    // Brownsville") — if this resolved via profile.id, matchedArea
    // would be the compound name. It should not: ABS SAL has "Dapto"
    // directly, so Tier 1 wins outright.
    const result = resolveAreaDisadvantage('Dapto');
    assert.equal(result.source, 'ABS SAL');
    assert.equal(result.matchedArea, 'Dapto');
  });

  test('decile ties at the same area_disadvantage value even when percentile differs (a real, disclosed precision limit)', () => {
    // Warrawong (percentile 2) and Berkeley (percentile 7) are both
    // decile 1 — the graded factor cannot distinguish them, even though
    // the underlying percentile does. This is the documented tradeoff
    // of Tier 1's coarser (decile) grain vs Tier 2's percentile grain.
    const warrawong = resolveAreaDisadvantage('Warrawong');
    const berkeley = resolveAreaDisadvantage('Berkeley');
    assert.equal(warrawong.area_disadvantage, berkeley.area_disadvantage);
    assert.ok(warrawong.percentile < berkeley.percentile);
  });

  test('every real ABS SAL entry satisfies area_disadvantage === (10 - decile) / 9 exactly', () => {
    for (const [suburb, { decile }] of Object.entries(ABS_SAL_DECILE_BY_SUBURB)) {
      const result = resolveAreaDisadvantage(suburb);
      assert.ok(close(result.area_disadvantage, (10 - decile) / 9), `${suburb}: expected (10-${decile})/9`);
    }
  });

  test('every real ABS SAL entry has a decile in [1,10] and a percentile in [1,100]', () => {
    for (const [suburb, { decile, percentile }] of Object.entries(ABS_SAL_DECILE_BY_SUBURB)) {
      assert.ok(decile >= 1 && decile <= 10, `${suburb} decile out of range: ${decile}`);
      assert.ok(percentile >= 1 && percentile <= 100, `${suburb} percentile out of range: ${percentile}`);
    }
  });

  test('is deterministic: calling twice with the same suburb returns identical results', () => {
    assert.deepEqual(resolveAreaDisadvantage('Warrawong'), resolveAreaDisadvantage('Warrawong'));
  });
});

describe('resolveAreaDisadvantage — Tier 3 (LGA-wide default), real production wiring', () => {
  test('the three confirmed no-score SAL localities fall through to the LGA-wide default', () => {
    for (const suburb of ABS_SAL_LOCALITIES_WITHOUT_SCORE) {
      const result = resolveAreaDisadvantage(suburb);
      assert.equal(result.source, 'LGA-wide default');
      assert.equal(result.is_high_need_area, false);
      assert.ok(close(result.area_disadvantage, (100 - WOLLONGONG_LGA_SEIFA_IRSD.percentile) / 99));
    }
  });

  test('the no-score localities are genuinely absent from ABS_SAL_DECILE_BY_SUBURB (structural consistency)', () => {
    for (const suburb of ABS_SAL_LOCALITIES_WITHOUT_SCORE) {
      assert.equal(ABS_SAL_DECILE_BY_SUBURB[suburb], undefined);
    }
  });

  test('a totally unknown suburb name falls through both tiers to the LGA-wide default', () => {
    const result = resolveAreaDisadvantage('Nowhere In Any Dataset');
    assert.equal(result.source, 'LGA-wide default');
    assert.equal(result.is_high_need_area, false);
    assert.equal(result.percentile, WOLLONGONG_LGA_SEIFA_IRSD.percentile);
  });

  test('lookup is case-sensitive and exact — a differently-cased real suburb name is treated as unknown, not normalized', () => {
    const result = resolveAreaDisadvantage('warrawong');
    assert.equal(result.source, 'LGA-wide default', 'exact-match lookup should not silently case-fold');
  });
});

describe('createAreaDisadvantageResolver — Tier 2 (profile.id fallback), synthetic fixtures', () => {
  // Real Wollongong data never actually reaches Tier 2 (ABS SAL already
  // covers every suburb this codebase names) — these tests inject
  // synthetic data sources to exercise the tier the real data can't,
  // rather than fabricating a fake "gap" in real ABS/profile.id data.

  test('a suburb absent from Tier 1 but present (non-fallback) in Tier 2 resolves via profile.id', () => {
    const resolve = createAreaDisadvantageResolver({
      absSalBySuburb: {}, // deliberately empty — forces a Tier 1 miss
      seifaForSuburb: (suburb) => ({ percentile: 14, isLgaFallback: false, matchedArea: `${suburb} (synthetic profile area)` }),
      lgaSeifa: { percentile: 42 },
    });
    const result = resolve('Synthetic Suburb');
    assert.equal(result.source, 'profile.id');
    assert.ok(close(result.area_disadvantage, (100 - 14) / 99));
    assert.equal(result.matchedArea, 'Synthetic Suburb (synthetic profile area)');
  });

  test('Tier 2 is_high_need_area boundary: percentile exactly at the threshold is high-need, one above is not', () => {
    const resolveAtThreshold = createAreaDisadvantageResolver({
      absSalBySuburb: {},
      seifaForSuburb: () => ({ percentile: IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD, isLgaFallback: false, matchedArea: 'x' }),
      lgaSeifa: { percentile: 42 },
    });
    assert.equal(resolveAtThreshold('x').is_high_need_area, true);

    const resolveJustAbove = createAreaDisadvantageResolver({
      absSalBySuburb: {},
      seifaForSuburb: () => ({ percentile: IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD + 1, isLgaFallback: false, matchedArea: 'x' }),
      lgaSeifa: { percentile: 42 },
    });
    assert.equal(resolveJustAbove('x').is_high_need_area, false);
  });

  test('a custom highNeedPercentileThreshold overrides the default', () => {
    const resolve = createAreaDisadvantageResolver({
      absSalBySuburb: {},
      seifaForSuburb: () => ({ percentile: 20, isLgaFallback: false, matchedArea: 'x' }),
      lgaSeifa: { percentile: 42 },
      highNeedPercentileThreshold: 25,
    });
    assert.equal(resolve('x').is_high_need_area, true);
  });

  test('Tier 1 present always wins over Tier 2, even when injected Tier 2 data also exists', () => {
    const resolve = createAreaDisadvantageResolver({
      absSalBySuburb: { Warrawong: { decile: 5, percentile: 50 } },
      seifaForSuburb: () => ({ percentile: 2, isLgaFallback: false, matchedArea: 'Warrawong (profile.id)' }),
      lgaSeifa: { percentile: 42 },
    });
    const result = resolve('Warrawong');
    assert.equal(result.source, 'ABS SAL');
    assert.equal(result.decile, 5);
  });

  test('falls through to Tier 3 when both injected sources miss', () => {
    const resolve = createAreaDisadvantageResolver({
      absSalBySuburb: {},
      seifaForSuburb: () => ({ percentile: 42, isLgaFallback: true, matchedArea: 'LGA average' }),
      lgaSeifa: { percentile: 33 },
    });
    const result = resolve('Anything');
    assert.equal(result.source, 'LGA-wide default');
    assert.ok(close(result.area_disadvantage, (100 - 33) / 99));
  });
});

describe('resolveAreaDisadvantage / createAreaDisadvantageResolver — input validation', () => {
  test('throws TypeError on an empty string', () => {
    assert.throws(() => resolveAreaDisadvantage(''), TypeError);
  });

  test('throws TypeError on a whitespace-only string', () => {
    assert.throws(() => resolveAreaDisadvantage('   '), TypeError);
  });

  test('throws TypeError on undefined, null, and non-string types', () => {
    assert.throws(() => resolveAreaDisadvantage(undefined), TypeError);
    assert.throws(() => resolveAreaDisadvantage(null), TypeError);
    assert.throws(() => resolveAreaDisadvantage(42), TypeError);
    assert.throws(() => resolveAreaDisadvantage({ suburb: 'Warrawong' }), TypeError);
  });
});
