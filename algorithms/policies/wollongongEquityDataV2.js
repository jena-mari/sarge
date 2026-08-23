/**
 * Wollongong Energy Equity reference data — version 2.
 *
 * Adds real, suburb-level (not just LGA-wide or SA2-level) ABS SEIFA
 * Index of Relative Socio-economic Disadvantage (IRSD) 2021 data,
 * sourced from the profile.id.com.au Wollongong City community profile
 * PDF (user-exported, since the live site blocks automated fetches)
 * — itself compiling ABS Census of Population and Housing 2021 data.
 * [profile.id Wollongong City community profile, pp.100-103, "SEIFA by
 * Local Government Area" / "SEIFA by profile area"]
 *
 * WHY A V2 FILE, AND WHY THIS SUPERSEDES THE SA2/ABS-API RECOMMENDATION
 * ------------------------------------------------------------------
 * `system_audit_vs_real_data.md` (delivered earlier) recommended
 * picking the ABS/SA2 pipeline described in
 * `frontend/algorithm/docs/DataProvenance.jsx` as the primary
 * real-data layer for `area_disadvantage`, because SA2-level IRSD
 * deciles are more rigorous than a hand-assembled suburb list. That
 * recommendation predates this file. profile.id.com.au's own community
 * profile report — which compiles the same underlying ABS Census 2021
 * SEIFA data — publishes IRSD scores at an even finer grain than SA2:
 * per named "profile area" (Wollongong's own small-area/suburb
 * geography), not the blended multi-suburb SA2 units DataProvenance.jsx
 * describes. That's strictly better for this use case: SA2
 * "Corrimal–Tarrawanna–Bellambi" blends three suburbs into one decile,
 * which made Bellambi look markedly less disadvantaged than
 * Warrawong/Cringila; profile.id's suburb-level table shows Bellambi's
 * own real score (percentile 5) sits solidly alongside them (Warrawong
 * 2, Cringila 3, Koonawarra 6, Berkeley 7). This file supersedes the
 * SA2 approach for `area_disadvantage` while keeping the same
 * underlying commitment the original recommendation was made for:
 * pick the most rigorous real ABS-sourced data actually available.
 *
 * `no_solar_access` is UNAFFECTED by this file — it continues to use
 * `wollongongEquityDataV1.js`'s per-suburb solar-installation CSV
 * figures, per the same recommendation's second half ("fold the
 * Assessment-based suburb work in as a supplementary signal").
 *
 * `income_gap` and the 6%-vs-10% energy_burden threshold question are
 * OUT OF SCOPE for this file — both remain on v1 pending a separate,
 * deliberate decision (see system_audit_vs_real_data.md §1). A median
 * household income figure is recorded below for context/reconciliation
 * only, not wired into any factor.
 *
 * To change this data, add wollongongEquityDataV3.js rather than
 * editing this one in place — same reproducibility rule as v1.
 */

/**
 * ABS SEIFA Index of Relative Socio-economic Disadvantage (IRSD), 2021,
 * for every Wollongong City Council small area / "profile area"
 * published in the source (council-ward rows omitted — wards are an
 * administrative geography, not a suburb). `percentile` is profile.id's
 * own published national percentile (higher = less disadvantaged; e.g.
 * 2 means the area is more disadvantaged than 98% of Australian
 * suburbs). Recorded verbatim rather than re-derived, so every figure
 * here is directly checkable against the source PDF.
 * [profile.id Wollongong City community profile pp.102-103]
 */
export const SEIFA_IRSD_2021_BY_PROFILE_AREA = {
  'Stanwell Park - Stanwell Tops - Coalcliff and surrounds': { index: 1111.0, percentile: 99 },
  Austinmer: { index: 1101.7, percentile: 97 },
  'Wongawilli - Dombarton - Huntley': { index: 1100.8, percentile: 97 },
  'Wombarra - Coledale - Scarborough - Clifton': { index: 1098.7, percentile: 96 },
  'Mount Ousley - Mount Pleasant': { index: 1092.8, percentile: 95 },
  Thirroul: { index: 1091.6, percentile: 94 },
  'Cordeaux Heights - Mount Kembla - Kembla Heights': { index: 1083.5, percentile: 92 },
  'Helensburgh - Lilyvale - Otford': { index: 1079.5, percentile: 90 },
  'Farmborough Heights': { index: 1070.9, percentile: 86 },
  'Haywards Bay - Yallah - Marshall Mount': { index: 1069.5, percentile: 85 },
  Bulli: { index: 1060.0, percentile: 79 },
  Mangerton: { index: 1057.7, percentile: 78 },
  Figtree: { index: 1054.1, percentile: 75 },
  'Keiraville - Mount Keira': { index: 1043.8, percentile: 68 },
  Horsley: { index: 1035.7, percentile: 63 },
  'Woonona - Russell Vale': { index: 1027.8, percentile: 58 },
  Kanahooka: { index: 1009.3, percentile: 47 },
  'Balgownie - Tarrawanna - Fernhill': { index: 1008.7, percentile: 47 },
  'North Wollongong': { index: 1008.0, percentile: 46 },
  Towradgi: { index: 1004.6, percentile: 44 },
  Wollongong: { index: 1003.4, percentile: 44 },
  'East Corrimal': { index: 1003.2, percentile: 44 },
  'West Wollongong': { index: 998.2, percentile: 41 },
  Corrimal: { index: 996.8, percentile: 40 },
  'Coniston - Mount Saint Thomas': { index: 982.9, percentile: 33 },
  'Fairy Meadow': { index: 976.9, percentile: 30 },
  'Dapto - Brownsville': { index: 971.7, percentile: 27 },
  'Cleveland - Avondale': { index: 971.6, percentile: 27 },
  Gwynneville: { index: 950.3, percentile: 20 },
  'Windang - Primbee': { index: 939.8, percentile: 17 },
  'Lake Heights': { index: 936.1, percentile: 16 },
  'Port Kembla - Spring Hill': { index: 930.5, percentile: 15 },
  'Unanderra - Kembla Grange': { index: 927.2, percentile: 14 },
  Berkeley: { index: 885.1, percentile: 7 },
  Koonawarra: { index: 868.4, percentile: 6 },
  Bellambi: { index: 845.7, percentile: 5 },
  Cringila: { index: 796.3, percentile: 3 },
  Warrawong: { index: 764.6, percentile: 2 },
};

