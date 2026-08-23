/**
 * Single-pool priority-queue allocation — binary, all-or-nothing.
 *
 * Supersedes the earlier proportional Nash-welfare water-filling
 * approach. That approach split the pool fractionally across every
 * household by weight, so a household could receive a partial share
 * (some kWh, but less than its cap). Product decided that's the wrong
 * shape for this pool: a household should either be fully supplied up
 * to its committed cap, or receive nothing — never a partial delivery.
 *
 * ALGORITHM
 * ---------
 *   1. Sort households descending by priority weight (ties broken by
 *      id, for determinism).                                — O(n log n)
 *   2. Walk the sorted list with a running `remaining` pool balance.
 *      For each household, in priority order:
 *        - if its full capKwh fits within what's left, commit the
 *          full cap and subtract it from the running balance.
 *        - otherwise, skip it (it receives 0) and move on to the next
 *          household — a lower-priority household with a smaller cap
 *          may still fit in the pool that's left.          — O(n)
 *
 * This "skip and continue" rule (rather than stopping the whole queue
 * at the first household that doesn't fit) is a deliberate choice: it
 * still respects priority order strictly (nobody is ever skipped in
 * favor of a lower-priority household when they themselves would have
 * fit), while not wasting pool capacity that a smaller downstream
 * request could still fully use.
 *
 * Conservation, cap-respecting, and priority-monotonicity (under equal
 * caps) all still hold and are fuzz-tested exactly as before — see
 * algorithms/tests/nashWelfareSinglePool.test.js. The Nash-welfare KKT
 * optimality property no longer applies (it was specific to the
 * proportional split), so those checks were removed rather than kept
 * as dead assertions.
 */

const EPSILON = 1e-9;

/**
 * @typedef {Object} PoolHousehold
 * @property {string} id
 * @property {number} weight strictly positive priority weight (e.g. from computePriorityWeight)
 * @property {number} capKwh the full amount this household must receive, or nothing
 */

/**
 * @typedef {Object} SinglePoolAllocationResult
 * @property {Record<string, number>} allocationKwh householdId -> kWh (always either 0 or that household's capKwh)
 * @property {number} leftoverKwh unallocated pool — nonzero whenever the remaining balance couldn't fully cover any still-unserved household
 * @property {{ id: string, consumedAt: number, reason: 'committed' | 'skipped' }[]} lockOrder priority-sorted order households were decided, and why
 * @property {number} consumedTotalKwh
 */

function validate(households, poolKwh) {
  if (poolKwh < 0) throw new Error('poolKwh must be >= 0');
  for (const h of households) {
    if (h.weight <= 0) throw new Error(`Household ${h.id}: weight must be > 0`);
    if (h.capKwh < 0) throw new Error(`Household ${h.id}: capKwh must be >= 0`);
  }
}

/**
 * @param {PoolHousehold[]} households
 * @param {number} poolKwh total energy available this period
 * @returns {SinglePoolAllocationResult}
 */
export function nashWelfareSinglePoolAllocate(households, poolKwh) {
  validate(households, poolKwh);

  if (households.length === 0) {
    return { allocationKwh: {}, leftoverKwh: poolKwh, lockOrder: [], consumedTotalKwh: 0 };
  }

  // Highest priority weight first; ties broken by id for determinism.
  const sorted = [...households].sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const allocationKwh = {};
  const lockOrder = [];
  let remaining = poolKwh;
  let consumedTotal = 0;

  for (const h of sorted) {
    if (h.capKwh <= remaining + EPSILON) {
      allocationKwh[h.id] = h.capKwh;
      remaining = Math.max(0, remaining - h.capKwh);
      consumedTotal += h.capKwh;
      lockOrder.push({ id: h.id, consumedAt: consumedTotal, reason: 'committed' });
    } else {
      allocationKwh[h.id] = 0;
      lockOrder.push({ id: h.id, consumedAt: consumedTotal, reason: 'skipped' });
    }
  }

  return { allocationKwh, leftoverKwh: remaining, lockOrder, consumedTotalKwh: consumedTotal };
}

