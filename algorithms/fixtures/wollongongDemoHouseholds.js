/**
 * Wollongong-grounded household fixtures for demos and explainability
 * examples.
 *
 * IMPORTANT — same disclaimer as sampleHouseholds.js, stated more
 * strongly because these are more specific: every household below is a
 * FABRICATED, NON-IDENTIFYING example. No real person, household, or
 * address is represented. What IS real: the suburb names, the LGA-wide
 * and per-suburb statistics they're built from (income brackets, energy
 * cost, arrears range, solar density), and the derivation formulas in
 * `deriveHardshipFactors.js` that turn a household's own weekly income,
 * energy cost, arrears, and solar-ownership status into the 0-1 hardship
 * factors `hardshipScore.js` expects. Each household's own inputs
 * (income, cost, arrears, solar) are illustrative choices made to sit
 * inside the real, cited ranges for its suburb — they are not drawn
 * from, or claimed to represent, any actual survey respondent or
 * dataset row.
 *
 * See `../../wollongong_energy_equity_research_brief.md` (delivered
 * alongside this fixture) for the full source citations.
 */

import {
  deriveEnergyBurdenFactor,
  deriveIncomeGapFactor,
  derivePaymentDifficultyFactor,
  deriveAreaDisadvantageFactor,
  deriveNoSolarAccessFactor,
} from '../src/scoring/deriveHardshipFactors.js';
import { isPrioritySuburb } from '../policies/wollongongEquityDataV1.js';

/**
 * @param {Object} raw
 * @param {string} raw.id
 * @param {string} raw.name
 * @param {string} raw.suburb
 * @param {number} raw.weeklyIncomeDollars
 * @param {number} raw.weeklyEnergyCostDollars
 * @param {number} raw.currentArrearsDollars
 * @param {boolean} raw.hasSolar
 * @param {number} [raw.lifeSupportFlag]
 * @param {number} raw.capKwh
 */
function buildHousehold(raw) {
  const { factor: energyBurden, burdenPct } = deriveEnergyBurdenFactor(
    raw.weeklyEnergyCostDollars,
    raw.weeklyIncomeDollars
  );
  return {
    id: raw.id,
    name: raw.name,
    suburb: raw.suburb,
    life_support_flag: raw.lifeSupportFlag ?? 0,
    is_high_need_area: isPrioritySuburb(raw.suburb) ? 1 : 0,
    income_gap: deriveIncomeGapFactor(raw.weeklyIncomeDollars),
    area_disadvantage: deriveAreaDisadvantageFactor(raw.suburb),
    payment_difficulty: derivePaymentDifficultyFactor(raw.currentArrearsDollars),
    energy_burden: energyBurden,
    no_solar_access: deriveNoSolarAccessFactor(raw.hasSolar, raw.suburb),
    capKwh: raw.capKwh,
    // Preserved for explainAllocation()'s Council-context comparison —
    // not consumed by hardshipScore.js itself.
    weeklyEnergyBurdenPct: burdenPct,
    weeklyIncomeDollars: raw.weeklyIncomeDollars,
    weeklyEnergyCostDollars: raw.weeklyEnergyCostDollars,
    currentArrearsDollars: raw.currentArrearsDollars,
    hasSolar: raw.hasSolar,
  };
}

