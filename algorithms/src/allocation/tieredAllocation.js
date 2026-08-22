/**
 * Tiered allocation — hard queue-bypass for life-support/critical
 * households. JS port of `allocate_tiered()` from
 * `algorithm/scoring_and_tiered_allocation.py` (the Python reference
 * implementation).
 *
 * WHY THIS IS A SEPARATE STAGE FROM SCORING
 * -------------------------------------------
 * `hardshipScore.js` treats `life_support_flag` as a *soft* ceiling: it
 * forces `hardship_score` to 1.0, which lets a life-support household
 * out-compete everyone else for weight — but it still only competes
 * *inside* one shared pool. If the pool is scarce enough, a household
 * with weight 1.0 can still be starved relative to its actual demand,
 * because Nash welfare balances everyone's share rather than fully
 * emptying the pool into one household first. That's the wrong shape
 * for "a hospital must bypass the queue and be served first" — it needs
 * a genuine hard override, not just "wins most of a fair fight."
 *
 * This module is Stage B. It partitions households into:
 *
 *   Tier 0 — life-support register. Solved first against the FULL pool
 *            (its own internal Nash-welfare pass — so if there's more
 *            than one Tier-0 household, they still split fairly by
 *            their own hardship weight rather than by arrival order).
 *   Tier 1 — everyone else. Solved via composite-weighted Nash welfare
 *            over whatever pool capacity Tier 0 didn't use.
 *
 * The defining, tested property (see tieredAllocation.test.js's "bypass
 * invariant") is: Tier 1 never receives anything until every Tier 0
 * household is either fully served up to its cap, or the pool itself is
 * exhausted. That's what makes this a bypass rather than a priority
 * weight.
 *
 * ONE OPEN DESIGN CALL — mirrored from the Python reference, same
 * default, same reasoning:
 *
 *   HIGH_NEED_AREA_IS_HARD_OVERRIDE (default false)
 *     `life_support_flag` gets the true hard bypass (Tier 0), matching
 *     the real Endeavour Energy life-support register model.
 *     `is_high_need_area` defaults to a SOFT ceiling — it forces
 *     hardship_score to 1.0 (via hardshipScore.js) but still competes
 *     fairly inside Tier 1 with everyone else, rather than jumping the
 *     queue outright. Flip this to true only if the team decides
 *     high-need areas should also get the hard bypass — note that will
 *     crowd Tier 0 with potentially many households and dilute the
 *     emergency-priority guarantee for genuine life-support cases.
 *
 * SCOPE NOTE — single pool, not multi-source
 * ---------------------------------------------
 * Consistent with the rest of this codebase, this operates on one
 * shared pool (matching `nashWelfareSinglePoolAllocate`'s contract and
 * `fixtures/sampleHouseholds.js` / SAMPLE_POOL_KWH — no per-source
 * eligibility). Multi-source allocation exists in
 * `waterFillingFairShare.js`, but under a different fairness objective
 * (max-min, not Nash welfare) — there is currently no multi-source
 * Nash-welfare engine in this JS codebase, because the general case
 * needs a convex solver (see `nashWelfareSinglePool.js`'s module
 * docstring). The Python side has one (`engine/nash_welfare.py`,
 * `algorithm/nash_allocation.py`'s `allocate()`), which is what the
 * original `allocate_tiered()` this file ports was built on. If the
 * product ends up needing multi-source + Nash welfare + tiering
 * together, that combination should either call the Python engine as a
 * service or extend this module once a JS convex-solver dependency is
 * chosen — it should not silently fall back to max-min for Tier 0,
 * since that changes the fairness guarantee being pitched.
 */

import { computePriorityWeight } from '../scoring/hardshipScore.js';
import { nashWelfareSinglePoolAllocate } from './nashWelfareSinglePool.js';

export const HIGH_NEED_AREA_IS_HARD_OVERRIDE = false;

/**
 * @typedef {Object} TieredHousehold
 * @property {string} id
 * @property {number} [life_support_flag] 1 if on a life-support / critical-infrastructure register, else 0
 * @property {number} [is_high_need_area] 1 if council-flagged high-need area, else 0
 * @property {number} income_gap 0-1, pre-normalized
 * @property {number} area_disadvantage 0-1, pre-normalized
 * @property {number} payment_difficulty 0-1, pre-normalized
 * @property {number} energy_burden 0-1, pre-normalized
 * @property {number} no_solar_access 0-1, pre-normalized
 * @property {number} capKwh most this household can usefully receive this period
 * @property {Record<string, number>} [extra_scores] additional top-level scores, keyed by name
 */

/**
 * @typedef {Object} TieredAllocationResult
 * @property {import('./nashWelfareSinglePool.js').SinglePoolAllocationResult | null} tier0Result raw result of Tier 0's internal pass, or null if Tier 0 was empty
 * @property {import('./nashWelfareSinglePool.js').SinglePoolAllocationResult | null} tier1Result raw result of Tier 1's pass over the leftover, or null if Tier 1 never ran
 * @property {Record<string, number>} combinedAllocationKwh householdId -> kWh, Tier 0 and Tier 1 merged (every household present, 0 if unserved)
 * @property {number} leftoverKwh pool left over after both tiers (nonzero only when every household in both tiers hit its cap)
 * @property {string[]} tier0HouseholdIds
 * @property {string[]} tier1HouseholdIds
 */