/**
 * The original proportional Nash-welfare water-filling allocator,
 * kept for callers that still need a guaranteed-nonzero partial share
 * rather than binary all-or-nothing — currently `tieredAllocation.js`'s
 * Tier 0 (life-support/hospital bypass), where a household should never
 * be reduced to exactly zero just because its full demand doesn't fit
 * the pool. See git history / `nashWelfareSinglePoolAllocate`'s prior
 * version for the full O(n log n) derivation this is unchanged from.
 *
 * Maximizes `sum_i weight_i * log(x_i)` subject to `sum_i x_i = pool`
 * and `0 <= x_i <= cap_i`: every household's allocation follows
 * `x_i = min(weight_i * t, cap_i)` for a single shared water level `t`,
 * solved in O(n log n) by sorting ascending on `threshold_i = cap_i /
 * weight_i` and sweeping once.
 *
 * @param {PoolHousehold[]} households
 * @param {number} poolKwh total energy available this period
 * @returns {SinglePoolAllocationResult}
 */
export function proportionalNashWelfareAllocate(households, poolKwh) {
  validate(households, poolKwh);

  if (households.length === 0) {
    return { allocationKwh: {}, leftoverKwh: poolKwh, lockOrder: [], consumedTotalKwh: 0 };
  }

  const sorted = [...households].sort((a, b) => a.capKwh / a.weight - b.capKwh / b.weight);
  const n = sorted.length;
  const totalCap = sorted.reduce((sum, h) => sum + h.capKwh, 0);

  const allocationKwh = {};
  const lockOrder = [];

  if (poolKwh >= totalCap - EPSILON) {
    for (const h of sorted) {
      allocationKwh[h.id] = h.capKwh;
      lockOrder.push({ id: h.id, consumedAt: totalCap, reason: 'cap' });
    }
    return {
      allocationKwh,
      leftoverKwh: Math.max(0, poolKwh - totalCap),
      lockOrder,
      consumedTotalKwh: totalCap,
    };
  }

  const suffixWeight = new Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) suffixWeight[i] = suffixWeight[i + 1] + sorted[i].weight;

  let cumCapped = 0;

  for (let k = 0; k < n; k++) {
    const h = sorted[k];
    const thresholdK = h.capKwh / h.weight;
    const remActiveWeight = suffixWeight[k];
    const totalAtThresholdK = cumCapped + remActiveWeight * thresholdK;

    if (totalAtThresholdK >= poolKwh - EPSILON) {
      const t = remActiveWeight > EPSILON ? (poolKwh - cumCapped) / remActiveWeight : 0;
      for (let j = k; j < n; j++) {
        const hh = sorted[j];
        const amount = hh.weight * t;
        allocationKwh[hh.id] = amount;
        const atCap = hh.capKwh - amount <= 1e-6;
        lockOrder.push({ id: hh.id, consumedAt: poolKwh, reason: atCap ? 'cap' : 'poolExhausted' });
      }
      return { allocationKwh, leftoverKwh: 0, lockOrder, consumedTotalKwh: poolKwh };
    }

    allocationKwh[h.id] = h.capKwh;
    cumCapped += h.capKwh;
    lockOrder.push({ id: h.id, consumedAt: cumCapped, reason: 'cap' });
  }

  return {
    allocationKwh,
    leftoverKwh: Math.max(0, poolKwh - cumCapped),
    lockOrder,
    consumedTotalKwh: cumCapped,
  };
}

/**
 * Carves a fixed emergency reserve off the top before running the
 * binary priority-queue allocation on the rest. See
 * ALGORITHM_CONTEXT.md §4 for why this pattern (reserve first, fair-share
 * the remainder) is standard practice, not a bespoke addition — AEMO's
 * RERT/spinning-reserve mechanism, the Nash bargaining disagreement
 * point, and telecom weighted-fair-queueing's guaranteed-minimum classes
 * all follow the same two-layer shape.
 *
 * @param {PoolHousehold[]} households
 * @param {number} poolKwh total pool before the reserve is removed
 * @param {number} reserveKwh fixed amount held back, never distributed
 * @returns {SinglePoolAllocationResult & { reserveKwh: number, totalPoolKwh: number }}
 */
export function allocateWithReserve(households, poolKwh, reserveKwh) {
  if (reserveKwh < 0) throw new Error('reserveKwh must be >= 0');
  const effectiveReserve = Math.min(reserveKwh, poolKwh);
  const consumablePool = Math.max(0, poolKwh - effectiveReserve);
  const result = nashWelfareSinglePoolAllocate(households, consumablePool);
  return {
    ...result,
    reserveKwh: effectiveReserve,
    totalPoolKwh: poolKwh,
  };
}
