'use client';

import { useEffect, useRef } from 'react';
import { WOLLONGONG_DEMO_HOUSEHOLDS } from '../../../algorithms/fixtures/wollongongDemoHouseholds.js';

/*
 * This component is a verbatim embed of the standalone demo
 * (priority_fountain.html) — the exact same CSS, markup, and
 * vanilla-JS animation logic, unchanged. The only edits anywhere in
 * this file are (1) renaming two class names (.page -> .pf-page,
 * .eyebrow -> .pf-eyebrow) that would otherwise collide with
 * frontend/app/styles.css's own bare .page/.eyebrow rules, (2)
 * retargeting the original bare `body { ... }` rule onto `.pf-page`
 * instead -- the site also defines a global `body` rule, and rather
 * than rely on style-injection order to decide which one wins, this
 * removes the collision outright -- (3) a spliced-in "Back to
 * Sarge" link -- and (4) the five households' data, names, and
 * per-factor source citations, which now come from real Wollongong
 * data (see below) instead of generic placeholder numbers. Everything
 * else -- the wizard steps, the fountain animation, the household
 * tabs, the reserve band, all of it -- is byte-identical to the
 * source demo. Do not "clean up" or re-architect this into idiomatic
 * React; that was tried once and it lost the original charm. If the
 * demo itself needs to change, edit the standalone HTML first, verify
 * it there, then re-embed.
 */

/*
 * Real households, swapped in for the original demo's five generic
 * placeholder households (A: high hardship via sliders alone, B/D:
 * differentiated mid-range, C: comfortable/low, E: life-support
 * override with otherwise-low factors). Chosen from
 * WOLLONGONG_DEMO_HOUSEHOLDS to preserve that exact pedagogical shape
 * with genuine data instead of hand-picked numbers:
 *   A = Coniston   — reaches high hardship via the weighted formula
 *                    alone, NOT an override (proves the formula itself
 *                    differentiates hardship — see
 *                    wollongongDemoHouseholds.js's own comment on this
 *                    household).
 *   B = Bellambi   — is_high_need_area override (one of Council's five
 *                    named priority suburbs).
 *   C = Cordeaux Heights — comfortable, low hardship, has solar.
 *   D = Warrawong  — a second, different real suburb hitting the same
 *                    is_high_need_area override ceiling as B — shows
 *                    the override tying genuinely different suburbs
 *                    together, not just repeating one example.
 *   E = Figtree (life-support register) — life_support_flag override,
 *                    otherwise comfortable (has solar, no arrears).
 */
const DEMO_HOUSEHOLD_IDS = {
  A: 'wlg-coniston-g',
  B: 'wlg-bellambi-a',
  C: 'wlg-cordeaux-heights-e',
  D: 'wlg-warrawong-b',
  E: 'wlg-figtree-life-support-f',
};

function round2(value) {
  return Math.round(value * 100) / 100;
}

