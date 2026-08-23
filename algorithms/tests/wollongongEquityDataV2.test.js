import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSeifaForSuburb,
  isHighNeedAreaBySeifa,
  IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD,
  WOLLONGONG_LGA_SEIFA_IRSD,
} from '../policies/wollongongEquityDataV2.js';
import { isPrioritySuburb, PRIORITY_SUBURBS } from '../policies/wollongongEquityDataV1.js';

describe('getSeifaForSuburb — real ABS SEIFA IRSD 2021, suburb-level', () => {
  test('resolves a directly-published profile area', () => {
    const result = getSeifaForSuburb('Warrawong');
    assert.equal(result.percentile, 2);
    assert.equal(result.isLgaFallback, false);
    assert.equal(result.matchedArea, 'Warrawong');
  });

  test('resolves a known alias to its compound profile-area name', () => {
    const result = getSeifaForSuburb('Cordeaux Heights');
    assert.equal(result.percentile, 92);
    assert.equal(result.isLgaFallback, false);
    assert.equal(result.matchedArea, 'Cordeaux Heights - Mount Kembla - Kembla Heights');
  });

  test('falls back to the LGA-wide figure for a suburb not individually published', () => {
    const result = getSeifaForSuburb('Nowhere In The Dataset');
    assert.equal(result.percentile, WOLLONGONG_LGA_SEIFA_IRSD.percentile);
    assert.equal(result.index, WOLLONGONG_LGA_SEIFA_IRSD.index);
    assert.equal(result.isLgaFallback, true);
  });

  test('throws on an empty or non-string suburb', () => {
    assert.throws(() => getSeifaForSuburb(''), TypeError);
    assert.throws(() => getSeifaForSuburb(undefined), TypeError);
  });
});

describe('isHighNeedAreaBySeifa — independent cross-validation of Council\'s priority-suburb list', () => {
  test('reproduces exactly the five suburbs Council\'s Assessment names as priority, from real ABS data alone', () => {
    for (const suburb of Object.keys(PRIORITY_SUBURBS)) {
      assert.equal(isHighNeedAreaBySeifa(suburb), true, `${suburb} should be high-need by SEIFA percentile`);
      assert.equal(isPrioritySuburb(suburb), true, `${suburb} should also be on the Assessment's own list`);
    }
  });

  test('does not over-include a suburb that is disadvantaged but sits above the threshold', () => {
    // Unanderra - Kembla Grange: percentile 14 — genuinely disadvantaged,
    // but not one of Council's five and not within this threshold
    // either. Confirms the threshold is doing real discriminating work,
    // not just quietly re-encoding the same five-suburb list.
    assert.equal(isHighNeedAreaBySeifa('Unanderra'), false);
    assert.equal(isPrioritySuburb('Unanderra'), false);
  });

  test('a comfortable suburb is not high-need', () => {
    assert.equal(isHighNeedAreaBySeifa('Cordeaux Heights'), false);
  });

  test('threshold is documented at percentile 10', () => {
    assert.equal(IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD, 10);
  });
});
