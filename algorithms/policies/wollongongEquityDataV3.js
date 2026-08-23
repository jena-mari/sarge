/**
 * Wollongong Energy Equity reference data — version 3.
 *
 * Adds real ABS SEIFA Index of Relative Socio-economic Disadvantage
 * (IRSD) 2021 data at Suburbs and Localities (SAL) level — real suburb
 * boundaries, drawn directly by the ABS, not a blended multi-suburb
 * "profile area" grouping. Queried live from ABS's own ArcGIS
 * FeatureServer (layer `ABS_Socio_Economic_Indexes_for_Areas_SEIFA_by_2021_SAL`)
 * and cross-checked suburb-by-suburb against the real, cited suburb
 * list already established in `wollongongEquityDataV2.js`'s profile.id
 * table plus the negligible-population localities named in
 * `frontend/algorithm/docs/DataProvenance.jsx` §02's Tier-3 discussion
 * (Avon, Cordeaux, Woronora Dam). One correction surfaced during that
 * cross-check: "Lindendale" was assumed to have no ABS SAL score — it
 * in fact does (decile 7, percentile 61) and is included below as a
 * normal Tier-1 suburb, not a fallback case. Only Avon, Cordeaux and
 * Woronora Dam are genuine no-score SAL localities within the LGA
 * (real SAL codes, null population/IRSD in the ABS layer) — recorded
 * in `ABS_SAL_LOCALITIES_WITHOUT_SCORE` for completeness, not used by
 * the resolver below (their absence from the main map already causes
 * the correct fallthrough).
 *
 * WHY THIS FILE, AND WHY IT SUPERSEDES v2 FOR area_disadvantage /
 * is_high_need_area
 * ------------------------------------------------------------------
 * v2's own module docstring already explains why profile.id's
 * suburb-level data beat the earlier SA2 approach: SA2 groups multiple
 * suburbs into one blended decile ("Corrimal–Tarrawanna–Bellambi" hid
 * Bellambi's real disadvantage behind its more comfortable
 * neighbours). profile.id's own "profile area" boundaries turn out to
 * have the exact same blending problem, just with different suburbs:
 * its "Unanderra - Kembla Grange" profile area (percentile 14, just
 * outside the high-need threshold) blends Unanderra (a genuinely
 * high-need suburb) with the considerably more comfortable Kembla
 * Grange. ABS's own SAL geography draws Unanderra and Kembla Grange as
 * two separate suburbs — Unanderra alone scores decile 1 (percentile
 * 8), matching Council's own priority-suburb pattern; Kembla Grange
 * alone scores decile 9. Whichever real, ABS-sourced geography avoids
 * blending disadvantaged and comfortable suburbs together wins — that
 * was v2's own stated principle, and here it points to a different,
 * finer table for the suburbs where the two disagree.
 *
 * `resolveAreaDisadvantage()` below is the tiered rule documented in
 * `frontend/algorithm/docs/DataProvenance.jsx` §02: check ABS SAL
 * first (this file), fall back to profile.id (v2) only for a suburb
 * this file doesn't individually cover, and fall back to the
 * Wollongong LGA-wide default (v2) only if neither does. In practice,
 * ABS SAL covers every suburb this codebase currently names, so the
 * profile.id tier is exercised only by suburbs not yet added here (see
 * its own test coverage via dependency injection, not real data).
 *
 * `income_gap`, `energy_burden`'s threshold, and `no_solar_access`
 * remain untouched by this file — same as v2.
 *
 * To change this data, add wollongongEquityDataV4.js rather than
 * editing this one in place — same reproducibility rule as v1 and v2.
 */

import {
  getSeifaForSuburb,
  WOLLONGONG_LGA_SEIFA_IRSD,
  IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD,
} from './wollongongEquityDataV2.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * ABS SEIFA IRSD 2021 at Suburbs and Localities (SAL) level, for every
 * Wollongong-area suburb this codebase currently names. `decile` and
 * `percentile` are both ABS's own published national rankings (decile
 * 1 / percentile ≤10 = most disadvantaged 10% of Australian suburbs).
 * Queried live from ABS's ArcGIS FeatureServer, recorded verbatim — no
 * figure here is re-derived, so every one is directly re-queryable
 * against the same live endpoint.
 * [ABS SEIFA by 2021 SAL, live ArcGIS FeatureServer]
 */