/** Wollongong City LGA-wide IRSD, used as the default for any suburb
 * not individually published above. The LGA itself sits just below the
 * national and NSW medians (1,001.2 and 1,000.0 respectively), so this
 * is a genuine "roughly average, slightly disadvantaged" default, not
 * an arbitrary low or high baseline invented for this project.
 * [profile.id p.98 ("...was 1,000"); exact 2021 index/percentile row
 * on p.102] */
export const WOLLONGONG_LGA_SEIFA_IRSD = { index: 999.8, percentile: 42 };

/** Short suburb names used elsewhere in this codebase (fixtures, mock
 * UI data) that map onto a compound profile-area name above. Kept as
 * an explicit, reviewable list rather than fuzzy string matching, so
 * every mapping is a deliberate, checkable decision rather than a
 * silent guess. */
const SUBURB_NAME_ALIASES = {
  Dapto: 'Dapto - Brownsville',
  'Cordeaux Heights': 'Cordeaux Heights - Mount Kembla - Kembla Heights',
  Coniston: 'Coniston - Mount Saint Thomas',
  Unanderra: 'Unanderra - Kembla Grange',
  'Port Kembla': 'Port Kembla - Spring Hill',
  Woonona: 'Woonona - Russell Vale',
};

/**
 * Resolves a suburb name (as used anywhere in this codebase) to its
 * real 2021 SEIFA IRSD figures, trying an exact match first, then a
 * known alias, then falling back to the Wollongong City LGA-wide
 * figure for a suburb this source doesn't individually publish.
 *
 * @param {string} suburb
 * @returns {{ index: number, percentile: number, matchedArea: string, isLgaFallback: boolean }}
 */
export function getSeifaForSuburb(suburb) {
  if (typeof suburb !== 'string' || suburb.trim() === '') {
    throw new TypeError(`suburb must be a non-empty string, got ${suburb}`);
  }

  const direct = SEIFA_IRSD_2021_BY_PROFILE_AREA[suburb];
  if (direct) return { ...direct, matchedArea: suburb, isLgaFallback: false };

  const alias = SUBURB_NAME_ALIASES[suburb];
  const aliased = alias && SEIFA_IRSD_2021_BY_PROFILE_AREA[alias];
  if (aliased) return { ...aliased, matchedArea: alias, isLgaFallback: false };

  return {
    ...WOLLONGONG_LGA_SEIFA_IRSD,
    matchedArea: 'Wollongong City (LGA average — suburb not individually published in the source)',
    isLgaFallback: true,
  };
}

/** Suburbs at or below this national percentile are treated as
 * Council's highest-need areas. Set at 10 because it independently
 * reproduces exactly the five suburbs Council's own Energy Equity
 * Assessment names as priority areas — Warrawong (2), Cringila (3),
 * Bellambi (5), Koonawarra (6), Berkeley (7) — with a clean margin to
 * the next-most-disadvantaged profile area, Unanderra - Kembla Grange,
 * at 14. See wollongongEquityDataV2.test.js for the equivalence check.
 * That agreement between an independent ABS statistic and Council's own
 * suburb-level fieldwork is worth having as a citable cross-validation
 * in the pitch, not just a coincidence to note quietly. */
export const IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD = 10;

/**
 * @param {string} suburb
 * @returns {boolean}
 */
export function isHighNeedAreaBySeifa(suburb) {
  return getSeifaForSuburb(suburb).percentile <= IS_HIGH_NEED_SEIFA_PERCENTILE_THRESHOLD;
}

/** Median weekly household income, Wollongong City LGA — cited from two
 * independent ABS Census 2021 compilations that disagree slightly: ABS
 * QuickStats (LGA18450) gives $1,682/week (the figure
 * `DataProvenance.jsx` cites); this profile.id.com.au community profile
 * report gives $1,637/week. Both cite ABS Census 2021 as their source;
 * the ~2.7% gap is most likely a rounding or geography-boundary-version
 * difference between the two compilations, not a real disagreement
 * about the underlying population. Recorded here so the discrepancy is
 * documented rather than silently sitting unreconciled in two different
 * files. NOT currently wired into `deriveIncomeGapFactor()` — that
 * function still uses the Assessment's own two published income
 * brackets (see wollongongEquityDataV1.js); switching income_gap onto
 * this ABS median is a separate, not-yet-made decision. */
export const LGA_MEDIAN_WEEKLY_HOUSEHOLD_INCOME_DOLLARS = {
  absQuickStats2021: 1682,
  profileIdCommunityProfile2021: 1637,
};
