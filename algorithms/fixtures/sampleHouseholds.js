/**
 * Synthetic, non-identifying household fixtures for tests and demos.
 * No real household data — every field is fabricated.
 *
 * Household E is on the life-support register (life_support_flag: 1),
 * deliberately given LOW underlying hardship factors so its
 * weighted-formula-only score would be low (~0.185) — this makes the
 * hard-override behaviour visible: the flag alone forces its score to
 * 1.0, independent of the five weighted factors.
 */

export const SAMPLE_HOUSEHOLDS_HARDSHIP = [
  {
    id: 'household-a',
    name: 'Household A',
    life_support_flag: 0,
    is_high_need_area: 0,
    income_gap: 1.0,
    area_disadvantage: 1.0,
    payment_difficulty: 0.8,
    energy_burden: 0.9,
    no_solar_access: 0.7,
  },
  {
    id: 'household-b',
    name: 'Household B',
    life_support_flag: 0,
    is_high_need_area: 0,
    income_gap: 0.5,
    area_disadvantage: 0.4,
    payment_difficulty: 0.3,
    energy_burden: 0.6,
    no_solar_access: 1.0,
  },
  {
    id: 'household-c',
    name: 'Household C',
    life_support_flag: 0,
    is_high_need_area: 0,
    income_gap: 0.1,
    area_disadvantage: 0.1,
    payment_difficulty: 0.1,
    energy_burden: 0.2,
    no_solar_access: 0.0,
  },
  {
    id: 'household-d',
    name: 'Household D',
    life_support_flag: 0,
    is_high_need_area: 0,
    income_gap: 0.7,
    area_disadvantage: 0.6,
    payment_difficulty: 0.5,
    energy_burden: 0.7,
    no_solar_access: 0.4,
  },
  {
    id: 'household-e',
    name: 'Household E (life-support register)',
    life_support_flag: 1,
    is_high_need_area: 0,
    income_gap: 0.2,
    area_disadvantage: 0.2,
    payment_difficulty: 0.1,
    energy_burden: 0.3,
    no_solar_access: 0.1,
  },
];

/** Default demo pool sized so all 5 households can reach a 5 kWh cap
 * (25 kWh) plus a 2 kWh reserve, with headroom to spare — the "full
 * success" demo state, not the scarcity/exhaustion state. */
export const SAMPLE_POOL_KWH = 30;
export const SAMPLE_RESERVE_KWH = 2;
export const SAMPLE_CAP_KWH = 5;
