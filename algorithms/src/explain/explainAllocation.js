/**
 * Per-household allocation explanations.
 *
 * `algorithms/README.md`'s own design constraints say: "Version every
 * policy and preserve the inputs, output, and explanation used for each
 * run" and "Produce deterministic, auditable results." Until this file,
 * nothing in the codebase actually produced that explanation — a
 * household's hardship score and final allocation existed, but nothing
 * turned them into a human-readable "why did I get this amount" answer.
 * This closes that gap.
 *
 * Deliberately pure and framework-agnostic: takes plain data, returns a
 * plain, JSON-serializable object (see `toPlainLanguageSummary` for the
 * one human-readable string), no React/DOM/formatting-library
 * dependency. Any UI layer — a web page, a PDF report, a chatbot answer
 * — can consume the structured object directly without this module
 * needing to know anything about how it's displayed.
 */

import { computeHardshipScore, overrideReason } from '../scoring/hardshipScore.js';
import { isPrioritySuburb, COUNCIL_ENERGY_BURDEN_TARGET_PCT } from '../../policies/wollongongEquityDataV1.js';
import { getSeifaForSuburb } from '../../policies/wollongongEquityDataV2.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * The weighted-formula breakdown, computed independently of the
 * override short-circuit in computeHardshipScore — so a household whose
 * score was forced to 1.0 by an override can still see what its
 * underlying formula-only score and per-factor contributions would have
 * been. That transparency is the point: "you got the emergency bypass"
 * and "here's what your weighted score would otherwise have been" are
 * both useful things for a household or an auditor to see, not an
 * either/or.
 *
 * @param {import('../scoring/hardshipScore.js').HouseholdHardshipInput} household
 * @param {typeof import('../../policies/wollongongEquityDataV1.js')} policy
 * @returns {{ formulaOnlyScore: number, factors: Array<{ factor: string, rawValue: number, policyWeight: number, weightedContribution: number, pctOfFormulaScore: number }> }}
 */
function computeFactorBreakdown(household, policy) {
  const factors = [];
  let formulaOnlyScore = 0;
  for (const [factor, weight] of Object.entries(policy.weights)) {
    const rawValue = household[factor];
    const weightedContribution = weight * rawValue;
    formulaOnlyScore += weightedContribution;
    factors.push({ factor, rawValue, policyWeight: weight, weightedContribution });
  }
  formulaOnlyScore = clamp01(formulaOnlyScore);
  for (const f of factors) {
    f.pctOfFormulaScore = formulaOnlyScore > 1e-9 ? f.weightedContribution / formulaOnlyScore : 0;
  }
  factors.sort((a, b) => b.weightedContribution - a.weightedContribution);
  return { formulaOnlyScore, factors };
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * @param {Object} input
 * @param {import('../scoring/hardshipScore.js').HouseholdHardshipInput} input.household
 * @param {typeof import('../../policies/wollongongEquityDataV1.js')} input.policy hardship policy (e.g. HARDSHIP_POLICY_V1)
 * @param {number} input.priorityWeight the already-computed weight this household was allocated with (from computePriorityWeight)
 * @param {'tier0' | 'tier1'} input.tier
 * @param {number} input.allocatedKwh
 * @param {number} input.capKwh
 * @param {string} [input.suburb] optional — enables the Council-context section
 * @param {number} [input.weeklyEnergyBurdenPct] optional — enables the "vs Council's 10% target" comparison
 * @returns {Object} structured, JSON-serializable explanation
 */
export function explainAllocation({
  household,
  policy,
  priorityWeight,
  tier,
  allocatedKwh,
  capKwh,
  suburb,
  weeklyEnergyBurdenPct,
}) {
  if (tier !== 'tier0' && tier !== 'tier1') {
    throw new TypeError(`tier must be "tier0" or "tier1", got ${tier}`);
  }

  const override = overrideReason(household, policy);
  const hardshipScore = computeHardshipScore(household, policy);
  const { formulaOnlyScore, factors } = computeFactorBreakdown(household, policy);

  const pctOfCap = capKwh > 1e-9 ? clamp01(allocatedKwh / capKwh) : 0;

  const tierReason =
    tier === 'tier0'
      ? 'On the life-support / critical-infrastructure register — served first against the full pool before anyone in tier1, independent of hardship score.'
      : override
        ? `Hardship score forced to 1.0 by "${override}", but still allocated fairly alongside other tier1 households (a soft ceiling, not a queue bypass) rather than emptying the pool into this household alone.`
        : 'Allocated via composite-weighted Nash welfare alongside every other tier1 household, using the weighted hardship score below.';

  const councilContext =
    typeof weeklyEnergyBurdenPct === 'number'
      ? {
          weeklyEnergyBurdenPct,
          councilTargetPct: COUNCIL_ENERGY_BURDEN_TARGET_PCT,
          exceedsCouncilTarget: weeklyEnergyBurdenPct >= COUNCIL_ENERGY_BURDEN_TARGET_PCT,
        }
      : null;

  const suburbContext = suburb
    ? { suburb, isCouncilPrioritySuburb: isPrioritySuburb(suburb), seifa: getSeifaForSuburb(suburb) }
    : null;

  const summaryParts = [];
  summaryParts.push(
    `Received ${allocatedKwh.toFixed(2)} kWh, ${formatPct(pctOfCap)} of the ${capKwh.toFixed(2)} kWh this household could usefully use.`
  );
  if (override) {
    summaryParts.push(
      `This household's hardship score is fixed at 1.0 because of "${override}" — without that override, the weighted formula alone would have scored it ${formulaOnlyScore.toFixed(3)}.`
    );
  } else {
    const top = factors[0];
    summaryParts.push(
      `Hardship score: ${hardshipScore.toFixed(3)}, driven mainly by ${top.factor} (${formatPct(top.pctOfFormulaScore)} of the score).`
    );
  }
  summaryParts.push(tierReason);
  if (councilContext) {
    summaryParts.push(
      councilContext.exceedsCouncilTarget
        ? `Spending ${formatPct(councilContext.weeklyEnergyBurdenPct)} of income on energy — above Council's own 10% Energy Equity target.`
        : `Spending ${formatPct(councilContext.weeklyEnergyBurdenPct)} of income on energy — below Council's 10% Energy Equity target.`
    );
  }
  if (suburbContext?.isCouncilPrioritySuburb) {
    summaryParts.push(`${suburbContext.suburb} is one of the five suburbs Council's own Energy Equity Assessment names as highest-priority.`);
  }
  if (suburbContext?.seifa && !suburbContext.seifa.isLgaFallback) {
    summaryParts.push(
      `${suburbContext.suburb} sits at national SEIFA disadvantage percentile ${suburbContext.seifa.percentile} (ABS Census 2021) — more disadvantaged than ${100 - suburbContext.seifa.percentile}% of Australian suburbs.`
    );
  }

  return {
    householdId: household.id,
    hardshipScore,
    priorityWeight,
    overrideApplied: override,
    formulaOnlyScore,
    factorBreakdown: factors,
    tier,
    tierReason,
    allocatedKwh,
    capKwh,
    pctOfCap,
    councilContext,
    suburbContext,
    plainLanguageSummary: summaryParts.join(' '),
  };
}
