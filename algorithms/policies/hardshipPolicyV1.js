/**
 * Hardship scoring policy — version 1.
 *
 * Pure configuration, no executable logic (see algorithms/README.md:
 * "Keep policy configuration separate from executable logic" and
 * "Version every policy"). Ported from the reference implementation in
 * `algorithm/scoring_and_tiered_allocation.py` (HARDSHIP_WEIGHTS).
 *
 * To change scoring behaviour, add a new versioned file
 * (hardshipPolicyV2.js) rather than editing this one in place — the
 * design constraint is that every policy version stays reproducible for
 * past allocation runs.
 */

export const HARDSHIP_POLICY_V1 = {
  version: 'hardship-v1',

  // Five weighted hardship factors. Must sum to 1.00.
  weights: {
    income_gap: 0.30,
    area_disadvantage: 0.25,
    payment_difficulty: 0.20,
    energy_burden: 0.15,
    no_solar_access: 0.10,
  },

  // Hard-override fields: if either is true on a household, its hardship
  // score is forced to 1.0 regardless of the five weighted factors above.
  overrideFields: ['life_support_flag', 'is_high_need_area'],

  // Floor applied to the final score so it can be used as a Nash-welfare
  // weight, which must be strictly positive.
  minimumScore: 1e-6,
};

function sumWeights(weights) {
  return Object.values(weights).reduce((sum, w) => sum + w, 0);
}

if (Math.abs(sumWeights(HARDSHIP_POLICY_V1.weights) - 1) > 1e-9) {
  throw new Error('HARDSHIP_POLICY_V1.weights must sum to 1.00');
}
