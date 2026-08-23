import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { explainAllocation } from '../src/explain/explainAllocation.js';
import { computeHardshipScore, computePriorityWeight } from '../src/scoring/hardshipScore.js';
import { HARDSHIP_POLICY_V1 } from '../policies/hardshipPolicyV1.js';

const NOT_OVERRIDDEN_HOUSEHOLD = {
  id: 'test-hh-1',
  life_support_flag: 0,
  is_high_need_area: 0,
  income_gap: 0.9,
  area_disadvantage: 0.8,
  payment_difficulty: 0.6,
  energy_burden: 0.95,
  no_solar_access: 0.7,
};

const OVERRIDDEN_HOUSEHOLD = {
  id: 'test-hh-2',
  life_support_flag: 1,
  is_high_need_area: 0,
  income_gap: 0.1,
  area_disadvantage: 0.1,
  payment_difficulty: 0.05,
  energy_burden: 0.2,
  no_solar_access: 0.0,
};

describe('explainAllocation — non-overridden household', () => {
  const priorityWeight = computePriorityWeight(NOT_OVERRIDDEN_HOUSEHOLD, HARDSHIP_POLICY_V1);
  const explanation = explainAllocation({
    household: NOT_OVERRIDDEN_HOUSEHOLD,
    policy: HARDSHIP_POLICY_V1,
    priorityWeight,
    tier: 'tier1',
    allocatedKwh: 5.25,
    capKwh: 7,
    suburb: 'Bellambi',
    weeklyEnergyBurdenPct: 0.12,
  });

  test('hardshipScore matches the direct computation', () => {
    assert.equal(explanation.hardshipScore, computeHardshipScore(NOT_OVERRIDDEN_HOUSEHOLD, HARDSHIP_POLICY_V1));
  });

  test('no override is reported', () => {
    assert.equal(explanation.overrideApplied, null);
  });

  test('factorBreakdown has all 5 factors, sorted by contribution descending', () => {
    assert.equal(explanation.factorBreakdown.length, 5);
    for (let i = 0; i < explanation.factorBreakdown.length - 1; i++) {
      assert.ok(explanation.factorBreakdown[i].weightedContribution >= explanation.factorBreakdown[i + 1].weightedContribution);
    }
  });

  test('factorBreakdown weighted contributions sum to the formula-only score', () => {
    const sum = explanation.factorBreakdown.reduce((a, f) => a + f.weightedContribution, 0);
    assert.ok(Math.abs(sum - explanation.formulaOnlyScore) < 1e-9);
  });

  test('pctOfFormulaScore values sum to 1.0 across factors', () => {
    const sum = explanation.factorBreakdown.reduce((a, f) => a + f.pctOfFormulaScore, 0);
    assert.ok(Math.abs(sum - 1.0) < 1e-9);
  });

  test('pctOfCap is computed correctly', () => {
    assert.ok(Math.abs(explanation.pctOfCap - 5.25 / 7) < 1e-9);
  });

  test('tierReason references composite-weighted Nash welfare, not a bypass', () => {
    assert.match(explanation.tierReason, /composite-weighted Nash welfare/);
  });

  test('councilContext correctly flags exceeding the 10% target', () => {
    assert.equal(explanation.councilContext.exceedsCouncilTarget, true);
    assert.equal(explanation.councilContext.councilTargetPct, 0.10);
  });

  test('suburbContext correctly flags a Council priority suburb', () => {
    assert.equal(explanation.suburbContext.isCouncilPrioritySuburb, true);
  });

  test('suburbContext.seifa resolves via the tiered ABS SAL / profile.id / LGA-default rule, not the old flat percentile lookup', () => {
    assert.equal(explanation.suburbContext.seifa.source, 'ABS SAL');
    assert.equal(explanation.suburbContext.seifa.decile, 1);
    assert.equal(explanation.suburbContext.seifa.percentile, 5);
  });

  test('plainLanguageSummary names the SEIFA source tier explicitly', () => {
    assert.match(explanation.plainLanguageSummary, /via ABS SAL/);
    assert.match(explanation.plainLanguageSummary, /percentile 5/);
  });

  test('plainLanguageSummary mentions the allocated amount and cap', () => {
    assert.match(explanation.plainLanguageSummary, /5\.25 kWh/);
    assert.match(explanation.plainLanguageSummary, /7\.00 kWh/);
  });
});