export const WOLLONGONG_DEMO_HOUSEHOLDS = [
  buildHousehold({
    id: 'wlg-bellambi-a',
    name: 'Bellambi household A',
    suburb: 'Bellambi',
    // $58/wk energy cost: LGA average ($53.25) plus a documented rental
    // premium (older, less efficient rental housing stock is a named
    // driver of energy hardship in the Assessment, p.3) — not itself a
    // sourced dollar figure, an illustrative choice within a defensible
    // range.
    weeklyIncomeDollars: 480,
    weeklyEnergyCostDollars: 58,
    currentArrearsDollars: 2400,
    hasSolar: false,
    capKwh: 7,
  }),
  buildHousehold({
    id: 'wlg-warrawong-b',
    name: 'Warrawong household B',
    suburb: 'Warrawong',
    weeklyIncomeDollars: 610,
    weeklyEnergyCostDollars: 55,
    currentArrearsDollars: 1800,
    hasSolar: false,
    capKwh: 6,
  }),
  buildHousehold({
    id: 'wlg-cringila-c',
    name: 'Cringila household C',
    suburb: 'Cringila',
    weeklyIncomeDollars: 520,
    weeklyEnergyCostDollars: 53.25,
    currentArrearsDollars: 3000,
    hasSolar: false,
    capKwh: 6,
  }),
  buildHousehold({
    id: 'wlg-koonawarra-d',
    name: 'Koonawarra household D',
    suburb: 'Koonawarra',
    weeklyIncomeDollars: 450,
    weeklyEnergyCostDollars: 60,
    currentArrearsDollars: 1900,
    hasSolar: false,
    capKwh: 7,
  }),
  buildHousehold({
    id: 'wlg-coniston-g',
    name: 'Coniston household G',
    // Deliberately NOT one of Council's five named priority suburbs —
    // included specifically to demonstrate that the hardship formula
    // reaches a genuinely high score from a household's own income,
    // energy cost, and arrears alone, without the is_high_need_area
    // override doing the work. This matters: hardshipPolicyV1.js
    // already treats is_high_need_area as a hard OVERRIDE field (forces
    // hardship_score straight to 1.0), which existed before this data
    // work. Once is_high_need_area is wired to the real named priority
    // suburbs (see wollongongEquityDataV1.js), every household in
    // Bellambi/Warrawong/Cringila/Koonawarra/Berkeley gets that same
    // 1.0 override regardless of its own income or arrears — correct
    // for genuinely flagging those suburbs as Council priorities, but
    // it means those four households in this fixture set don't actually
    // exercise the weighted formula, they all just hit the override
    // ceiling together. This household is the control case that proves
    // the formula itself is doing real, differentiated work, not just
    // riding the override. Coniston: 163 residential installs since
    // 2001, modest solar uptake — installations-by-suburb CSV.
    suburb: 'Coniston',
    weeklyIncomeDollars: 470,
    weeklyEnergyCostDollars: 56,
    currentArrearsDollars: 2200,
    hasSolar: false,
    capKwh: 7,
  }),
  buildHousehold({
    id: 'wlg-cordeaux-heights-e',
    name: 'Cordeaux Heights household E',
    // A comparison household in a suburb NOT on Council's priority
    // list, with above-median income and existing solar (Cordeaux
    // Heights: 745 residential installs since 2001, 7.19% YoY growth —
    // installations-by-suburb CSV) — deliberately included so the demo
    // can show the algorithm producing a low allocation for a genuinely
    // low-hardship household, not just high allocations for hardship
    // cases.
    suburb: 'Cordeaux Heights',
    weeklyIncomeDollars: 1400,
    weeklyEnergyCostDollars: 50,
    currentArrearsDollars: 0,
    hasSolar: true,
    capKwh: 6,
  }),
  buildHousehold({
    id: 'wlg-figtree-life-support-f',
    name: 'Figtree household F (life-support register)',
    // Same pedagogical point the original sampleHouseholds.js made with
    // "Household E" — a life-support household with otherwise LOW
    // underlying hardship (comfortable income, has solar, no arrears)
    // to make the hard-override behaviour visible: the flag alone
    // forces the tier0 bypass, independent of the five weighted
    // factors. Figtree: 1,637 residential installs since 2001, not a
    // priority suburb — installations-by-suburb CSV.
    suburb: 'Figtree',
    weeklyIncomeDollars: 1100,
    weeklyEnergyCostDollars: 48,
    currentArrearsDollars: 0,
    hasSolar: true,
    lifeSupportFlag: 1,
    capKwh: 8,
  }),
];

/** Deliberately scarce: less than the sum of all caps (47 kWh), so the
 * demo shows real tradeoffs being made, not everyone simply hitting
 * their cap. */
export const WOLLONGONG_DEMO_POOL_KWH = 24;