const REAL_DEFAULTS = {};
const REAL_FLAG_DEFAULTS = {};
const REAL_NAMES = {};
for (const [slot, id] of Object.entries(DEMO_HOUSEHOLD_IDS)) {
  const h = WOLLONGONG_DEMO_HOUSEHOLDS.find((hh) => hh.id === id);
  REAL_DEFAULTS[slot] = {
    income_gap: round2(h.income_gap),
    area_disadvantage: round2(h.area_disadvantage),
    payment_difficulty: round2(h.payment_difficulty),
    energy_burden: round2(h.energy_burden),
    no_solar_access: round2(h.no_solar_access),
  };
  REAL_FLAG_DEFAULTS[slot] = { life_support: h.life_support_flag, high_need: h.is_high_need_area };
  REAL_NAMES[slot] = h.suburb;
}

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

  :root {
    --bg: #FFFFFF;
    --panel: #F4F4F6;
    --panel-2: #FFFFFF;
    --ink: #131316;
    --ink-2: #5B5F66;
    --ink-3: #9AA0A8;
    --line: #E5E6EA;
    --line-soft: #EDEEF1;
    --blue: #175CFF;
    --blue-soft: #E9EFFF;
    --id-a: #7C6FEF;
    --id-a-soft: #EEECFE;
    --id-b: #F0409E;
    --id-b-soft: #FCE8F4;
    --id-c: #F5A623;
    --id-c-soft: #FEF3DD;
    --id-d: #14B8A6;
    --id-d-soft: #E4F7F4;
    --id-e: #9F1239;
    --id-e-soft: #FBE7EC;
    --status-locked: #16A34A;
    --status-locked-soft: #E7F7EC;
    --status-settled: #64748B;
    --status-settled-soft: #EEF1F4;
    --reserve: #E23D3D;
    --black-liquid: #131316;
    --track: #ECEDF0;
    --shadow: 0 1px 2px rgba(19,19,22,0.04), 0 14px 32px -18px rgba(19,19,22,0.16);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  }

  * { box-sizing: border-box; }

  .pf-page {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .pf-page {
    max-width: 68rem;
    margin: 0 auto;
    padding: 3.5rem 1.5rem 5rem;
  }

  .pf-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--blue);
    font-weight: 600;
  }

  h1 {
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    font-size: clamp(2.2rem, 5vw, 3.2rem);
    line-height: 1.05;
    margin: 0.5rem 0 0.9rem;
    text-wrap: balance;
    color: var(--ink);
  }

  .lede {
    font-size: 1.05rem;
    line-height: 1.6;
    color: var(--ink-2);
    max-width: 42rem;
    margin: 0;
  }
  .lede strong { color: var(--ink); font-weight: 600; }

  header {
    margin-bottom: 2.25rem;
    opacity: 0;
    animation: fadeUp 0.6s var(--ease-out) 0.05s forwards;
  }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .stagger-in { animation: fadeUp 0.55s var(--ease-out) both; }

  /* ---------- wizard nav ---------- */
  .wizard-nav {
    display: flex;
    align-items: center;
    margin-bottom: 2rem;
    opacity: 0;
    animation: fadeUp 0.6s var(--ease-out) 0.15s forwards;
  }
  .wnav-step {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    cursor: pointer;
    padding: 0.4rem 0.6rem 0.4rem 0.4rem;
    border-radius: 12px;
    transition: background 0.2s ease;
  }
  .wnav-step:hover { background: var(--panel); }
  .wnav-num {
    width: 2.1rem; height: 2.1rem;
    border-radius: 50%;
    border: 2px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--ink-3);
    background: var(--bg);
    transition: border-color 0.4s ease, color 0.4s ease, background 0.4s ease, transform 0.3s var(--ease-out);
    flex-shrink: 0;
  }
  .wnav-step.active .wnav-num {
    border-color: var(--blue);
    color: var(--blue);
    background: var(--blue-soft);
    transform: scale(1.08);
  }
  .wnav-step.done .wnav-num {
    border-color: var(--status-locked);
    color: #FFFFFF;
    background: var(--status-locked);
  }
  .wnav-text { display: flex; flex-direction: column; line-height: 1.3; }
  .wnav-text strong { font-size: 0.9rem; color: var(--ink-3); transition: color 0.3s ease; }
  .wnav-step.active .wnav-text strong, .wnav-step.done .wnav-text strong { color: var(--ink); }
  .wnav-text span { font-size: 0.74rem; color: var(--ink-3); font-family: 'JetBrains Mono', monospace; }
  .wnav-connector {
    flex: 1 1 auto;
    height: 2px;
    background: var(--line);
    margin: 0 0.75rem;
    position: relative;
    overflow: hidden;
    border-radius: 2px;
  }
  .wnav-connector::after {
    content: '';
    position: absolute; inset: 0;
    background: var(--blue);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.6s var(--ease-out);
  }
  .wnav-connector.filled::after { transform: scaleX(1); }

  /* ---------- wizard panels ---------- */
  .wizard-viewport { position: relative; }
  .wizard-panel { display: none; }
  .wizard-panel.active { display: block; }

  @keyframes slideOutLeft { to { opacity: 0; transform: translateX(-32px); } }
  @keyframes slideOutRight { to { opacity: 0; transform: translateX(32px); } }
  @keyframes slideInFromRight { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
  .wizard-panel.leaving.dir-fwd { animation: slideOutLeft 0.35s ease forwards; }
  .wizard-panel.leaving.dir-back { animation: slideOutRight 0.35s ease forwards; }
  .wizard-panel.entering.dir-fwd { animation: slideInFromRight 0.55s var(--ease-out) forwards; }
  .wizard-panel.entering.dir-back { animation: slideInFromLeft 0.55s var(--ease-out) forwards; }

  .panel-intro { margin-bottom: 1.5rem; }
  .panel-intro h2 {
    font-family: 'Poppins', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0 0 0.4rem;
    color: var(--ink);
  }
  .panel-intro p { margin: 0; color: var(--ink-2); font-size: 0.94rem; line-height: 1.55; max-width: 40rem; }

  .panel-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.75rem;
  }
  .back-row { margin-bottom: 1.5rem; }

  /* ---------- controls / cards ---------- */
  .section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin: 0 0 0.9rem;
  }

  .score-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15.5rem, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .score-card {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 1.1rem 1.2rem 1rem;
    box-shadow: var(--shadow);
    transition: box-shadow 0.25s ease, transform 0.25s ease;
  }
  .score-card:hover { transform: translateY(-3px); box-shadow: 0 2px 4px rgba(19,19,22,0.06), 0 24px 44px -18px rgba(19,19,22,0.24); }

  /* ---------- request stepper ---------- */
  .request-steps { display: flex; align-items: center; margin-bottom: 0.9rem; }
  .request-steps .step { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; flex: 0 0 auto; }
  .request-steps .dot {
    width: 0.55rem; height: 0.55rem; border-radius: 50%;
    background: var(--track); border: 1.5px solid var(--line);
    transition: background 0.35s ease, border-color 0.35s ease, transform 0.3s ease;
  }
  .request-steps .step.done .dot { background: var(--blue); border-color: var(--blue); }
  .request-steps .step.done.final .dot { background: var(--status-locked); border-color: var(--status-locked); }
  .request-steps .step.active .dot { transform: scale(1.35); box-shadow: 0 0 0 3px var(--blue-soft); }
  .request-steps .label {
    font-family: 'JetBrains Mono', monospace; font-size: 0.5rem; letter-spacing: 0.02em;
    text-transform: uppercase; color: var(--ink-3); white-space: nowrap;
  }
  .request-steps .step.done .label { color: var(--ink-2); }
  .request-steps .line {
    flex: 1 1 auto; height: 1.5px; background: var(--line); margin: 0 0.3rem;
    align-self: flex-start; margin-top: 0.27rem; transition: background 0.35s ease;
  }
  .request-steps .line.done { background: var(--blue); }

  .score-card-head {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 0.85rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--line-soft);
  }
  .score-card-name { font-weight: 600; font-size: 0.92rem; color: var(--ink); display: flex; align-items: center; gap: 0.5rem; }
  .score-card-name .chip { width: 0.6rem; height: 0.6rem; border-radius: 3px; display: inline-block; }
  .score-value-big { font-family: 'JetBrains Mono', monospace; font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums; transition: transform 0.25s var(--ease-out); }
  .score-value-big.pop { transform: scale(1.18); }

  .crit-row {
    display: grid;
    grid-template-columns: 6.7rem 2.6rem 1fr 2.3rem;
    align-items: center;
    gap: 0.55rem;
    margin-bottom: 0.6rem;
  }
  .crit-label { font-size: 0.74rem; color: var(--ink-2); }
  .crit-weight { font-family: 'JetBrains Mono', monospace; font-size: 0.66rem; color: var(--ink-3); }
  .crit-value { font-family: 'JetBrains Mono', monospace; font-size: 0.74rem; color: var(--ink); text-align: right; font-variant-numeric: tabular-nums; }
  .formula-strip {
    margin-top: 0.75rem; padding-top: 0.7rem; border-top: 1px dashed var(--line);
    font-family: 'JetBrains Mono', monospace; font-size: 0.64rem; color: var(--ink-3);
    line-height: 1.55; word-break: break-word;
  }

  .raw-note { font-size: 0.66rem; color: var(--ink-3); font-style: italic; margin: 0.6rem 0 0; }

  /* ---------- hard-override flags ---------- */
  .flags-block { margin-bottom: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .flag-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: var(--panel); border: 1px solid var(--line); }
  .flag-label { font-size: 0.76rem; color: var(--ink-2); font-weight: 500; }
  .flag-label .flag-hint { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--ink-3); margin-top: 0.1rem; }
  .flag-switch { position: relative; width: 2.3rem; height: 1.3rem; border-radius: 999px; background: var(--track); border: 1px solid var(--line); cursor: pointer; flex-shrink: 0; transition: background 0.25s ease, border-color 0.25s ease; }
  .flag-switch .knob { position: absolute; top: 1px; left: 1px; width: 1rem; height: 1rem; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.25); transition: transform 0.25s var(--ease-out); }
  .flag-switch.on { background: var(--reserve); border-color: var(--reserve); }
  .flag-switch.on .knob { transform: translateX(1rem); }
  .override-banner { display: none; font-size: 0.72rem; font-weight: 600; color: #fff; background: var(--reserve); padding: 0.5rem 0.75rem; border-radius: 8px; text-align: center; margin-top: 0.4rem; }
  .override-banner.show { display: block; }
  .crit-row.dimmed { opacity: 0.35; pointer-events: none; transition: opacity 0.25s ease; }
  .formula-strip.dimmed { opacity: 0.5; }
  table.csv-table.dimmed { opacity: 0.35; pointer-events: none; transition: opacity 0.25s ease; }

  /* ---------- full CSV-style calculation table (Step 1) ---------- */
  .csv-details {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 16px;
    margin-top: 1.5rem;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .csv-details summary {
    cursor: pointer; padding: 0.9rem 1.15rem; font-weight: 600; font-size: 0.86rem; color: var(--ink);
    list-style: none; display: flex; align-items: center; justify-content: space-between; user-select: none;
  }
  .csv-details summary::-webkit-details-marker { display: none; }
  .csv-details summary .chev { color: var(--ink-3); font-size: 0.75rem; transition: transform 0.2s ease; }
  .csv-details[open] summary .chev { transform: rotate(180deg); }
  .csv-details summary:hover { background: var(--panel); }

  /* per-household tabs */
  .hh-tabs {
    display: flex;
    gap: 0.3rem;
    padding: 0 1.1rem;
    border-top: 1px solid var(--line);
    background: var(--panel);
  }
  .hh-tab {
    font-family: 'Inter', sans-serif;
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--ink-3);
    background: none;
    border: none;
    border-bottom: 2.5px solid transparent;
    padding: 0.8rem 0.9rem 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;
  }
  .hh-tab .chip { width: 0.55rem; height: 0.55rem; border-radius: 2px; display: inline-block; opacity: 0.4; transition: opacity 0.2s ease; }
  .hh-tab:hover { color: var(--ink); }
  .hh-tab.active { color: var(--ink); }
  .hh-tab.active .chip { opacity: 1; }

  .hh-panel { display: none; padding: 1.25rem 1.1rem 1.4rem; }
  .hh-panel.active { display: block; animation: fadeIn 0.3s ease; }

  .hh-score-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--line-soft);
  }
  .hh-score-header .hh-score-label { font-size: 0.8rem; color: var(--ink-2); }
  .hh-score-header .hh-score-value { font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; }

  table.csv-table { width: 100%; border-collapse: collapse; background: var(--panel-2); font-size: 0.82rem; }
  table.csv-table th, table.csv-table td { padding: 0.65rem 0.6rem; text-align: left; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
  table.csv-table th {
    font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3);
  }
  table.csv-table td.csv-crit { font-weight: 600; color: var(--ink); }
  table.csv-table td.csv-raw { font-family: 'JetBrains Mono', monospace; color: var(--ink); }
  table.csv-table td.csv-raw .csv-src { display: block; font-family: 'Inter', sans-serif; font-weight: 400; font-size: 0.7rem; color: var(--ink-3); margin-top: 0.15rem; white-space: normal; }
  table.csv-table td.csv-num { text-align: right; font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; color: var(--ink); white-space: nowrap; }
  table.csv-table tr:last-child td { border-bottom: none; }

  .norm-bar-cell { display: flex; align-items: center; gap: 0.55rem; justify-content: flex-end; }
  .norm-bar-track { width: 4.5rem; height: 0.4rem; border-radius: 3px; background: var(--track); overflow: hidden; flex-shrink: 0; }
  .norm-bar-fill { height: 100%; border-radius: 3px; transition: width 0.25s var(--ease-out); }
  .norm-bar-val { width: 2.4rem; text-align: right; }

  /* ---------- global calc summary (collapsible) ---------- */
  .calc-details {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 16px;
    margin-top: 1.5rem;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .calc-details summary {
    cursor: pointer; padding: 0.85rem 1.1rem; font-weight: 600; font-size: 0.82rem; color: var(--ink);
    list-style: none; display: flex; align-items: center; justify-content: space-between; user-select: none;
  }
  .calc-details summary::-webkit-details-marker { display: none; }
  .calc-details summary .chev { color: var(--ink-3); font-size: 0.75rem; transition: transform 0.2s ease; }
  .calc-details[open] summary .chev { transform: rotate(180deg); }
  .calc-details summary:hover { background: var(--panel); }
  .calc-table-wrap { overflow-x: auto; border-top: 1px solid var(--line); }
  table.calc-table { width: 100%; border-collapse: collapse; background: var(--panel-2); font-size: 0.8rem; }
  table.calc-table th, table.calc-table td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
  table.calc-table th { font-family: 'JetBrains Mono', monospace; font-size: 0.64rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-3); background: var(--panel); }
  table.calc-table td { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; color: var(--ink); }
  table.calc-table td.hh-name { font-family: 'Inter', sans-serif; font-weight: 600; }
  table.calc-table tr:last-child td { border-bottom: none; }
  table.calc-table td.score-cell { font-weight: 700; }
  table.calc-table .status-pill { font-size: 0.65rem; text-transform: uppercase; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 999px; letter-spacing: 0.04em; }

  .global-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 20rem));
    gap: 1.4rem 2rem;
    margin-bottom: 0.5rem;
  }
  .control { display: flex; flex-direction: column; gap: 0.45rem; }
  .control-label { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.8rem; color: var(--ink-2); font-weight: 500; }
  .control-label .chip { width: 0.55rem; height: 0.55rem; border-radius: 2px; display: inline-block; margin-right: 0.45rem; vertical-align: middle; }
  .control-label .val { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; color: var(--ink); font-size: 0.8rem; }

  input[type="range"] { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 3px; background: var(--track); outline: none; }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%;
    background: var(--blue); border: 2px solid var(--bg); cursor: pointer; box-shadow: 0 0 0 1px var(--blue);
    transition: transform 0.15s ease;
  }
  input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.25); }
  input[type="range"]::-moz-range-thumb { width: 15px; height: 15px; border-radius: 50%; background: var(--blue); border: 2px solid var(--bg); cursor: pointer; box-shadow: 0 0 0 1px var(--blue); }
  .crit-row input[type="range"]::-webkit-slider-thumb { width: 12px; height: 12px; }
  .crit-row input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; }

  .controls-actions {
    display: flex; gap: 0.75rem; margin: 1.4rem 0 2rem;
    padding-top: 1.3rem; border-top: 1px solid var(--line);
    align-items: center; flex-wrap: wrap;
  }
  button.action {
    font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600;
    padding: 0.65rem 1.3rem; border-radius: 999px; border: 1px solid var(--line);
    background: var(--panel-2); color: var(--ink); cursor: pointer;
    transition: border-color 0.2s ease, transform 0.15s var(--ease-out), box-shadow 0.2s ease;
  }
  button.action:hover { border-color: var(--ink-3); transform: translateY(-1px); }
  button.action:active { transform: translateY(0); }
  button.action:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
  button.primary {
    background: var(--blue); border-color: var(--blue); color: #FFFFFF;
    box-shadow: 0 8px 20px -8px rgba(23,92,255,0.55);
  }
  button.primary:hover { background: #0F4CE0; box-shadow: 0 10px 26px -8px rgba(23,92,255,0.65); }
  .status-line { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--ink-2); margin-left: auto; text-align: right; }

  /* ---------- stage ---------- */
  .stage-frame {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 1.75rem 1.75rem 0.5rem;
    margin-bottom: 1.5rem;
  }
  .viz { position: relative; width: 100%; aspect-ratio: 320 / 190; }
  .viz svg { position: absolute; inset: 0; width: 100%; height: 100%; }

  .pipe { fill: none; stroke: var(--blue); stroke-width: 1.6; stroke-linecap: round; stroke-dasharray: 2.5 4; opacity: 0.7; transition: stroke 0.5s ease, opacity 0.5s ease; }
  .pipe.flowing { animation: flow 1.4s linear infinite; }
  .pipe.locked { stroke: var(--line); opacity: 0.5; animation: none; stroke-dasharray: none; }
  @keyframes flow { to { stroke-dashoffset: -13; } }

  .valve { fill: var(--blue); transition: fill 0.4s ease, r 0.3s ease; }
  .valve.locked { fill: var(--ink-3); }
  .valve.pulsing { animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { r: 2.6; } 50% { r: 3.3; } }

  .reservoir-shell { fill: #FFFFFF; stroke: var(--line); stroke-width: 1; }
  .reservoir-liquid { fill: url(#poolGradient); }
  .reserve-band { fill: url(#reservePattern); }
  .reservoir-label { font-family: 'JetBrains Mono', monospace; font-size: 5.8px; fill: var(--ink-3); letter-spacing: 0.06em; }
  .reservoir-value { font-family: 'JetBrains Mono', monospace; font-size: 7.5px; fill: var(--ink); font-weight: 600; }
  .reserve-label { font-family: 'JetBrains Mono', monospace; font-size: 5px; fill: var(--reserve); letter-spacing: 0.05em; font-weight: 600; }
  .reserve-value { font-family: 'JetBrains Mono', monospace; font-size: 6.2px; fill: var(--reserve); font-weight: 600; }

  .tanks-row {
    position: absolute; left: 0; right: 0; bottom: 0.4rem;
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.7rem; padding: 0 1rem;
  }
  .tank { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
  .tank-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 0.6rem; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600;
    padding: 0.22rem 0.6rem; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-3); background: var(--panel-2);
    transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
  }
  .tank-badge.filling { color: var(--blue); border-color: var(--blue); background: var(--blue-soft); }
  .tank-badge.locked { color: var(--status-locked); border-color: var(--status-locked); background: var(--status-locked-soft); }
  .tank-badge.settled { color: var(--status-settled); border-color: var(--status-settled); background: var(--status-settled-soft); }

  .tank-body { position: relative; width: min(100%, 4.8rem); height: 8rem; border-radius: 8px 8px 4px 4px; background: var(--track); border: 1px solid var(--line); overflow: hidden; }
  .tank-cap-line { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--ink-3); opacity: 0.6; }
  .tank-cap-line::after { content: 'ceiling'; position: absolute; right: 3px; top: -11px; font-family: 'JetBrains Mono', monospace; font-size: 0.45rem; color: var(--ink-3); letter-spacing: 0.04em; }
  .tank-fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0%; border-top: 1px solid rgba(255,255,255,0.35); }
  .tank-fill-A { background: var(--id-a); }
  .tank-fill-B { background: var(--id-b); }
  .tank-fill-C { background: var(--id-c); }
  .tank-fill-D { background: var(--id-d); }
  .tank-fill-E { background: var(--id-e); }
  .tank-fill.at-cap { box-shadow: inset 0 0 0 999px rgba(22,163,74,0.12); }

  .tank-readout { text-align: center; line-height: 1.35; }
  .tank-name { display: block; font-weight: 600; font-size: 0.76rem; color: var(--ink); white-space: nowrap; }
  .tank-score { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.66rem; color: var(--ink-3); }
  .tank-kwh { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.86rem; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 0.15rem; }
  .tank-kwh-A { color: var(--id-a); }
  .tank-kwh-B { color: var(--id-b); }
  .tank-kwh-C { color: var(--id-c); }
  .tank-kwh-D { color: var(--id-d); }
  .tank-kwh-E { color: var(--id-e); }

  .stage-caption { font-family: 'Inter', sans-serif; font-size: 0.9rem; color: var(--ink-2); text-align: center; min-height: 1.4em; padding: 1.1rem 0 1.25rem; }
  .stage-caption .hi { color: var(--blue); font-weight: 600; }

  .lockpanel { background: var(--panel-2); border: 1px solid var(--line); border-radius: 20px; padding: 1.4rem 1.6rem; box-shadow: var(--shadow); }
  .lockpanel-title { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 0.9rem; }
  .lockrow {
    display: grid; grid-template-columns: 1.8rem 1fr auto; align-items: center; gap: 0.85rem;
    padding: 0.65rem 0.2rem; border-bottom: 1px solid var(--line-soft);
    opacity: 0; transform: translateY(6px); animation: rowIn 0.4s ease forwards;
  }
  .lockrow:last-child { border-bottom: none; }
  @keyframes rowIn { to { opacity: 1; transform: translateY(0); } }
  .lockrow .rank { font-family: 'Poppins', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--ink-3); text-align: center; }
  .lockrow .desc { font-size: 0.9rem; color: var(--ink); }
  .lockrow .desc .name { font-weight: 600; }
  .lockrow .desc .why { color: var(--ink-3); font-size: 0.8rem; }
  .lockrow .amt { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-variant-numeric: tabular-nums; }
  .lockrow .status-tag { font-size: 0.66rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.1rem 0.45rem; border-radius: 999px; margin-left: 0.5rem; }
  .lockrow .status-tag.locked { color: var(--status-locked); background: var(--status-locked-soft); }
  .lockrow .status-tag.settled { color: var(--status-settled); background: var(--status-settled-soft); }
  .lockplaceholder { font-size: 0.85rem; color: var(--ink-3); padding: 0.6rem 0.2rem; font-style: italic; }

  footer { margin-top: 2.5rem; padding-top: 1.4rem; border-top: 1px solid var(--line); font-size: 0.82rem; color: var(--ink-3); line-height: 1.6; }
  footer code { font-family: 'JetBrains Mono', monospace; background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 0.1em 0.4em; color: var(--ink-2); }

  .reduced-note { display: none; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--ink-3); text-align: center; padding-bottom: 0.75rem; }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    .reduced-note { display: block; }
    .pipe.flowing { animation: none; }
    .valve.pulsing { animation: none; }
  }