describe('explainAllocation — suburb with no individual ABS SAL or profile.id entry', () => {
  test('suburbContext.seifa reports the LGA-wide default, and no SEIFA sentence is added', () => {
    const priorityWeight = computePriorityWeight(NOT_OVERRIDDEN_HOUSEHOLD, HARDSHIP_POLICY_V1);
    const explanation = explainAllocation({
      household: NOT_OVERRIDDEN_HOUSEHOLD,
      policy: HARDSHIP_POLICY_V1,
      priorityWeight,
      tier: 'tier1',
      allocatedKwh: 5.25,
      capKwh: 7,
      suburb: 'Nowhere In Any Dataset',
      weeklyEnergyBurdenPct: 0.12,
    });
    assert.equal(explanation.suburbContext.seifa.source, 'LGA-wide default');
    assert.doesNotMatch(explanation.plainLanguageSummary, /national SEIFA disadvantage percentile/);
  });
});

describe('explainAllocation — overridden (life-support) household', () => {
  const priorityWeight = computePriorityWeight(OVERRIDDEN_HOUSEHOLD, HARDSHIP_POLICY_V1);
  const explanation = explainAllocation({
    household: OVERRIDDEN_HOUSEHOLD,
    policy: HARDSHIP_POLICY_V1,
    priorityWeight,
    tier: 'tier0',
    allocatedKwh: 8,
    capKwh: 8,
    weeklyEnergyBurdenPct: 0.04,
  });

  test('hardshipScore is 1.0 regardless of the low underlying factors', () => {
    assert.equal(explanation.hardshipScore, 1.0);
  });

  test('overrideApplied names the life_support_flag', () => {
    assert.equal(explanation.overrideApplied, 'life_support_flag');
  });

  test('formulaOnlyScore reveals the low would-be score the override bypassed', () => {
    // 0.30*0.1 + 0.25*0.1 + 0.20*0.05 + 0.15*0.2 + 0.10*0.0 = 0.095
    assert.ok(Math.abs(explanation.formulaOnlyScore - 0.095) < 1e-9);
    assert.ok(explanation.formulaOnlyScore < explanation.hardshipScore);
  });

  test('tierReason references the life-support register bypass', () => {
    assert.match(explanation.tierReason, /life-support/);
  });

  test('councilContext correctly flags NOT exceeding the 10% target', () => {
    assert.equal(explanation.councilContext.exceedsCouncilTarget, false);
  });

  test('suburbContext is null when no suburb was supplied', () => {
    assert.equal(explanation.suburbContext, null);
  });

  test('plainLanguageSummary mentions both the override and the bypassed formula score', () => {
    assert.match(explanation.plainLanguageSummary, /life_support_flag/);
    assert.match(explanation.plainLanguageSummary, /0\.095/);
  });
});

describe('explainAllocation — input validation', () => {
  test('throws on an invalid tier value', () => {
    assert.throws(
      () =>
        explainAllocation({
          household: NOT_OVERRIDDEN_HOUSEHOLD,
          policy: HARDSHIP_POLICY_V1,
          priorityWeight: 0.5,
          tier: 'tier99',
          allocatedKwh: 1,
          capKwh: 1,
        }),
      TypeError
    );
  });

  test('councilContext is null when weeklyEnergyBurdenPct is not supplied', () => {
    const explanation = explainAllocation({
      household: NOT_OVERRIDDEN_HOUSEHOLD,
      policy: HARDSHIP_POLICY_V1,
      priorityWeight: 0.5,
      tier: 'tier1',
      allocatedKwh: 1,
      capKwh: 7,
    });
    assert.equal(explanation.councilContext, null);
  });
});
