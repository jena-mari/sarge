/**
 * Weighted max-min fair water-filling — pure JS port of
 * `engine/fair_allocation.py::max_min_fair_allocate()`.
 *
 * Splits divisible supply held across multiple sources, each with its
 * own capacity, among households that each have a priority weight, a
 * demand cap, and an eligibility set (which sources they may draw
 * from). See `fair_allocation.py`'s module docstring for the full
 * pedigree (Bertsekas & Gallager progressive filling; the same
 * algorithm behind fair-queueing network routers) — this port changes
 * no behaviour, only the language.
 *
 * Guarantees, proved by construction (mirrored in
 * algorithms/tests/waterFillingFairShare.test.js):
 *   1. Conservation — no source allocates more than its capacity.
 *   2. Demand-capped — no household receives more than its demand cap.
 *   3. Eligibility respected — never a source a household isn't eligible for.
 *   4. Determinism — identical input always produces identical output.
 *   5. Pareto efficiency — no source ends with spare capacity while an
 *      eligible household is still under its cap and unsaturated.
 *   6. Max-min fairness — every partially-served household is
 *      bottlenecked on every source it's eligible for.
 */

const EPSILON = 1e-9;

/**
 * @typedef {Object} Source
 * @property {string} id
 * @property {number} capacityKwh
 */

/**
 * @typedef {Object} Household
 * @property {string} id
 * @property {number} weight strictly positive priority weight
 * @property {number} demandCapKwh most this household can usefully receive
 * @property {Set<string> | string[]} eligibleSourceIds
 */

/**
 * @typedef {Object} AllocationResult
 * @property {Record<string, Record<string, number>>} allocationKwh householdId -> sourceId -> kWh
 * @property {Record<string, number>} householdTotalKwh
 * @property {Record<string, number>} sourceUsedKwh
 * @property {string[]} fullyServedHouseholds
 * @property {string[]} partiallyServedHouseholds
 * @property {string[]} unservedHouseholds
 * @property {string} algorithm
 */

function validate(sources, households) {
  for (const s of sources) {
    if (s.capacityKwh < 0) throw new Error(`Source ${s.id}: capacityKwh must be >= 0`);
  }
  for (const h of households) {
    if (h.weight <= 0) throw new Error(`Household ${h.id}: weight must be > 0`);
    if (h.demandCapKwh < 0) throw new Error(`Household ${h.id}: demandCapKwh must be >= 0`);
    const elig = h.eligibleSourceIds instanceof Set ? h.eligibleSourceIds : new Set(h.eligibleSourceIds);
    if (elig.size === 0) throw new Error(`Household ${h.id}: must be eligible for at least one source`);
  }
}

/**
 * @param {Source[]} sources
 * @param {Household[]} households
 * @returns {AllocationResult}
 */
