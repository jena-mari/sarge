/**
 * Thin HTTP client for the multi-source Nash welfare service
 * (backend/src/nash_welfare_service). Deliberately NOT placed under
 * algorithms/ — that tree's own design constraint (see
 * algorithms/src/README.md) is "no network, database, clock, or
 * global-state dependencies," and this function's whole job is to make
 * a network call. It belongs with the rest of the backend integration
 * code instead.
 *
 * WHY THIS EXISTS INSTEAD OF A JS-NATIVE MULTI-SOURCE NASH-WELFARE ENGINE
 * ---------------------------------------------------------------------------
 * See backend/src/nash_welfare_service/engine.py's module docstring for
 * the full story: two independent hand-rolled JS solver attempts were
 * built and both failed — one didn't converge in 109 of 200 random
 * trials, the other converged every time but to a wrong answer (a real
 * conservation violation) whenever the true optimum required two
 * sources to land at an identical price, which is the common case, not
 * an edge case, whenever households' eligible-source sets overlap. This
 * client calls the already-verified Python/cvxpy engine instead of
 * shipping either broken attempt.
 *
 * INPUT/OUTPUT CONTRACT — matches waterFillingFairShareAllocate's shape
 * ---------------------------------------------------------------------------
 * Same argument order and field names as
 * `../../../algorithms/src/allocation/waterFillingFairShare.js`'s
 * `waterFillingFairShareAllocate(sources, households)`, so callers can
 * switch between the two multi-source engines (max-min fairness,
 * locally computed vs. Nash welfare, computed remotely) without
 * reshaping their data.
 */

const DEFAULT_BASE_URL = 'http://localhost:8001';

/**
 * @typedef {Object} MultiSource
 * @property {string} id
 * @property {number} capacityKwh
 */

/**
 * @typedef {Object} MultiSourceHousehold
 * @property {string} id
 * @property {number} weight strictly positive priority weight
 * @property {number} demandCapKwh most this household can usefully receive
 * @property {Set<string> | string[]} eligibleSourceIds
 */

/**
 * @param {MultiSource[]} sources
 * @param {MultiSourceHousehold[]} households
 * @param {{ baseUrl?: string, fetch?: typeof fetch, signal?: AbortSignal }} [options]
 * @returns {Promise<{
 *   allocationKwh: Record<string, Record<string, number>>,
 *   householdTotalKwh: Record<string, number>,
 *   sourceUsedKwh: Record<string, number>,
 *   objectiveValue: number | null,
 *   solverStatus: string,
 *   algorithm: 'nash_welfare_multi_source_remote',
 * }>}
 */
export async function allocateNashWelfareMultiSource(sources, households, options = {}) {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetch ?? fetch;

  const body = {
    households: households.map((h) => ({
      id: h.id,
      weight: h.weight,
      cap: h.demandCapKwh,
      eligible: Array.from(h.eligibleSourceIds instanceof Set ? h.eligibleSourceIds : h.eligibleSourceIds),
    })),
    sources: sources.map((s) => ({ id: s.id, capacity: s.capacityKwh })),
  };

  let response;
  try {
    response = await fetchImpl(`${baseUrl}/allocate/nash-welfare-multi-source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (networkError) {
    throw new Error(
      `Could not reach the Nash welfare multi-source service at ${baseUrl} — is it running? ` +
        `(backend/src/nash_welfare_service: uvicorn app:app --port 8001). Underlying error: ${networkError.message}`
    );
  }

  if (!response.ok) {
    let detail;
    try {
      detail = (await response.json()).detail;
    } catch {
      detail = await response.text().catch(() => response.statusText);
    }
    throw new Error(`nash-welfare-multi-source service returned ${response.status}: ${detail}`);
  }

  const data = await response.json();
  return {
    allocationKwh: data.amount,
    householdTotalKwh: data.total,
    sourceUsedKwh: data.used,
    objectiveValue: data.objective_value,
    solverStatus: data.solver_status,
    algorithm: 'nash_welfare_multi_source_remote',
  };
}
