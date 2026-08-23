/**
 * Hardship scoring — pure, deterministic port of
 * `compute_hardship_score()` / `compute_priority_weight()` from
 * `algorithm/scoring_and_tiered_allocation.py`.
 *
 * No network, database, clock, or global-state access (per
 * algorithms/src/README.md). Every function takes an explicit policy
 * object rather than importing a fixed one, so a caller can pin a past
 * policy version for reproducibility.
 *
 * OUT-OF-RANGE INPUTS ARE REJECTED, NOT SILENTLY CLAMPED
 * ---------------------------------------------------------
 * Each hardship factor is documented as "0-1, pre-normalized" — that's a
 * contract the caller's upstream normalization is supposed to guarantee.
 * An earlier version of this function only enforced that contract
 * implicitly, via `Math.max(0, Math.min(1, score))` on the final
 * weighted sum: a factor value of 25.0 (the unmistakable signature of a
 * normalization bug — e.g. a raw dollar figure fed in where a 0-1 ratio
 * was expected) silently clamped to a plausible-looking 1.0, identical
 * to a household that's genuinely at maximum hardship on that factor.
 * That's the opposite of trustworthy: a real data-pipeline bug becomes
 * invisible instead of surfacing. Every other bad-input case in this
 * codebase already throws loudly (missing factors, non-positive
 * weights, negative caps) — this brings out-of-range factors in line
 * with that, rather than being the one silent exception. The clamp
 * stays on the *final* weighted sum purely as float-noise insurance
 * (e.g. 0.9999999998 from floating-point accumulation), not as a
 * substitute for validating each input.
 */

/**
 * @typedef {Object} HouseholdHardshipInput
 * @property {string} id
 * @property {number} [life_support_flag] 1 if on a life-support / critical-infrastructure register, else 0
 * @property {number} [is_high_need_area] 1 if council-flagged high-need area, else 0
 * @property {number} income_gap 0-1, pre-normalized
 * @property {number} area_disadvantage 0-1, pre-normalized
 * @property {number} payment_difficulty 0-1, pre-normalized
 * @property {number} energy_burden 0-1, pre-normalized
 * @property {number} no_solar_access 0-1, pre-normalized
 * @property {Record<string, number>} [extra_scores] additional top-level scores, keyed by name
 */

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * hardship_score = 1.0 if any override field is set, else the weighted
 * sum of the policy's hardship factors, clamped to [0, 1].
 *
 * @param {HouseholdHardshipInput} household
 * @param {typeof import('../../policies/hardshipPolicyV1.js').HARDSHIP_POLICY_V1} policy
 * @returns {number}
 */
export function computeHardshipScore(household, policy) {
  const overridden = policy.overrideFields.some((field) => household[field] === 1);
  if (overridden) return 1.0;

  let score = 0;
  for (const [factor, weight] of Object.entries(policy.weights)) {
    const value = household[factor];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(`Household ${household.id}: missing or invalid factor "${factor}"`);
    }
    if (value < -1e-9 || value > 1 + 1e-9) {
      throw new RangeError(
        `Household ${household.id}: factor "${factor}" = ${value} is outside the expected [0, 1] range. ` +
          `This almost always means an upstream normalization bug (e.g. a raw, un-normalized figure reaching ` +
          `this function instead of a 0-1 proportion) — fix the input rather than relying on clamping, since ` +
          `silently clamping this would make a bad-data bug indistinguishable from genuine maximum hardship.`
      );
    }
    score += weight * value;
  }
  return clamp01(score); // float-noise insurance only — see module docstring
}

/**
 * Which override field (if any) forced the score to 1.0. Returns null if
 * the household's score came from the weighted formula.
 *
 * @param {HouseholdHardshipInput} household
 * @param {typeof import('../../policies/hardshipPolicyV1.js').HARDSHIP_POLICY_V1} policy
 * @returns {string | null}
 */
export function overrideReason(household, policy) {
  return policy.overrideFields.find((field) => household[field] === 1) ?? null;
}

/**
 * Combines hardship_score with any additional named scores via a
 * weighted geometric mean, matching `compute_priority_weight()`. Pass
 * `extraShares` as e.g. { contribution_score: 0.30 } — the hardship
 * share is implicitly 1 minus the sum of extraShares. Reduces to the
 * hardship score alone when extraShares is empty.
 *
 * @param {HouseholdHardshipInput} household
 * @param {typeof import('../../policies/hardshipPolicyV1.js').HARDSHIP_POLICY_V1} policy
 * @param {Record<string, number>} [extraShares]
 * @returns {number} strictly positive priority weight, usable directly by the allocation engines
 */
export function computePriorityWeight(household, policy, extraShares = {}) {
  const hardship = computeHardshipScore(household, policy);
  const extraKeys = Object.keys(extraShares);

  if (extraKeys.length === 0) {
    return Math.max(hardship, policy.minimumScore);
  }

  const extraShareTotal = extraKeys.reduce((sum, k) => sum + extraShares[k], 0);
  const hardshipShare = 1 - extraShareTotal;

  let weight = hardship ** hardshipShare;
  for (const key of extraKeys) {
    const value = household.extra_scores?.[key];
    if (value === undefined) {
      throw new Error(`Household ${household.id}: extraShares expects "${key}" in extra_scores but it wasn't supplied`);
    }
    weight *= Math.max(value, 1e-9) ** extraShares[key];
  }
  return Math.max(weight, policy.minimumScore);
}