export function waterFillingFairShareAllocate(sources, households) {
  validate(sources, households);

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const householdById = new Map(households.map((h) => [h.id, h]));

  const remainingCapacity = new Map(sources.map((s) => [s.id, s.capacityKwh]));
  const remainingDemand = new Map(households.map((h) => [h.id, h.demandCapKwh]));

  /** @type {Map<string, Set<string>>} */
  const activeSources = new Map(
    households.map((h) => {
      const elig = h.eligibleSourceIds instanceof Set ? h.eligibleSourceIds : new Set(h.eligibleSourceIds);
      // A source that starts at zero capacity can never contribute — it
      // must be excluded here, not just skipped when computing saturation
      // levels, or a household's draw gets split across it anyway and
      // silently "allocates" a positive amount from a source with
      // nothing to give (a real conservation violation this exact case
      // caught in algorithms/tests/waterFillingFairShare.test.js — the
      // same bug is present in engine/fair_allocation.py upstream).
      return [h.id, new Set([...elig].filter((sid) => sourceById.has(sid) && remainingCapacity.get(sid) > EPSILON))];
    })
  );

  const allocation = new Map(households.map((h) => [h.id, new Map()]));

  let activeHouseholds = new Set(
    households
      .filter((h) => remainingDemand.get(h.id) > EPSILON)
      .filter((h) => activeSources.get(h.id).size > 0)
      .map((h) => h.id)
  );

  let guard = 0;
  const guardLimit = (sources.length + households.length) ** 2 + 100;

  while (activeHouseholds.size > 0) {
    guard++;
    if (guard > guardLimit) {
      throw new Error('waterFillingFairShareAllocate: exceeded iteration guard — check for degenerate input');
    }

    /** @type {Map<string, number>} */
    const sourceSaturationLevel = new Map();
    for (const [sid, cap] of remainingCapacity) {
      if (cap <= EPSILON) continue;
      const drawers = [...activeHouseholds].filter((hid) => activeSources.get(hid).has(sid));
      if (drawers.length === 0) continue;
      const drawRate = drawers.reduce((sum, hid) => sum + householdById.get(hid).weight / activeSources.get(hid).size, 0);
      if (drawRate <= EPSILON) continue;
      sourceSaturationLevel.set(sid, cap / drawRate);
    }

    /** @type {Map<string, number>} */
    const householdSatisfactionLevel = new Map();
    for (const hid of activeHouseholds) {
      const w = householdById.get(hid).weight;
      householdSatisfactionLevel.set(hid, remainingDemand.get(hid) / w);
    }

    const candidateLevels = [...sourceSaturationLevel.values(), ...householdSatisfactionLevel.values()];
    if (candidateLevels.length === 0) break;

    const delta = Math.max(0, Math.min(...candidateLevels));

    for (const hid of activeHouseholds) {
      const w = householdById.get(hid).weight;
      const srcs = activeSources.get(hid);
      if (srcs.size === 0) continue;
      const perSource = (w / srcs.size) * delta;
      const householdAlloc = allocation.get(hid);
      for (const sid of srcs) {
        householdAlloc.set(sid, (householdAlloc.get(sid) ?? 0) + perSource);
        remainingCapacity.set(sid, remainingCapacity.get(sid) - perSource);
      }
      remainingDemand.set(hid, remainingDemand.get(hid) - w * delta);
    }

    const newlySaturated = [...sourceSaturationLevel.entries()]
      .filter(([, lvl]) => lvl - delta <= EPSILON)
      .map(([sid]) => sid);
    const newlySatisfied = [...householdSatisfactionLevel.entries()]
      .filter(([, lvl]) => lvl - delta <= EPSILON)
      .map(([hid]) => hid);

    for (const sid of newlySaturated) remainingCapacity.set(sid, 0);
    for (const hid of newlySatisfied) remainingDemand.set(hid, 0);

    for (const hid of activeHouseholds) {
      const srcs = activeSources.get(hid);
      for (const sid of newlySaturated) srcs.delete(sid);
    }

    const stillActive = new Set();
    for (const hid of activeHouseholds) {
      if (newlySatisfied.includes(hid)) continue;
      if (activeSources.get(hid).size === 0) continue;
      stillActive.add(hid);
    }
    activeHouseholds = stillActive;

    if (delta <= EPSILON && newlySaturated.length === 0 && newlySatisfied.length === 0) break;
  }

  /** @type {Record<string, Record<string, number>>} */
  const allocationKwh = {};
  /** @type {Record<string, number>} */
  const householdTotalKwh = {};
  for (const h of households) {
    const per = allocation.get(h.id);
    allocationKwh[h.id] = Object.fromEntries(per);
    householdTotalKwh[h.id] = [...per.values()].reduce((a, b) => a + b, 0);
  }

  const sourceUsedKwh = {};
  for (const s of sources) {
    sourceUsedKwh[s.id] = households.reduce((sum, h) => sum + (allocationKwh[h.id][s.id] ?? 0), 0);
  }

  const fullyServedHouseholds = [];
  const partiallyServedHouseholds = [];
  const unservedHouseholds = [];
  for (const h of households) {
    const total = householdTotalKwh[h.id];
    if (total >= h.demandCapKwh - 1e-6) fullyServedHouseholds.push(h.id);
    else if (total > EPSILON) partiallyServedHouseholds.push(h.id);
    else unservedHouseholds.push(h.id);
  }

  return {
    allocationKwh,
    householdTotalKwh,
    sourceUsedKwh,
    fullyServedHouseholds,
    partiallyServedHouseholds,
    unservedHouseholds,
    algorithm: 'max_min_water_filling',
  };
}