`;

const BODY_HTML = `<div class="pf-page">
  <a href="/overview" style="display:inline-flex;align-items:center;gap:4px;font-size:0.85rem;font-weight:700;text-decoration:none;color:inherit;margin-bottom:1rem">&larr; Back to Sarge</a>

  

  <header>
    <div class="pf-eyebrow">Power Commons Exchange · Live Demo</div>
    <h1>Priority Algorithm</h1>
    <p class="lede">
      A two-step algorithm: first <strong>score</strong> every request from raw hardship data, then
      <strong>allocate</strong> the shared pool proportionally until each tank hits its ceiling. Walk
      through it stage by stage below.
    </p>
  </header>

  <div class="wizard-nav">
    <div class="wnav-step active" id="wnav-1" data-step="1">
      <div class="wnav-num">1</div>
      <div class="wnav-text"><strong>Score the request</strong><span>hardship formula</span></div>
    </div>
    <div class="wnav-connector" id="wnav-connector"></div>
    <div class="wnav-step" id="wnav-2" data-step="2">
      <div class="wnav-num">2</div>
      <div class="wnav-text"><strong>Allocate the pool</strong><span>water-filling fountain</span></div>
    </div>
  </div>

  <div class="wizard-viewport">

    <section class="wizard-panel active" id="panel-1">
      <div class="panel-intro">
        <h2>Step 1 — how the priority score is calculated</h2>
        <p>Five weighted hardship factors combine into one score per household. Adjust the sliders, or
          pick a household below to see its full calculation — every raw value, its source, and how it
          contributes to the final score.</p>
      </div>
      <div class="score-cards" id="score-cards-root"></div>

      <details class="csv-details" open>
        <summary>Full calculation, per household <span class="chev">▾</span></summary>
        <div class="hh-tabs" id="hh-tabs"></div>
        <div id="hh-panels"></div>
        <div class="raw-note" style="padding:0 1.1rem 1rem;">Raw values are illustrative reconstructions for demo readability, not measured data. "Source" names the type of real-world data a production system would draw from — scoring_and_tiered_allocation.py takes all five factors pre-normalized as upstream input and does not define this raw-to-normalized mapping itself.</div>
      </details>

      <div class="panel-actions">
        <button class="action primary" id="btn-next">Next: allocate the pool →</button>
      </div>
    </section>

    <section class="wizard-panel" id="panel-2">
      <div class="back-row">
        <button class="action" id="btn-back">← Back to scoring</button>
      </div>
      <div class="panel-intro">
        <h2>Step 2 — the shared pool drains into a queue, live</h2>
        <p>An emergency reserve is held back first. The rest pours into every household simultaneously,
          proportional to its score, until a tank hits its ceiling and locks — the queue on the right
          emerges from that, it isn't decided in advance.</p>
      </div>

      <div class="global-controls">
        <div class="control">
          <div class="control-label"><span><span class="chip" style="background:var(--black-liquid)"></span>Total pool (kWh)</span><span class="val" id="val-pool">30.0</span></div>
          <input type="range" id="pool" min="2" max="30" step="0.5" value="30">
        </div>
        <div class="control">
          <div class="control-label"><span><span class="chip" style="background:var(--reserve)"></span>Emergency reserve (kWh)</span><span class="val" id="val-reserve">2.0</span></div>
          <input type="range" id="reserve" min="0" max="15" step="0.5" value="2">
        </div>
        <div class="control">
          <div class="control-label"><span><span class="chip" style="background:var(--ink-3)"></span>Ceiling per household (kWh)</span><span class="val" id="val-ceiling">5.0</span></div>
          <input type="range" id="ceiling" min="1" max="12" step="0.5" value="5">
        </div>
      </div>

      <div class="controls-actions">
        <button class="action primary" id="btn-run">Run simulation</button>
        <button class="action" id="btn-shuffle">Shuffle hardship inputs</button>
        <div class="status-line" id="status-line">ready</div>
      </div>

      <div class="stage-frame">
        <div class="reduced-note">Reduced motion detected — showing the final allocation directly.</div>
        <div class="viz">
          <svg viewBox="0 0 320 190" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="poolGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3D434D"></stop>
                <stop offset="100%" stop-color="#171A1F"></stop>
              </linearGradient>
              <pattern id="reservePattern" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="#FCEDED"></rect>
                <line x1="0" y1="0" x2="0" y2="6" stroke="#EFB4B4" stroke-width="1.4"></line>
              </pattern>
            </defs>

            <path id="pipe-A" class="pipe" d="M160,46 C110,60 60,54 32,72"></path>
            <path id="pipe-B" class="pipe" d="M160,46 C140,58 110,54 96,72"></path>
            <path id="pipe-C" class="pipe" d="M160,46 C160,55 160,60 160,72"></path>
            <path id="pipe-D" class="pipe" d="M160,46 C180,58 210,54 224,72"></path>
            <path id="pipe-E" class="pipe" d="M160,46 C210,60 260,54 288,72"></path>

            <circle id="valve-A" class="valve" cx="32" cy="72" r="2.6"></circle>
            <circle id="valve-B" class="valve" cx="96" cy="72" r="2.6"></circle>
            <circle id="valve-C" class="valve" cx="160" cy="72" r="2.6"></circle>
            <circle id="valve-D" class="valve" cx="224" cy="72" r="2.6"></circle>
            <circle id="valve-E" class="valve" cx="288" cy="72" r="2.6"></circle>

            <g>
              <rect class="reservoir-shell" x="100" y="6" width="120" height="38" rx="10"></rect>
              <clipPath id="reservoirClip"><rect x="100" y="6" width="120" height="38" rx="10"></rect></clipPath>
              <rect id="reserve-band" class="reserve-band" clip-path="url(#reservoirClip)" x="100" width="120" y="38" height="6"></rect>
              <rect id="reservoir-liquid" class="reservoir-liquid" clip-path="url(#reservoirClip)" x="100" width="120" y="6" height="32"></rect>
              <text class="reservoir-label" x="160" y="17" text-anchor="middle">SHARED POOL</text>
              <text id="reservoir-value" class="reservoir-value" x="160" y="32" text-anchor="middle">12.00 kWh</text>
            </g>
            <text id="reserve-label" class="reserve-label" x="225" y="20">RESERVE</text>
            <text id="reserve-value" class="reserve-value" x="225" y="31">2.00 kWh</text>
          </svg>

          <div class="tanks-row">
            <div class="tank">
              <div class="tank-badge filling" id="badge-A">filling</div>
              <div class="tank-body">
                <div class="tank-cap-line" id="capline-A"></div>
                <div class="tank-fill tank-fill-A" id="fill-A"></div>
              </div>
              <div class="tank-readout">
                <span class="tank-name">Coniston</span>
                <span class="tank-score" id="scorelabel-A">score 0.00</span>
                <span class="tank-kwh tank-kwh-A" id="kwh-A">0.00 kWh</span>
              </div>
            </div>
            <div class="tank">
              <div class="tank-badge filling" id="badge-B">filling</div>
              <div class="tank-body">
                <div class="tank-cap-line" id="capline-B"></div>
                <div class="tank-fill tank-fill-B" id="fill-B"></div>
              </div>
              <div class="tank-readout">
                <span class="tank-name">Bellambi</span>
                <span class="tank-score" id="scorelabel-B">score 0.00</span>
                <span class="tank-kwh tank-kwh-B" id="kwh-B">0.00 kWh</span>
              </div>
            </div>
            <div class="tank">
              <div class="tank-badge filling" id="badge-C">filling</div>
              <div class="tank-body">
                <div class="tank-cap-line" id="capline-C"></div>
                <div class="tank-fill tank-fill-C" id="fill-C"></div>
              </div>
              <div class="tank-readout">
                <span class="tank-name">Cordeaux Heights</span>
                <span class="tank-score" id="scorelabel-C">score 0.00</span>
                <span class="tank-kwh tank-kwh-C" id="kwh-C">0.00 kWh</span>
              </div>
            </div>
            <div class="tank">
              <div class="tank-badge filling" id="badge-D">filling</div>
              <div class="tank-body">
                <div class="tank-cap-line" id="capline-D"></div>
                <div class="tank-fill tank-fill-D" id="fill-D"></div>
              </div>
              <div class="tank-readout">
                <span class="tank-name">Warrawong</span>
                <span class="tank-score" id="scorelabel-D">score 0.00</span>
                <span class="tank-kwh tank-kwh-D" id="kwh-D">0.00 kWh</span>
              </div>
            </div>
            <div class="tank">
              <div class="tank-badge filling" id="badge-E">filling</div>
              <div class="tank-body">
                <div class="tank-cap-line" id="capline-E"></div>
                <div class="tank-fill tank-fill-E" id="fill-E"></div>
              </div>
              <div class="tank-readout">
                <span class="tank-name">Figtree</span>
                <span class="tank-score" id="scorelabel-E">score 0.00</span>
                <span class="tank-kwh tank-kwh-E" id="kwh-E">0.00 kWh</span>
              </div>
            </div>
          </div>
        </div>
        <div class="stage-caption" id="caption">Set your inputs, then press <span class="hi">Run simulation</span>.</div>
      </div>

      <div class="lockpanel">
        <div class="lockpanel-title">Queue as it forms — locked in the order each household hits its ceiling</div>
        <div id="lockorder">
          <div class="lockplaceholder">Nobody's locked in yet — run the simulation to build the queue live.</div>
        </div>
      </div>

      <details class="calc-details">
        <summary>Full calculation table — every score and allocation <span class="chev">▾</span></summary>
        <div class="calc-table-wrap" id="calc-table-wrap"></div>
      </details>
    </section>

  </div>

  <footer>
    Priority score = the same hardship formula as <code>compute_hardship_score()</code> in
    <code>scoring_and_tiered_allocation.py</code>: if <code>life_support_flag</code> or
    <code>is_high_need_area</code> is set, the score is hard-overridden to 1.00; otherwise it's the
    weighted sum of five factors (fixed weights summing to 1.00). The fountain is
    <code>simple_nash_allocation.py</code>'s water-filling loop, played out continuously: every uncapped
    household draws at once, proportional to score, until it hits the ceiling and seals off — the
    remaining pool re-splits automatically among whoever's left. Raw figures in the per-household
    calculation tables are illustrative reconstructions for demo readability, not measured data — the
    real system takes these five factors pre-normalized as upstream input.
  </footer>