/**
 * Splits households into Tier 0 (hard override) and Tier 1 (everyone
 * else), honouring HIGH_NEED_AREA_IS_HARD_OVERRIDE. Exported separately
 * so callers/tests can inspect the split without running a full
 * allocation.
 *
 * @param {TieredHousehold[]} households
 * @returns {{ tier0: TieredHousehold[], tier1: TieredHousehold[] }}
 */
export function partitionTiers(households) {
  const tier0 = households.filter(
    (h) => h.life_support_flag === 1 || (HIGH_NEED_AREA_IS_HARD_OVERRIDE && h.is_high_need_area === 1)
  );
  const tier0Ids = new Set(tier0.map((h) => h.id));
  const tier1 = households.filter((h) => !tier0Ids.has(h.id));
  return { tier0, tier1 };
}

/**
 * @param {TieredHousehold[]} households
 * @param {number} poolKwh total pool available this period, before any tiering
 * @param {typeof import('../../policies/hardshipPolicyV1.js').HARDSHIP_POLICY_V1} policy
 * @param {Record<string, number>} [extraShares] see computePriorityWeight — passed through unchanged to both tiers
 * @returns {TieredAllocationResult}
 */
export function allocateTiered(households, poolKwh, policy, extraShares = {}) {
  const { tier0, tier1 } = partitionTiers(households);

  const toPoolInput = (h) => ({
    id: h.id,
    weight: computePriorityWeight(h, policy, extraShares),
    capKwh: h.capKwh,
  });

  // --- Tier 0: hard override, solved first against the FULL pool ---
  let tier0Result = null;
  let leftoverForTier1 = poolKwh;
  if (tier0.length > 0) {
    tier0Result = nashWelfareSinglePoolAllocate(tier0.map(toPoolInput), poolKwh);
    const tier0Used = Object.values(tier0Result.allocationKwh).reduce((a, b) => a + b, 0);
    leftoverForTier1 = Math.max(0, poolKwh - tier0Used);
  }

  // --- Tier 1: composite-weighted Nash welfare over whatever Tier 0 left ---
  let tier1Result = null;
  if (tier1.length > 0 && leftoverForTier1 > 1e-9) {
    tier1Result = nashWelfareSinglePoolAllocate(tier1.map(toPoolInput), leftoverForTier1);
  }

  const combinedAllocationKwh = {};
  for (const h of tier0) combinedAllocationKwh[h.id] = tier0Result?.allocationKwh[h.id] ?? 0;
  for (const h of tier1) combinedAllocationKwh[h.id] = tier1Result?.allocationKwh[h.id] ?? 0;

  const leftoverKwh = tier1.length > 0 ? (tier1Result ? tier1Result.leftoverKwh : leftoverForTier1) : leftoverForTier1;

  return {
    tier0Result,
    tier1Result,
    combinedAllocationKwh,
    leftoverKwh,
    tier0HouseholdIds: tier0.map((h) => h.id),
    tier1HouseholdIds: tier1.map((h) => h.id),
  };
}

/**
 * Composes the emergency reserve (see `nashWelfareSinglePool.js`'s
 * `allocateWithReserve`) with tiered allocation.
 *
 * Before this function existed, the two priority mechanisms in this
 * codebase were disconnected: `allocateWithReserve` carves off a fixed
 * kWh figure that is *never distributed to anyone regardless of need*
 * (matching AEMO's RERT/spinning-reserve framing — capacity held for
 * out-of-band manual dispatch, not run through the algorithm at all),
 * while `allocateTiered` guarantees registered life-support households
 * are served first from whatever pool *is* run through the algorithm.
 * These answer different questions ("what capacity never enters the
 * model" vs. "who gets served first within the model") and a real
 * deployment plausibly needs both at once — nothing composed them.
 *
 * Order matters and is fixed here: the reserve is carved off the total
 * pool first (unconditionally, exactly as `allocateWithReserve` does it
 * alone), then `allocateTiered` runs Tier 0 and Tier 1 over whatever
 * remains. A life-support household's hard bypass therefore applies to
 * the *consumable* pool, not the reserve — if your team instead wants
 * Tier 0 to be able to reach into the reserve in a genuine emergency,
 * that's a different, deliberate design decision this function does not
 * make silently; say so and it can be built as a separate variant.
 *
 * @param {TieredHousehold[]} households
 * @param {number} poolKwh total pool before the reserve is removed
 * @param {number} reserveKwh fixed amount held back, never distributed by this function
 * @param {typeof import('../../policies/hardshipPolicyV1.js').HARDSHIP_POLICY_V1} policy
 * @param {Record<string, number>} [extraShares]
 * @returns {TieredAllocationResult & { reserveKwh: number, totalPoolKwh: number }}
 */
export function allocateTieredWithReserve(households, poolKwh, reserveKwh, policy, extraShares = {}) {
  if (reserveKwh < 0) throw new Error('reserveKwh must be >= 0');
  const effectiveReserve = Math.min(reserveKwh, poolKwh);
  const consumablePool = Math.max(0, poolKwh - effectiveReserve);
  const result = allocateTiered(households, consumablePool, policy, extraShares);
  return {
    ...result,
    reserveKwh: effectiveReserve,
    totalPoolKwh: poolKwh,
  };
}