export const ABS_SAL_DECILE_BY_SUBURB = {
  'Stanwell Park': { population: 1532, irsdScore: 1111.2, decile: 10, percentile: 99 },
  'Stanwell Tops': { population: 517, irsdScore: 1118.8, decile: 10, percentile: 99 },
  Coalcliff: { population: 212, irsdScore: 1112.8, decile: 10, percentile: 99 },
  Austinmer: { population: 2725, irsdScore: 1101.7, decile: 10, percentile: 97 },
  Wongawilli: { population: 1213, irsdScore: 1105.2, decile: 10, percentile: 98 },
  Dombarton: { population: 130, irsdScore: 1074.6, decile: 9, percentile: 88 },
  Huntley: { population: 66, irsdScore: 1090.5, decile: 10, percentile: 94 },
  Wombarra: { population: 944, irsdScore: 1102.2, decile: 10, percentile: 97 },
  Coledale: { population: 1372, irsdScore: 1091.6, decile: 10, percentile: 94 },
  Scarborough: { population: 325, irsdScore: 1116.0, decile: 10, percentile: 99 },
  Clifton: { population: 35, irsdScore: 1118.9, decile: 10, percentile: 100 },
  'Mount Ousley': { population: 1611, irsdScore: 1077.5, decile: 9, percentile: 89 },
  'Mount Pleasant': { population: 1397, irsdScore: 1110.4, decile: 10, percentile: 98 },
  Thirroul: { population: 6348, irsdScore: 1091.6, decile: 10, percentile: 94 },
  'Cordeaux Heights': { population: 4460, irsdScore: 1084.5, decile: 10, percentile: 92 },
  'Mount Kembla': { population: 1083, irsdScore: 1080.7, decile: 9, percentile: 90 },
  'Kembla Heights': { population: 88, irsdScore: 1067.3, decile: 9, percentile: 84 },
  Helensburgh: { population: 6576, irsdScore: 1078.0, decile: 9, percentile: 89 },
  Lilyvale: { population: 11, irsdScore: 1071.9, decile: 9, percentile: 86 },
  Otford: { population: 396, irsdScore: 1105.2, decile: 10, percentile: 98 },
  'Farmborough Heights': { population: 4179, irsdScore: 1070.9, decile: 9, percentile: 86 },
  'Haywards Bay': { population: 1280, irsdScore: 1071.4, decile: 9, percentile: 86 },
  Yallah: { population: 122, irsdScore: 1095.5, decile: 10, percentile: 96 },
  'Marshall Mount': { population: 177, irsdScore: 1060.1, decile: 8, percentile: 79 },
  Bulli: { population: 6798, irsdScore: 1060.0, decile: 8, percentile: 79 },
  Mangerton: { population: 2862, irsdScore: 1057.7, decile: 8, percentile: 78 },
  Figtree: { population: 12335, irsdScore: 1054.1, decile: 8, percentile: 75 },
  Keiraville: { population: 4001, irsdScore: 1026.7, decile: 6, percentile: 58 },
  'Mount Keira': { population: 1691, irsdScore: 1084.3, decile: 10, percentile: 92 },
  Horsley: { population: 9437, irsdScore: 1035.7, decile: 7, percentile: 63 },
  Woonona: { population: 12374, irsdScore: 1030.8, decile: 6, percentile: 60 },
  'Russell Vale': { population: 1593, irsdScore: 1004.5, decile: 5, percentile: 44 },
  Kanahooka: { population: 5698, irsdScore: 1009.3, decile: 5, percentile: 47 },
  Balgownie: { population: 5722, irsdScore: 1030.6, decile: 6, percentile: 60 },
  Tarrawanna: { population: 2184, irsdScore: 992.0, decile: 4, percentile: 38 },
  Fernhill: { population: 987, irsdScore: 918.1, decile: 2, percentile: 12 },
  'North Wollongong': { population: 2299, irsdScore: 1008.0, decile: 5, percentile: 46 },
  Towradgi: { population: 3241, irsdScore: 1004.6, decile: 5, percentile: 44 },
  Wollongong: { population: 20446, irsdScore: 1003.4, decile: 5, percentile: 44 },
  'East Corrimal': { population: 3432, irsdScore: 1002.8, decile: 5, percentile: 43 },
  'West Wollongong': { population: 5223, irsdScore: 998.2, decile: 5, percentile: 41 },
  Corrimal: { population: 6972, irsdScore: 996.8, decile: 4, percentile: 40 },
  Coniston: { population: 2267, irsdScore: 971.7, decile: 3, percentile: 27 },
  'Mount Saint Thomas': { population: 1449, irsdScore: 1003.3, decile: 5, percentile: 44 },
  'Fairy Meadow': { population: 7512, irsdScore: 976.9, decile: 3, percentile: 30 },
  Dapto: { population: 10954, irsdScore: 973.2, decile: 3, percentile: 28 },
  Brownsville: { population: 524, irsdScore: 940.1, decile: 2, percentile: 17 },
  Cleveland: { population: 22, irsdScore: 1060.1, decile: 8, percentile: 79 },
  Avondale: { population: 1695, irsdScore: 959.4, decile: 3, percentile: 23 },
  Gwynneville: { population: 3139, irsdScore: 950.3, decile: 2, percentile: 20 },
  Windang: { population: 2610, irsdScore: 931.3, decile: 2, percentile: 15 },
  Primbee: { population: 1623, irsdScore: 953.8, decile: 3, percentile: 21 },
  'Lake Heights': { population: 4105, irsdScore: 936.1, decile: 2, percentile: 16 },
  'Port Kembla': { population: 5088, irsdScore: 930.5, decile: 2, percentile: 15 },
  'Spring Hill': { population: 92, irsdScore: 936.6, decile: 2, percentile: 16 },
  Unanderra: { population: 5476, irsdScore: 890.5, decile: 1, percentile: 8 },
  'Kembla Grange': { population: 1452, irsdScore: 1064.8, decile: 9, percentile: 82 },
  Berkeley: { population: 7798, irsdScore: 885.1, decile: 1, percentile: 7 },
  Koonawarra: { population: 3732, irsdScore: 868.4, decile: 1, percentile: 6 },
  Bellambi: { population: 4039, irsdScore: 845.7, decile: 1, percentile: 5 },
  Cringila: { population: 2156, irsdScore: 796.3, decile: 1, percentile: 3 },
  Warrawong: { population: 4659, irsdScore: 764.6, decile: 1, percentile: 2 },
  Lindendale: { population: 263, irsdScore: 1033.0, decile: 7, percentile: 61 },
};