</div>`;

const SCRIPT_SOURCE = `
(function () {
  const ids = ['A', 'B', 'C', 'D', 'E'];
  const CRITERIA = [
    { key: 'income_gap', label: 'Income gap', weight: 0.30 },
    { key: 'area_disadvantage', label: 'Area disadvantage', weight: 0.25 },
    { key: 'payment_difficulty', label: 'Payment difficulty', weight: 0.20 },
    { key: 'energy_burden', label: 'Energy burden', weight: 0.15 },
    { key: 'no_solar_access', label: 'No solar access', weight: 0.10 },
  ];
  // Real households from algorithms/fixtures/wollongongDemoHouseholds.js —
  // see this file's top-of-module comment for which real suburb fills each
  // slot and why. Every number below is computed by deriveHardshipFactors.js
  // from that household's own real weekly income, energy cost, arrears,
  // suburb and solar status — not hand-picked for this demo.
  const DEFAULTS = ${JSON.stringify(REAL_DEFAULTS)};
  // life_support_flag / is_high_need_area are the two hard-override fields from
  // compute_hardship_score() in scoring_and_tiered_allocation.py: if either is 1,
  // hardship_score is forced to 1.0 and the five weighted factors above are
  // ignored entirely. Bellambi and Warrawong are real is_high_need_area
  // overrides (Council-named priority suburbs); Figtree is on the real
  // life-support register here to make that override visible — note its
  // weighted-only score (from the sliders above) is only ~0.26, yet the flag
  // forces it to 1.00 regardless.
  const FLAG_DEFAULTS = ${JSON.stringify(REAL_FLAG_DEFAULTS)};
  const names = ${JSON.stringify(REAL_NAMES)};
  const IDENTITY = { A: '#7C6FEF', B: '#F0409E', C: '#F5A623', D: '#14B8A6', E: '#9F1239' };
  const STATUS_COLOR = { locked: '#16A34A', settled: '#64748B' };
  const overrideFlags = {};
  ids.forEach(id => { overrideFlags[id] = { ...FLAG_DEFAULTS[id] }; });
  function isOverridden(id) { return overrideFlags[id].life_support === 1 || overrideFlags[id].high_need === 1; }

  // The real source each factor is actually derived from in
  // algorithms/src/scoring/deriveHardshipFactors.js and
  // algorithms/policies/wollongongEquityDataV1-3.js — not illustrative.
  const SOURCES = {
    income_gap: "Wollongong Energy Equity Assessment — published income brackets ($500/wk, $650/wk)",
    area_disadvantage: 'ABS SEIFA IRSD 2021 by suburb (SAL), primary source; profile.id by profile area, fallback',
    payment_difficulty: 'Save4Good pilot (Port Kembla) — typical arrears range $1,800–$3,500, Wollongong Energy Equity Assessment p.10',
    energy_burden: "Endeavour Energy postcode consumption workbook, vs Council's own 10%-of-income Energy Equity Framework target",
    no_solar_access: 'Australian PV Institute (APVI) — real per-suburb solar installation/capacity data',
  };

  // Inverts each factor's real formula from deriveHardshipFactors.js back
  // to an approximate raw figure, so dragging a slider shows what real-world
  // number that position corresponds to under the actual deployed formula —
  // not a generic illustration. When a slider sits at a household's real
  // default, this reproduces that household's own real raw figure (e.g.
  // Bellambi's default income_gap of 1.00 shows "< $500/wk", matching its
  // real $480/wk weekly income). Dragging away from the default still uses
  // the same real formula, just run in reverse — the number shown is always
  // "what raw figure would produce this exact 0-1 value," never invented.
  function rawContext(key, value) {
    switch (key) {
      case 'income_gap': {
        // deriveIncomeGapFactor: <$500/wk -> 1.0, <$650/wk -> 0.6, tapers to
        // a 0.05 floor by $2,500/wk (Wollongong Energy Equity Assessment
        // brackets).
        if (value >= 0.999) return "< $500/wk (Council's highest income-poverty bracket)";
        if (value >= 0.6 - 1e-9 && value <= 0.6 + 1e-9) return "$500–650/wk (Council's second income-poverty bracket)";
        if (value > 0.05) {
          const progress = (0.6 - value) / (0.6 - 0.05);
          const income = Math.round((650 + progress * (2500 - 650)) / 10) * 10;
          return '≈ $' + income.toLocaleString() + "/wk (between Council's brackets and the taper floor)";
        }
        return "≥ $2,500/wk (above Council's published brackets)";
      }
      case 'area_disadvantage': {
        // Tier 1 (ABS SAL, primary): factor = (10 - decile) / 9.
        const decile = Math.max(1, Math.min(10, Math.round(10 - value * 9)));
        return 'ABS SEIFA IRSD 2021 decile ' + decile + '/10 by suburb (1 = most disadvantaged nationally)';
      }
      case 'payment_difficulty': {
        // derivePaymentDifficultyFactor: linear 0 -> $3,500 (top of the
        // Save4Good pilot's typical arrears range).
        const arrears = Math.round((value * 3500) / 50) * 50;
        return '≈ $' + arrears.toLocaleString() + ' in overdue arrears (typical range: $1,800–$3,500)';
      }
      case 'energy_burden': {
        // deriveEnergyBurdenFactor: burdenPct / 0.10 (Council's own 2030
        // Energy Equity Framework target), clipped at 1.0.
        const pct = (value * 10).toFixed(1);
        return '≈ ' + pct + "% of income on energy (Council's own target: 10%)";
      }
      case 'no_solar_access': {
        // deriveNoSolarAccessFactor: 0 if the household has solar, else a
        // 0.5 floor plus up to 0.5 more from the suburb's real APVI solar
        // density gap vs the 35% LGA average.
        if (value <= 1e-9) return 'Has rooftop solar (real per-household status)';
        const gap = Math.round(Math.max(0, (value - 0.5) * 2) * 100);
        return 'No rooftop solar — suburb solar density ' + gap + '% below the 35% LGA average (APVI)';
      }
      default: return '';
    }
  }

  const els = {};
  ids.forEach(id => {
    els[id] = {
      fill: document.getElementById('fill-' + id),
      kwh: document.getElementById('kwh-' + id),
      badge: document.getElementById('badge-' + id),
      capline: document.getElementById('capline-' + id),
      scorelabel: document.getElementById('scorelabel-' + id),
      pipe: document.getElementById('pipe-' + id),
      valve: document.getElementById('valve-' + id),
    };
  });

  const sliders = {
    pool: document.getElementById('pool'),
    reserve: document.getElementById('reserve'),
    ceiling: document.getElementById('ceiling'),
  };
  const valOut = {
    pool: document.getElementById('val-pool'),
    reserve: document.getElementById('val-reserve'),
    ceiling: document.getElementById('val-ceiling'),
  };
  const runBtn = document.getElementById('btn-run');
  const shuffleBtn = document.getElementById('btn-shuffle');
  const nextBtn = document.getElementById('btn-next');
  const backBtn = document.getElementById('btn-back');
  const calcTableWrap = document.getElementById('calc-table-wrap');
  const statusLine = document.getElementById('status-line');
  const caption = document.getElementById('caption');
  const lockorderEl = document.getElementById('lockorder');
  const reservoirLiquid = document.getElementById('reservoir-liquid');
  const reservoirValue = document.getElementById('reservoir-value');
  const reserveBand = document.getElementById('reserve-band');
  const reserveValueLabel = document.getElementById('reserve-value');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RES_TOP = 6, RES_H = 38;
  const DURATION_MS = 9000;
  let currentRunToken = 0;

  // ---------------- wizard navigation ----------------
  const panelEls = { 1: document.getElementById('panel-1'), 2: document.getElementById('panel-2') };
  const wnavEls = { 1: document.getElementById('wnav-1'), 2: document.getElementById('wnav-2') };
  const wnavConnector = document.getElementById('wnav-connector');
  let activePanel = 1;
  let isTransitioning = false;
  let hasAutoRun = false;

  function staggerChildren(container, selector, baseDelay, step) {
    const items = container.querySelectorAll(selector);
    items.forEach((el, i) => {
      el.classList.remove('stagger-in');
      void el.offsetWidth;
      el.style.animationDelay = (baseDelay + i * step) + 'ms';
      el.classList.add('stagger-in');
    });
  }

  function updateWizardNav() {
    wnavEls[1].classList.toggle('active', activePanel === 1);
    wnavEls[1].classList.toggle('done', activePanel === 2);
    wnavEls[2].classList.toggle('active', activePanel === 2);
    wnavConnector.classList.toggle('filled', activePanel === 2);
  }

  function switchPanel(next) {
    if (next === activePanel || isTransitioning) return;
    isTransitioning = true;
    const dirClass = next > activePanel ? 'dir-fwd' : 'dir-back';
    const outEl = panelEls[activePanel];
    const inEl = panelEls[next];
    outEl.classList.add('leaving', dirClass);
    const outDelay = reduceMotion ? 0 : 350;
    setTimeout(() => {
      outEl.classList.remove('active', 'leaving', 'dir-fwd', 'dir-back');
      inEl.classList.add('active', 'entering', dirClass);
      void inEl.offsetWidth;
      activePanel = next;
      updateWizardNav();
      if (next === 1) {
        staggerChildren(panelEls[1], '.score-card', 0, 90);
      } else {
        staggerChildren(panelEls[2], '.control, .stage-frame, .lockpanel, .calc-details', 0, 90);
        if (!hasAutoRun) { hasAutoRun = true; setTimeout(run, 600); }
      }
      const inDelay = reduceMotion ? 0 : 560;
      setTimeout(() => { inEl.classList.remove('entering', dirClass); isTransitioning = false; }, inDelay);
    }, outDelay);
  }

  nextBtn.addEventListener('click', () => switchPanel(2));
  backBtn.addEventListener('click', () => switchPanel(1));
  wnavEls[1].addEventListener('click', () => switchPanel(1));
  wnavEls[2].addEventListener('click', () => switchPanel(2));

  // ---------------- per-household request stepper ----------------
  const STEPS = ['requested', 'scored', 'queued', 'allocated'];
  const STEP_LABELS = { requested: 'Requested', scored: 'Scored', queued: 'Queued', allocated: 'Allocated' };

  function stepperHtml(id) {
    let html = '<div class="request-steps" id="steps-' + id + '">';
    STEPS.forEach((key, i) => {
      html += '<div class="step" id="step-' + id + '-' + key + '"><div class="dot"></div><div class="label">' + STEP_LABELS[key] + '</div></div>';
      if (i < STEPS.length - 1) html += '<div class="line" id="line-' + id + '-' + i + '"></div>';
    });
    html += '</div>';
    return html;
  }

  const stepState = {};
  function setStep(id, key, force) {
    const targetIndex = STEPS.indexOf(key);
    if (!force && stepState[id] !== undefined && targetIndex < stepState[id]) return;
    stepState[id] = targetIndex;
    STEPS.forEach((k, i) => {
      const stepEl = document.getElementById('step-' + id + '-' + k);
      if (!stepEl) return;
      const done = i <= targetIndex;
      stepEl.classList.toggle('done', done);
      stepEl.classList.toggle('final', done && k === 'allocated');
      stepEl.classList.toggle('active', i === targetIndex);
      if (i < STEPS.length - 1) {
        const lineEl = document.getElementById('line-' + id + '-' + i);
        if (lineEl) lineEl.classList.toggle('done', i < targetIndex);
      }
    });
  }

  // ---------------- score cards (with collapsible raw-data table) ----------------
  const critSliders = {};
  function flagsBlockHtml(id, prefix) {
    return (
      '<div class="flags-block">' +
        '<div class="flag-row">' +
          '<span class="flag-label">Life-support register<span class="flag-hint">life_support_flag</span></span>' +
          '<div class="flag-switch" id="' + prefix + '-' + id + '-life_support" data-id="' + id + '" data-key="life_support"><div class="knob"></div></div>' +
        '</div>' +
        '<div class="flag-row">' +
          '<span class="flag-label">Council high-need area<span class="flag-hint">is_high_need_area</span></span>' +
          '<div class="flag-switch" id="' + prefix + '-' + id + '-high_need" data-id="' + id + '" data-key="high_need"><div class="knob"></div></div>' +
        '</div>' +
        '<div class="override-banner" id="' + prefix + '-' + id + '-banner">OVERRIDE ACTIVE — score forced to 1.00, five weighted factors below are ignored</div>' +
      '</div>'
    );
  }

  function wireFlagSwitches(container) {
    container.querySelectorAll('.flag-switch').forEach(sw => {
      sw.addEventListener('click', () => {
        const id = sw.getAttribute('data-id');
        const key = sw.getAttribute('data-key');
        overrideFlags[id][key] = overrideFlags[id][key] ? 0 : 1;
        syncLabels();
      });
    });
  }

  function buildScoreCards() {
    const root = document.getElementById('score-cards-root');
    ids.forEach(id => {
      critSliders[id] = {};
      const card = document.createElement('div');
      card.className = 'score-card';
      card.innerHTML =
        stepperHtml(id) +
        '<div class="score-card-head">' +
          '<span class="score-card-name"><span class="chip" style="background:' + IDENTITY[id] + '"></span>' + names[id] + '</span>' +
          '<span class="score-value-big" id="scorebig-' + id + '" style="color:' + IDENTITY[id] + '">0.00</span>' +
        '</div>' +
        flagsBlockHtml(id, 'flagcard');
      wireFlagSwitches(card);
      CRITERIA.forEach(c => {
        const row = document.createElement('div');
        row.className = 'crit-row';
        const sliderId = 'crit-' + id + '-' + c.key;
        row.innerHTML =
          '<span class="crit-label">' + c.label + '</span>' +
          '<span class="crit-weight">&times;' + c.weight.toFixed(2) + '</span>' +
          '<input type="range" min="0" max="1" step="0.01" value="' + DEFAULTS[id][c.key] + '" id="' + sliderId + '">' +
          '<span class="crit-value" id="val-' + sliderId + '">' + DEFAULTS[id][c.key].toFixed(2) + '</span>';
        card.appendChild(row);
        const input = row.querySelector('input');
        critSliders[id][c.key] = input;
        input.addEventListener('input', syncLabels);
      });
      const strip = document.createElement('div');
      strip.className = 'formula-strip';
      strip.id = 'formula-' + id;
      card.appendChild(strip);

      root.appendChild(card);
    });
  }

  function buildDetailedTable() {
    const tabsRoot = document.getElementById('hh-tabs');
    const panelsRoot = document.getElementById('hh-panels');

    ids.forEach(id => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'hh-tab' + (id === 'A' ? ' active' : '');
      tab.id = 'hhtab-' + id;
      tab.innerHTML = '<span class="chip" style="background:' + IDENTITY[id] + '"></span>' + names[id];
      tab.addEventListener('click', () => switchHhTab(id));
      tabsRoot.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'hh-panel' + (id === 'A' ? ' active' : '');
      panel.id = 'hhpanel-' + id;

      let rows = '';
      CRITERIA.forEach(c => {
        rows +=
          '<tr>' +
          '<td class="csv-crit">' + c.label + '</td>' +
          '<td class="csv-num">' + c.weight.toFixed(2) + '</td>' +
          '<td class="csv-raw" id="csv-' + id + '-' + c.key + '-raw"></td>' +
          '<td class="csv-num">' +
            '<div class="norm-bar-cell">' +
              '<div class="norm-bar-track"><div class="norm-bar-fill" id="csv-' + id + '-' + c.key + '-bar" style="background:' + IDENTITY[id] + '"></div></div>' +
              '<span class="norm-bar-val" id="csv-' + id + '-' + c.key + '-norm"></span>' +
            '</div>' +
          '</td>' +
          '<td class="csv-num" id="csv-' + id + '-' + c.key + '-contrib"></td>' +
          '</tr>';
      });

      panel.innerHTML =
        '<div class="hh-score-header">' +
          '<span class="hh-score-label">' + names[id] + ' — priority score</span>' +
          '<span class="hh-score-value" id="csv-' + id + '-score" style="color:' + IDENTITY[id] + '"></span>' +
        '</div>' +
        flagsBlockHtml(id, 'flagtab') +
        '<table class="csv-table" id="csvtable-' + id + '">' +
          '<thead><tr><th>criterion</th><th>weight</th><th>raw value &amp; source</th><th>normalized</th><th>contribution</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>';
      panelsRoot.appendChild(panel);
      wireFlagSwitches(panel);
    });
  }

  function switchHhTab(id) {
    ids.forEach(hid => {
      document.getElementById('hhtab-' + hid).classList.toggle('active', hid === id);
      document.getElementById('hhpanel-' + hid).classList.toggle('active', hid === id);
    });
  }

  function buildCalcTable() {
    const table = document.createElement('table');
    table.className = 'calc-table';
    let thead = '<thead><tr><th>Household</th><th>Score</th><th>Allocated</th><th>Status</th></tr></thead>';
    let tbody = '<tbody>';
    ids.forEach(id => {
      tbody += '<tr>';
      tbody += '<td class="hh-name" style="color:' + IDENTITY[id] + '">' + names[id] + '</td>';
      tbody += '<td class="score-cell" id="tbl-' + id + '-score" style="color:' + IDENTITY[id] + '">0.00</td>';
      tbody += '<td id="tbl-' + id + '-kwh">—</td>';
      tbody += '<td id="tbl-' + id + '-status"><span class="status-pill" style="color:var(--ink-3);background:var(--track)">pending</span></td>';
      tbody += '</tr>';
    });
    tbody += '</tbody>';
    table.innerHTML = thead + tbody;
    calcTableWrap.appendChild(table);
  }

  function computeScore(id) {
    if (isOverridden(id)) return 1.0;
    return CRITERIA.reduce((sum, c) => sum + c.weight * parseFloat(critSliders[id][c.key].value), 0);
  }

  function weightedOnlyScore(id) {
    return CRITERIA.reduce((sum, c) => sum + c.weight * parseFloat(critSliders[id][c.key].value), 0);
  }

  function readInputs() {
    const pool = parseFloat(sliders.pool.value);
    const reserve = Math.min(parseFloat(sliders.reserve.value), pool);
    const scores = {};
    ids.forEach(id => { scores[id] = computeScore(id); });
    return {
      scores,
      pool,
      reserve,
      consumablePool: Math.max(0, pool - reserve),
      ceiling: parseFloat(sliders.ceiling.value),
    };
  }

  function syncLabels() {
    const v = readInputs();
    ids.forEach(id => {
      const overridden = isOverridden(id);
      const flags = overrideFlags[id];

      ['flagcard', 'flagtab'].forEach(prefix => {
        ['life_support', 'high_need'].forEach(key => {
          const sw = document.getElementById(prefix + '-' + id + '-' + key);
          if (sw) sw.classList.toggle('on', !!flags[key]);
        });
        const banner = document.getElementById(prefix + '-' + id + '-banner');
        if (banner) banner.classList.toggle('show', overridden);
      });

      const scoreBig = document.getElementById('scorebig-' + id);
      const prevScore = scoreBig.textContent;
      scoreBig.textContent = v.scores[id].toFixed(2);
      if (prevScore !== scoreBig.textContent) {
        scoreBig.classList.remove('pop'); void scoreBig.offsetWidth; scoreBig.classList.add('pop');
      }
      CRITERIA.forEach(c => {
        const sliderId = 'crit-' + id + '-' + c.key;
        const val = parseFloat(critSliders[id][c.key].value);
        document.getElementById('val-' + sliderId).textContent = val.toFixed(2);
        critSliders[id][c.key].closest('.crit-row').classList.toggle('dimmed', overridden);
        const rawCell = document.getElementById('csv-' + id + '-' + c.key + '-raw');
        if (rawCell) rawCell.innerHTML = rawContext(c.key, val) + '<span class="csv-src">' + SOURCES[c.key] + '</span>';
        const normCell = document.getElementById('csv-' + id + '-' + c.key + '-norm');
        if (normCell) normCell.textContent = val.toFixed(2);
        const barFill = document.getElementById('csv-' + id + '-' + c.key + '-bar');
        if (barFill) barFill.style.width = (val * 100) + '%';
        const contribCell = document.getElementById('csv-' + id + '-' + c.key + '-contrib');
        if (contribCell) contribCell.textContent = (c.weight * val).toFixed(3);
      });

      const formulaEl = document.getElementById('formula-' + id);
      formulaEl.classList.toggle('dimmed', overridden);
      if (overridden) {
        const cause = flags.life_support ? 'life_support_flag' : 'is_high_need_area';
        formulaEl.textContent = 'OVERRIDE: ' + cause + ' = 1 → hardship_score = 1.00 (weighted factors ignored)';
      } else {
        const parts = CRITERIA.map(c => c.weight.toFixed(2) + '×' + parseFloat(critSliders[id][c.key].value).toFixed(2));
        formulaEl.textContent = parts.join(' + ') + ' = ' + v.scores[id].toFixed(2);
      }
      const csvTable = document.getElementById('csvtable-' + id);
      if (csvTable) csvTable.classList.toggle('dimmed', overridden);

      els[id].scorelabel.textContent = 'score ' + v.scores[id].toFixed(2);
      const scoreCell = document.getElementById('tbl-' + id + '-score');
      if (scoreCell) scoreCell.textContent = v.scores[id].toFixed(2);
      const csvScoreCell = document.getElementById('csv-' + id + '-score');
      if (csvScoreCell) csvScoreCell.textContent = v.scores[id].toFixed(3);
    });
    valOut.pool.textContent = v.pool.toFixed(1);
    valOut.reserve.textContent = v.reserve.toFixed(1);
    valOut.ceiling.textContent = v.ceiling.toFixed(1);
  }

  function simulate(scores, ceiling, pool) {
    let active = ids.slice();
    const fills = {}; ids.forEach(id => fills[id] = 0);
    const breakpoints = {}; ids.forEach(id => breakpoints[id] = [{ c: 0, f: 0 }]);
    const lockOrder = [];
    let consumedTotal = 0;
    let remaining = pool;
    const EPS = 1e-9;
    let guard = 0;

    while (active.length > 0 && remaining > EPS && guard < 50) {
      guard++;
      const S = active.reduce((s, id) => s + scores[id], 0);
      let minNeeded = Infinity;
      active.forEach(id => {
        const room = Math.max(0, ceiling - fills[id]);
        const needed = room * S / scores[id];
        if (needed < minNeeded) minNeeded = needed;
      });
      const consumed = Math.min(minNeeded, remaining);
      active.forEach(id => { fills[id] += (scores[id] / S) * consumed; });
      consumedTotal += consumed;
      remaining -= consumed;
      active.forEach(id => { breakpoints[id].push({ c: consumedTotal, f: fills[id] }); });

      const justLocked = active.filter(id => ceiling - fills[id] <= 1e-6);
      if (justLocked.length > 0 && remaining > EPS) {
        justLocked.forEach(id => lockOrder.push({ id, consumedAt: consumedTotal, reason: 'ceiling' }));
        active = active.filter(id => justLocked.indexOf(id) === -1);
      } else if (remaining <= EPS) {
        active.forEach(id => {
          const reason = (ceiling - fills[id] <= 1e-6) ? 'ceiling' : 'settled';
          lockOrder.push({ id, consumedAt: consumedTotal, reason });
        });
        active = [];
      } else {
        break;
      }
    }
    ids.forEach(id => {
      if (!lockOrder.some(e => e.id === id)) {
        lockOrder.push({ id, consumedAt: consumedTotal, reason: 'settled' });
      }
    });
    return { breakpoints, lockOrder, consumedTotal, finalFills: fills, leftover: Math.max(0, remaining), pool, ceiling };
  }

  function fillAt(bp, c) {
    if (c <= bp[0].c) return bp[0].f;
    for (let i = 1; i < bp.length; i++) {
      if (c <= bp[i].c) {
        const prev = bp[i - 1], next = bp[i];
        const t = next.c === prev.c ? 1 : (c - prev.c) / (next.c - prev.c);
        return prev.f + (next.f - prev.f) * t;
      }
    }
    return bp[bp.length - 1].f;
  }

  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function resetVisuals(result) {
    lockorderEl.innerHTML = '<div class="lockplaceholder">Nobody’s locked in yet — run the simulation to build the queue live.</div>';
    ids.forEach(id => {
      setStep(id, 'scored', true);
      els[id].fill.style.height = '0%';
      els[id].fill.className = 'tank-fill tank-fill-' + id;
      els[id].kwh.textContent = '0.00 kWh';
      els[id].kwh.className = 'tank-kwh tank-kwh-' + id;
      els[id].badge.textContent = 'filling';
      els[id].badge.className = 'tank-badge filling';
      els[id].pipe.className = 'pipe flowing';
      els[id].valve.className = 'valve pulsing';
      const maxScale = result.ceiling * 1.15;
      els[id].capline.style.bottom = (result.ceiling / maxScale * 100) + '%';
      const statusCell = document.getElementById('tbl-' + id + '-status');
      if (statusCell) statusCell.innerHTML = '<span class="status-pill" style="color:var(--blue);background:var(--blue-soft)">filling</span>';
      const kwhCell = document.getElementById('tbl-' + id + '-kwh');
      if (kwhCell) kwhCell.textContent = '0.00';
    });
    const reserveBandH = result.totalPool > 0 ? RES_H * (result.reserve / result.totalPool) : 0;
    const bandTopY = RES_TOP + RES_H - reserveBandH;
    reserveBand.setAttribute('height', reserveBandH);
    reserveBand.setAttribute('y', bandTopY);
    reservoirLiquid.setAttribute('height', bandTopY - RES_TOP);
    reservoirLiquid.setAttribute('y', RES_TOP);
    reservoirValue.textContent = result.pool.toFixed(2) + ' kWh';
    reserveValueLabel.textContent = result.reserve.toFixed(2) + ' kWh';
    caption.innerHTML = 'Pool draining — every uncapped household fills <span class="hi">at once</span>, proportional to score.';
  }

  function renderFrame(result, c) {
    const maxScale = result.ceiling * 1.15;
    ids.forEach(id => {
      const f = fillAt(result.breakpoints[id], c);
      els[id].fill.style.height = Math.min(100, (f / maxScale) * 100) + '%';
      els[id].kwh.textContent = f.toFixed(2) + ' kWh';
      const kwhCell = document.getElementById('tbl-' + id + '-kwh');
      if (kwhCell) kwhCell.textContent = f.toFixed(2);
    });
    const remainingConsumable = Math.max(0, result.pool - c);
    const reserveBandH = result.totalPool > 0 ? RES_H * (result.reserve / result.totalPool) : 0;
    const bandTopY = RES_TOP + RES_H - reserveBandH;
    const liquidPct = result.totalPool > 0 ? remainingConsumable / result.totalPool : 0;
    const liquidH = RES_H * liquidPct;
    reservoirLiquid.setAttribute('height', liquidH);
    reservoirLiquid.setAttribute('y', bandTopY - liquidH);
    reservoirValue.textContent = remainingConsumable.toFixed(2) + ' kWh';
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function fireEvent(result, ev, rank) {
    const e = els[ev.id];
    const isCeiling = ev.reason === 'ceiling';
    e.badge.textContent = isCeiling ? ('locked · ' + ordinal(rank)) : 'settled';
    e.badge.className = 'tank-badge ' + (isCeiling ? 'locked' : 'settled');
    if (isCeiling) { e.fill.classList.add('at-cap'); }
    e.pipe.className = 'pipe locked';
    e.valve.className = 'valve locked';
    setStep(ev.id, 'allocated');

    const statusCell = document.getElementById('tbl-' + ev.id + '-status');
    if (statusCell) {
      const c = isCeiling ? STATUS_COLOR.locked : STATUS_COLOR.settled;
      const bg = isCeiling ? 'var(--status-locked-soft)' : 'var(--status-settled-soft)';
      statusCell.innerHTML = '<span class="status-pill" style="color:' + c + ';background:' + bg + '">' + (isCeiling ? 'locked · ' + ordinal(rank) : 'settled') + '</span>';
    }

    const row = document.createElement('div');
    row.className = 'lockrow' + (isCeiling ? '' : ' settled');
    const amount = result.finalFills[ev.id];
    const tagClass = isCeiling ? 'locked' : 'settled';
    const tagText = isCeiling ? 'ceiling' : 'pool empty';
    row.innerHTML =
      '<div class="rank" style="color:' + IDENTITY[ev.id] + '">' + rank + '</div>' +
      '<div class="desc"><span class="name">' + names[ev.id] + '</span>' +
      '<span class="status-tag ' + tagClass + '">' + tagText + '</span><br>' +
      '<span class="why">' + (isCeiling ? 'hit the ' + result.ceiling.toFixed(1) + ' kWh ceiling' : 'pool ran out first — never reached the ceiling') + '</span></div>' +
      '<div class="amt" style="color:' + IDENTITY[ev.id] + '">' + amount.toFixed(2) + ' kWh</div>';
    lockorderEl.appendChild(row);

    const placeholder = lockorderEl.querySelector('.lockplaceholder');
    if (placeholder) placeholder.remove();

    caption.innerHTML = isCeiling
      ? '<span class="hi">' + names[ev.id] + '</span> locked at the ceiling — remaining pool re-splits among whoever’s left.'
      : 'Pool exhausted — <span class="hi">' + names[ev.id] + '</span> settles below the ceiling.';
  }

  function runSimulationInstant(result) {
    renderFrame(result, result.consumedTotal);
    result.lockOrder.forEach((ev, i) => fireEvent(result, ev, i + 1));
    caption.innerHTML = result.leftover > 0.01
      ? 'Everyone hit their ceiling with <span class="hi">' + result.leftover.toFixed(2) + ' kWh</span> left unused in the pool.'
      : 'Pool fully allocated. Queue order above emerged purely from priority score.';
    statusLine.textContent = 'done · ' + result.consumedTotal.toFixed(2) + ' / ' + result.pool.toFixed(2) + ' kWh drawn';
  }

  function animate(result) {
    const token = ++currentRunToken;
    resetVisuals(result);
    ids.forEach(id => setStep(id, 'queued'));
    if (result.consumedTotal <= 1e-9 || reduceMotion) { runSimulationInstant(result); return; }

    let firedCount = 0;
    const start = performance.now();
    statusLine.textContent = 'running…';

    function frame(now) {
      if (token !== currentRunToken) return;
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = easeInOutQuad(t);
      const c = eased * result.consumedTotal;
      renderFrame(result, c);

      while (firedCount < result.lockOrder.length && result.lockOrder[firedCount].consumedAt <= c + 1e-6) {
        fireEvent(result, result.lockOrder[firedCount], firedCount + 1);
        firedCount++;
      }
      statusLine.textContent = c.toFixed(2) + ' / ' + result.pool.toFixed(2) + ' kWh drawn';

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        while (firedCount < result.lockOrder.length) { fireEvent(result, result.lockOrder[firedCount], firedCount + 1); firedCount++; }
        caption.innerHTML = result.leftover > 0.01
          ? 'Everyone hit their ceiling with <span class="hi">' + result.leftover.toFixed(2) + ' kWh</span> left unused in the pool.'
          : 'Pool fully allocated. Queue order above emerged purely from priority score.';
        statusLine.textContent = 'done · ' + result.consumedTotal.toFixed(2) + ' / ' + result.pool.toFixed(2) + ' kWh drawn';
      }
    }
    requestAnimationFrame(frame);
  }

  function run() {
    syncLabels();
    const v = readInputs();
    const result = simulate(v.scores, v.ceiling, v.consumablePool);
    result.totalPool = v.pool;
    result.reserve = v.reserve;
    animate(result);
  }

  function shuffle() {
    ids.forEach(id => {
      CRITERIA.forEach(c => { critSliders[id][c.key].value = Math.random().toFixed(2); });
    });
    const poolVal = 8 + Math.random() * 18;
    sliders.pool.value = poolVal.toFixed(1);
    sliders.reserve.value = (Math.random() * poolVal * 0.35).toFixed(1);
    sliders.ceiling.value = (2 + Math.random() * 6).toFixed(1);
    syncLabels();
    run();
  }

  sliders.pool.addEventListener('input', syncLabels);
  sliders.reserve.addEventListener('input', syncLabels);
  sliders.ceiling.addEventListener('input', syncLabels);
  runBtn.addEventListener('click', run);
  shuffleBtn.addEventListener('click', shuffle);

  buildScoreCards();
  buildDetailedTable();
  buildCalcTable();
  syncLabels();
  const initialInputs = readInputs();
  const initial = simulate(initialInputs.scores, initialInputs.ceiling, initialInputs.consumablePool);
  initial.totalPool = initialInputs.pool;
  initial.reserve = initialInputs.reserve;
  resetVisuals(initial);
  staggerChildren(panelEls[1], '.score-card', 250, 100);
})();
`;

export default function PriorityDemo() {
  const rootRef = useRef(null);

  useEffect(() => {
    const scriptEl = document.createElement('script');
    scriptEl.textContent = SCRIPT_SOURCE;
    document.body.appendChild(scriptEl);
    return () => {
      document.body.removeChild(scriptEl);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </>
  );
}
