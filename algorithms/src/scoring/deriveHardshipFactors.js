/**
 * Derives the five 0-1 `hardshipScore.js` input factors from real-world
 * household and suburb figures, calibrated against the reference data
 * in `policies/wollongongEquityDataV1.js`.
 *
 * WHY THIS FILE EXISTS
 * ---------------------
 * `computeHardshipScore()` has always taken income_gap, area_disadvantage,
 * payment_difficulty, energy_burden, and no_solar_access as pre-normalized
 * 0-1 inputs and said, correctly, that normalizing them is the caller's
 * job. Until now nothing in this codebase actually did that job — the
 * fixtures used hand-picked 0-1 numbers with no derivation behind them.
 * This file is that missing derivation step for four of the five factors
 * (payment_difficulty for area_disadvantage/no_solar_access; see below),
 * each one tied to a specific, cited figure from Council's own Energy
 * Equity Assessment rather than picked by feel.
 *
 * WHAT'S GENUINELY DATA-BACKED VS. A DOCUMENTED HEURISTIC
 * ----------------------------------------------------------
 * - energy_burden: fully data-backed. Council itself defines energy
 *   hardship as spending >=10% of income on energy and uses that exact
 *   threshold as its 2030 target metric [Framework p.8, p.17]. Dividing
 *   a household's actual burden by that threshold is not a judgment
 *   call, it's using Council's own definition directly.
 * - income_gap: partially data-backed. The Assessment publishes two real
 *   income brackets and the energy-poverty rate within each
 *   [Assessment pp.6-10], but not a continuous income distribution —
 *   that would come from profile.id.com.au/wollongong, which this
 *   session's network policy blocked. The step function below uses the
 *   two real brackets as anchors and interpolates/tapers between and
 *   beyond them; the taper shape itself is a documented, reasonable
 *   choice, not sourced. Replace with a real income percentile once
 *   profile.id.com.au (or ABS Census data) is reachable.
 * - payment_difficulty: a documented heuristic. The Assessment reports a
 *   typical arrears range ($1,800-$3,500) from one real pilot program
 *   [Assessment p.10] but no formula for turning arrears into a 0-1
 *   score — the linear scaling here is our own choice, not Council's.
 * - area_disadvantage / no_solar_access: derived from real, cited
 *   suburb-level statistics (the priority-suburb list and per-suburb
 *   solar density), but applied at the suburb level, not the household
 *   level — see the methodology note on each function below for why
 *   that's a deliberate, bounded use of ecological data rather than a
 *   shortcut.
 *
 * Every function throws on invalid input rather than silently clamping
 * — consistent with hardshipScore.js's own validation philosophy (see
 * that file's module docstring on why silent clamping hides upstream
 * bugs).
 */

import {
  COUNCIL_ENERGY_BURDEN_TARGET_PCT,
  INCOME_BRACKET_HIGH_BURDEN_WEEKLY_DOLLARS,
  INCOME_BRACKET_MODERATE_BURDEN_WEEKLY_DOLLARS,
  TYPICAL_ARREARS_RANGE_DOLLARS,
  LGA_RESIDENTIAL_SOLAR_DENSITY_PCT,
  PRIORITY_SUBURBS,
  isPrioritySuburb,
} from '../../policies/wollongongEquityDataV1.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function assertPositiveFinite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number, got ${value}`);
  }
}

/**
 * energy_burden, calibrated directly to Council's own 10%-of-income
 * hardship threshold [Framework p.8, p.17]. A household spending
 * exactly the Council threshold scores 1.0; double the threshold also
 * scores 1.0 (clamped) rather than something meaningless like 2.0 —
 * the factor answers "how much of the way to Council's hardship line
 * is this household," not "by what multiple do they exceed it."
 *
 * @param {number} weeklyEnergyCostDollars must be > 0
 * @param {number} weeklyIncomeDollars must be > 0
 * @param {number} [targetBurdenPct] defaults to Council's published target
 * @returns {{ factor: number, burdenPct: number }}
 */
export function deriveEnergyBurdenFactor(
  weeklyEnergyCostDollars,
  weeklyIncomeDollars,
  targetBurdenPct = COUNCIL_ENERGY_BURDEN_TARGET_PCT
) {
  assertPositiveFinite(weeklyEnergyCostDollars, 'weeklyEnergyCostDollars');
  assertPositiveFinite(weeklyIncomeDollars, 'weeklyIncomeDollars');
  assertPositiveFinite(targetBurdenPct, 'targetBurdenPct');
  const burdenPct = weeklyEnergyCostDollars / weeklyIncomeDollars;
  return { factor: clamp01(burdenPct / targetBurdenPct), burdenPct };
}

/**
 * income_gap, anchored to the two real income brackets the Assessment
 * reports energy-poverty rates against [Assessment pp.6-10]:
 * under $500/week -> 1.0 (the "11%+ burden" bracket), under $650/week
 * -> 0.6 (the "8%+ burden" bracket), tapering linearly to a 0.05 floor
 * by $2,500/week. The taper above $650 is this module's own
 * extrapolation, not sourced — documented in the module docstring.
 *
 * @param {number} weeklyIncomeDollars must be > 0
 * @returns {number}
 */