/**
 * Real SAL localities within the Wollongong area confirmed to exist in
 * ABS's SAL geography but with no published population/IRSD figures
 * (very small, largely uninhabited reservoir/catchment areas) — kept
 * here for documentation completeness so their absence from
 * `ABS_SAL_DECILE_BY_SUBURB` above is a disclosed, checked fact rather
 * than an unexplained gap. Not consumed by `resolveAreaDisadvantage()`
 * — a suburb simply not being a key in the map above already produces
 * the correct fallthrough to Tier 2 / Tier 3.
 */
export const ABS_SAL_LOCALITIES_WITHOUT_SCORE = ['Avon', 'Cordeaux', 'Woronora Dam'];

/**
 * The tiered `area_disadvantage` / `is_high_need_area` resolution rule
 * documented in `frontend/algorithm/docs/DataProvenance.jsx` §02,
 * built as a factory so tests can inject synthetic data sources to
 * exercise every tier deterministically — see
 * `resolveAreaDisadvantage.test.js` for real-data tests against the
 * production wiring below, and synthetic-fixture tests against this
 * factory directly for tiers real Wollongong data doesn't currently
 * exercise.
 *
 * @param {Object} sources
 * @param {Record<string, { decile: number, percentile: number }>} sources.absSalBySuburb
 * @param {(suburb: string) => { percentile: number, isLgaFallback: boolean, matchedArea: string }} sources.seifaForSuburb
 * @param {{ percentile: number }} sources.lgaSeifa
 * @param {number} [sources.highNeedPercentileThreshold]
 * @returns {(suburb: string) => { area_disadvantage: number, is_high_need_area: boolean, source: 'ABS SAL' | 'profile.id' | 'LGA-wide default', matchedArea: string, decile: number | null, percentile: number }}
 */
export function createAreaDisadvantageResolver({
  absSalBySuburb,
  seifaForSuburb,
  lgaSeifa,
  highNeedPercentileThreshold = IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD,
}) {
  return function resolveAreaDisadvantage(suburb) {
    if (typeof suburb !== 'string' || suburb.trim() === '') {
      throw new TypeError(`suburb must be a non-empty string, got ${suburb}`);
    }

    const absRow = absSalBySuburb[suburb];
    if (absRow) {
      return {
        area_disadvantage: clamp01((10 - absRow.decile) / 9),
        is_high_need_area: absRow.decile === 1,
        source: 'ABS SAL',
        matchedArea: suburb,
        decile: absRow.decile,
        percentile: absRow.percentile,
      };
    }

    const pidRow = seifaForSuburb(suburb);
    if (!pidRow.isLgaFallback) {
      return {
        area_disadvantage: clamp01((100 - pidRow.percentile) / 99),
        is_high_need_area: pidRow.percentile <= highNeedPercentileThreshold,
        source: 'profile.id',
        matchedArea: pidRow.matchedArea,
        decile: null,
        percentile: pidRow.percentile,
      };
    }

    return {
      area_disadvantage: clamp01((100 - lgaSeifa.percentile) / 99),
      is_high_need_area: false,
      source: 'LGA-wide default',
      matchedArea: 'Wollongong City (LGA average — suburb not individually published in either source)',
      decile: null,
      percentile: lgaSeifa.percentile,
    };
  };
}

/** Production wiring: ABS SAL (this file) → profile.id (v2) → LGA-wide
 * default (v2). Use this in application code; use
 * `createAreaDisadvantageResolver()` directly in tests that need to
 * inject synthetic data for a tier real Wollongong data doesn't
 * currently exercise. */
export const resolveAreaDisadvantage = createAreaDisadvantageResolver({
  absSalBySuburb: ABS_SAL_DECILE_BY_SUBURB,
  seifaForSuburb: getSeifaForSuburb,
  lgaSeifa: WOLLONGONG_LGA_SEIFA_IRSD,
});
