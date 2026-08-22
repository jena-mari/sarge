/**
 * Wollongong Energy Equity reference data — version 1.
 *
 * Pure configuration, no executable logic (same convention as
 * `hardshipPolicyV1.js`). Every figure here is sourced from the two
 * documents supplied with the challenge brief:
 *
 *   [Framework] = DRAFT Wollongong Energy Equity Framework ("Plan_v6")
 *   [Assessment] = Wollongong Energy Equity Assessment (20pp)
 *
 * Each constant below cites the page it came from. Nothing here is
 * invented — where the source data was unavailable (this session's
 * network policy blocked profile.id.com.au/wollongong, which would have
 * given a full household-income distribution), that's called out
 * explicitly in `deriveHardshipFactors.js` rather than silently
 * papered over with a guess.
 *
 * To change this data (e.g. once profile.id.com.au figures are in
 * hand, or Council publishes an updated Assessment), add a new
 * versioned file (wollongongEquityDataV2.js) rather than editing this
 * one in place — same reproducibility rule as the hardship policy.
 */

/** Council's own 2030 target metric: get the share of LGA households
 * spending >= this fraction of income on energy under 10%.
 * [Framework p.8, p.17] */
export const COUNCIL_ENERGY_BURDEN_TARGET_PCT = 0.10;

/** LGA-wide residential solar (PV) density. The Assessment's own
 * hardship analysis uses 35%; the FY24-25 installations CSV gives a
 * very close but not identical 36.4% (different snapshot date /
 * denominator — 73,390 houses in the CSV vs the Assessment's Census
 * count). Documented as two independent, consistent measurements
 * rather than reconciled into one, since neither source's raw
 * household count was available to redo the maths ourselves.
 * [Assessment p.9; installations-by-suburb CSV, FY24-25 header] */
export const LGA_RESIDENTIAL_SOLAR_DENSITY_PCT = 0.35;

/** LGA-wide share of households in energy poverty (>= 10% of income on
 * energy). The Assessment gives a range because different income cuts
 * produce different counts; reported as roughly 10,900-15,900
 * households (13-18%). [Assessment p.5, p.9] */
export const LGA_ENERGY_POVERTY_RATE_RANGE_PCT = [0.13, 0.18];

/** Average combined weekly energy cost and consumption, LGA-wide —
 * the numbers the Assessment itself builds its hardship maths from.
 * Electricity: 86 kWh/week at ~44-44.5c/kWh -> $38.06/week.
 * Gas: 281 MJ/week at 5.4c/MJ -> $15.19/week.
 * Combined: $53.25/week. [Assessment pp.6-10] */
export const AVERAGE_WEEKLY_ELECTRICITY_KWH = 86;
export const AVERAGE_WEEKLY_ENERGY_COST_DOLLARS = 53.25;

/** The two income brackets the Assessment itself reports against,
 * used here as the only real (if coarse) income signal available —
 * profile.id.com.au/wollongong, which would give a continuous income
 * distribution, was not reachable from this session (network policy
 * blocked the domain). Households under $500/week fall in the 11%+
 * energy-burden bracket (13% of LGA households); under $650/week fall
 * in the 8%+ bracket (18% of LGA households). [Assessment pp.6-10] */
export const INCOME_BRACKET_HIGH_BURDEN_WEEKLY_DOLLARS = 500;
export const INCOME_BRACKET_MODERATE_BURDEN_WEEKLY_DOLLARS = 650;

/** NSW Low Income Household Rebate, FY24/25. [Assessment p.9; NSW
 * Social Programs for Energy Code] */
export const LOW_INCOME_REBATE_ANNUAL_DOLLARS = 285;

/** Typical household arrears observed in the Save4Good pilot (Port
 * Kembla). Used as the anchor range for the payment_difficulty
 * derivation — see deriveHardshipFactors.js. [Assessment p.10] */
export const TYPICAL_ARREARS_RANGE_DOLLARS = [1800, 3500];

/**
 * The five suburbs that recur across every disadvantage measure the
 * Assessment tracks: lowest SEIFA (socioeconomic disadvantage) rank,
 * highest energy-poverty share, lowest solar density, and/or highest
 * social-housing share. Not all five metrics are published for every
 * suburb in the source; `note` records which ones are.
 *
 * IMPORTANT: this is suburb-level targeting data, not a per-household
 * signal. A specific household in one of these suburbs is not
 * automatically high-hardship, and a household outside this list is
 * not automatically low-hardship — see the methodology note in
 * `deriveHardshipFactors.js` on why this feeds `area_disadvantage`
 * and `is_high_need_area`, not `income_gap` or `payment_difficulty`.
 * [Assessment p.5, p.9, p.11, p.12]
 */
export const PRIORITY_SUBURBS = {
  Warrawong: {
    solarDensityPct: 0.193,
    energyPovertyBracketPct: 0.26,
    socialHousingSharePct: 0.186,
    note: 'Lowest SEIFA rank (1st); highest energy-poverty share of the five.',
  },
  Cringila: {
    solarDensityPct: null, // not published in the source
    energyPovertyBracketPct: 0.21,
    socialHousingSharePct: null,
    note: 'Lowest SEIFA rank; also the LGA\'s most linguistically diverse suburb (41% English-only) — see accessibilityNote below.',
  },
  Bellambi: {
    solarDensityPct: 0.179,
    energyPovertyBracketPct: 0.19,
    socialHousingSharePct: 0.294,
    note: 'Lowest solar density in the LGA; highest social-housing share of the five.',
  },
  Koonawarra: {
    solarDensityPct: null,
    energyPovertyBracketPct: null,
    socialHousingSharePct: 0.217,
    note: 'Lowest SEIFA rank; social-housing share published, energy-poverty/solar figures were not.',
  },
  Berkeley: {
    solarDensityPct: null,
    energyPovertyBracketPct: 0.19,
    socialHousingSharePct: 0.202,
    note: 'Lowest SEIFA rank.',
  },
};

/** English-only-at-home share, for context only — not currently fed
 * into any hardship factor (this is an accessibility/outreach
 * consideration, not a fairness-weighting one; folding it into the
 * numeric score would need real justification this project doesn't
 * have yet). Cringila is the low end, Koonawarra close to the LGA
 * norm. [Assessment p.14] */
export const ACCESSIBILITY_NOTE = {
  Cringila: { englishOnlyPct: 0.41 },
  Koonawarra: { englishOnlyPct: 0.87 },
};

/** Suburbs with genuinely high renter shares that are NOT hardship
 * signals — driven by University of Wollongong student housing
 * demand, not disadvantage. Recorded explicitly so nobody building a
 * future tenure-based factor accidentally treats these the same as
 * the PRIORITY_SUBURBS list. [Assessment p.12] */
export const STUDENT_DRIVEN_RENTAL_SUBURBS = ['North Wollongong', 'Gwynneville', 'Wollongong'];

/**
 * @param {string} suburb
 * @returns {boolean} true if Council's own Assessment names this suburb
 *   as one of the five recurring highest-disadvantage areas.
 */
export function isPrioritySuburb(suburb) {
  return Object.prototype.hasOwnProperty.call(PRIORITY_SUBURBS, suburb);
}