export function deriveIncomeGapFactor(weeklyIncomeDollars) {
  assertPositiveFinite(weeklyIncomeDollars, 'weeklyIncomeDollars');
  if (weeklyIncomeDollars < INCOME_BRACKET_HIGH_BURDEN_WEEKLY_DOLLARS) return 1.0;
  if (weeklyIncomeDollars < INCOME_BRACKET_MODERATE_BURDEN_WEEKLY_DOLLARS) return 0.6;
  const taperFloor = 0.05;
  const taperSpan = 2500 - INCOME_BRACKET_MODERATE_BURDEN_WEEKLY_DOLLARS;
  const progress = clamp01((weeklyIncomeDollars - INCOME_BRACKET_MODERATE_BURDEN_WEEKLY_DOLLARS) / taperSpan);
  return clamp01(0.6 - progress * (0.6 - taperFloor));
}

/**
 * payment_difficulty, scaled against the typical arrears range observed
 * in the Save4Good pilot [Assessment p.10]. $0 arrears -> 0. Arrears at
 * or above the top of the typical range ($3,500) -> 1.0. This linear
 * scaling is a documented heuristic, not something the Assessment
 * itself specifies — it doesn't publish a formula, only the range.
 *
 * @param {number} currentArrearsDollars must be >= 0
 * @returns {number}
 */
export function derivePaymentDifficultyFactor(currentArrearsDollars) {
  if (typeof currentArrearsDollars !== 'number' || !Number.isFinite(currentArrearsDollars) || currentArrearsDollars < 0) {
    throw new RangeError(`currentArrearsDollars must be a non-negative finite number, got ${currentArrearsDollars}`);
  }
  const [, topOfRange] = TYPICAL_ARREARS_RANGE_DOLLARS;
  return clamp01(currentArrearsDollars / topOfRange);
}

/**
 * area_disadvantage, from the Assessment's named priority-suburb list
 * rather than a fabricated SEIFA percentile — the source ranks suburbs
 * by SEIFA score but the percentile values themselves weren't in the
 * material available to this project. A suburb on the list scores 0.8
 * (high but not automatically 1.0 — an individual household's own
 * income/burden/arrears factors still carry more weight in the overall
 * score, per the AHP reasoning discussed separately); a suburb not on
 * the list scores a low baseline, since most Wollongong suburbs are not
 * flagged as high-disadvantage.
 *
 * METHODOLOGY NOTE: this is suburb-level (ecological) data applied to
 * every household in that suburb alike. That's a deliberate, bounded
 * choice — it's exactly the kind of area-level proxy the AHP weighting
 * discussion assigned a low-but-nonzero weight to, specifically because
 * it can't distinguish a struggling household from a comfortable one on
 * the same street. Don't raise this factor's weight in the hardship
 * policy without also reconsidering that reasoning.
 *
 * @param {string} suburb
 * @returns {number}
 */
export function deriveAreaDisadvantageFactor(suburb) {
  if (typeof suburb !== 'string' || suburb.trim() === '') {
    throw new TypeError(`suburb must be a non-empty string, got ${suburb}`);
  }
  return isPrioritySuburb(suburb) ? 0.8 : 0.15;
}

/**
 * no_solar_access, combining a household-level fact (does this specific
 * household have solar) with a suburb-level structural signal (how far
 * below the LGA's 35% average density is this suburb, per
 * `wollongongEquityDataV1.js`'s per-suburb figures where published).
 *
 * A household that has solar scores 0 regardless of suburb — it isn't
 * locked out, whatever its neighbours' situation. A household without
 * solar in a suburb with below-average density scores higher than one
 * without solar in an average-or-above suburb, on the reasoning that
 * suburb-level density partly reflects structural barriers (rental
 * housing stock, strata rules, roof orientation/shading patterns) that
 * make it harder for that specific household to get solar even if they
 * wanted to — not just individual choice. Where a suburb's density
 * isn't published in the source data, this falls back to the LGA
 * average as a neutral prior rather than guessing a number.
 *
 * @param {boolean} householdHasSolar
 * @param {string} [suburb]
 * @returns {number}
 */
export function deriveNoSolarAccessFactor(householdHasSolar, suburb) {
  if (typeof householdHasSolar !== 'boolean') {
    throw new TypeError(`householdHasSolar must be a boolean, got ${householdHasSolar}`);
  }
  if (householdHasSolar) return 0;

  const suburbDensity = suburb && PRIORITY_SUBURBS[suburb]?.solarDensityPct;
  const density = typeof suburbDensity === 'number' ? suburbDensity : LGA_RESIDENTIAL_SOLAR_DENSITY_PCT;
  const structuralGap = clamp01((LGA_RESIDENTIAL_SOLAR_DENSITY_PCT - density) / LGA_RESIDENTIAL_SOLAR_DENSITY_PCT);
  // Floor of 0.5: not having solar is itself the primary signal: even
  // in an average-density suburb, a household without solar is missing
  // the thing this factor measures. The suburb gap only pushes it
  // higher, never lower, than that floor.
  return clamp01(0.5 + 0.5 * structuralGap);
}
