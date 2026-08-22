/**
 * Reusable fairness/correctness invariant checks — shared between the
 * test suite and any future runtime audit tooling. Each function
 * returns a list of violation strings (empty = passes); it never
 * throws, so a caller can decide whether a violation is fatal.
 */

const EPS = 1e-6;

/**
 * Conservation: allocated + leftover must equal the pool that was
 * actually available to distribute, for the single-pool engine.
 *
 * @param {import('../allocation/nashWelfareSinglePool.js').SinglePoolAllocationResult} result
 * @param {number} consumablePoolKwh
 */
export function checkPoolConservation(result, consumablePoolKwh) {
  const violations = [];
  const totalAllocated = Object.values(result.allocationKwh).reduce((a, b) => a + b, 0);
  const total = totalAllocated + result.leftoverKwh;
  if (Math.abs(total - consumablePoolKwh) > EPS) {
    violations.push(`conservation: allocated(${totalAllocated}) + leftover(${result.leftoverKwh}) = ${total}, expected ${consumablePoolKwh}`);
  }
  return violations;
}

/**
 * No household may receive a negative amount, or more than its cap.
 *
 * @param {Record<string, number>} allocationKwh
 * @param {{ id: string, capKwh: number }[]} households
 */
export function checkCapsRespected(allocationKwh, households) {
  const violations = [];
  for (const h of households) {
    const amount = allocationKwh[h.id] ?? 0;
    if (amount < -EPS) violations.push(`${h.id}: negative allocation ${amount}`);
    if (amount > h.capKwh + EPS) violations.push(`${h.id}: allocation ${amount} exceeds cap ${h.capKwh}`);
  }
  return violations;
}

/**
 * If there's leftover pool, every household must be exactly at its cap
 * — otherwise the algorithm stopped early while someone could still
 * usefully receive more.
 *
 * @param {import('../allocation/nashWelfareSinglePool.js').SinglePoolAllocationResult} result
 * @param {{ id: string, capKwh: number }[]} households
 */
export function checkNoWastedSupplyWhenCapped(result, households) {
  const violations = [];
  if (result.leftoverKwh > EPS) {
    for (const h of households) {
      const amount = result.allocationKwh[h.id] ?? 0;
      if (amount < h.capKwh - EPS) {
        violations.push(`leftover ${result.leftoverKwh} exists but ${h.id} only received ${amount} of its ${h.capKwh} cap`);
      }
    }
  }
  return violations;
}

/**
 * Monotonicity: strictly higher weight must never yield a strictly
 * lower allocation, when everything else (cap, pool) is identical.
 *
 * @param {Record<string, number>} allocationKwh
 * @param {{ id: string, weight: number }[]} households
 */
export function checkMonotonicInWeight(allocationKwh, households) {
  const violations = [];
  const sorted = [...households].sort((a, b) => a.weight - b.weight);
  for (let i = 0; i < sorted.length - 1; i++) {
    const lower = sorted[i];
    const higher = sorted[i + 1];
    if (higher.weight > lower.weight + 1e-9) {
      const lowerAmount = allocationKwh[lower.id] ?? 0;
      const higherAmount = allocationKwh[higher.id] ?? 0;
      if (higherAmount < lowerAmount - EPS) {
        violations.push(
          `${higher.id} (weight ${higher.weight}) got ${higherAmount}, less than ${lower.id} (weight ${lower.weight}) who got ${lowerAmount}`
        );
      }
    }
  }
  return violations;
}

/**
 * A source can never be allocated beyond its capacity (multi-source engine).
 *
 * @param {Record<string, number>} sourceUsedKwh
 * @param {{ id: string, capacityKwh: number }[]} sources
 */
export function checkSourceConservation(sourceUsedKwh, sources) {
  const violations = [];
  for (const s of sources) {
    const used = sourceUsedKwh[s.id] ?? 0;
    if (used > s.capacityKwh + EPS) {
      violations.push(`source ${s.id}: used ${used} exceeds capacity ${s.capacityKwh}`);
    }
    if (used < -EPS) {
      violations.push(`source ${s.id}: negative usage ${used}`);
    }
  }
  return violations;
}

/**
 * A household must never receive kWh from a source it isn't eligible for.
 *
 * @param {Record<string, Record<string, number>>} allocationKwh
 * @param {{ id: string, eligibleSourceIds: Set<string> | string[] }[]} households
 */
export function checkEligibilityRespected(allocationKwh, households) {
  const violations = [];
  for (const h of households) {
    const elig = h.eligibleSourceIds instanceof Set ? h.eligibleSourceIds : new Set(h.eligibleSourceIds);
    const perSource = allocationKwh[h.id] ?? {};
    for (const [sourceId, amount] of Object.entries(perSource)) {
      if (amount > EPS && !elig.has(sourceId)) {
        violations.push(`${h.id}: received ${amount} from ineligible source ${sourceId}`);
      }
    }
  }
  return violations;
}
