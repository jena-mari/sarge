'use client';

import { ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';

/* ---------------------------------------------------------------------------
 * Reference register — every external claim in this page resolves to one of
 * these. `confirmed` sources were independently re-fetched/re-searched and
 * cross-checked this session (their exact URL was loaded and its content
 * matched the claim it supports). `located` sources are real, correctly
 * identified, live documents whose *existence, publisher and topic* were
 * confirmed, but whose page-level tables were not re-OCR’d/re-extracted this
 * session — the specific figures drawn from them should be spot-checked
 * against the primary PDF/workbook before being quoted as independently
 * re-verified. This distinction is disclosed, not hidden — see §10.
 * ------------------------------------------------------------------------ */
const REFERENCES = [
  { id: 'abs-asgs-overview', status: 'confirmed', text: 'ABS. "Australian Statistical Geography Standard (ASGS)" — overview.', href: 'https://www.abs.gov.au/statistics/statistical-geography/australian-statistical-geography-standard-asgs' },
  { id: 'abs-asgs-sa2', status: 'confirmed', text: 'ABS. ASGS Edition 3 (Jul 2021–Jun 2026), Main Structure — Statistical Area Level 2.', href: 'https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/main-structure-and-greater-capital-city-statistical-areas/statistical-area-level-2' },
  { id: 'abs-asgs-boundaries', status: 'confirmed', text: 'ABS. ASGS Edition 3 — digital boundary files (GeoPackage / ESRI shapefile).', href: 'https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-3-july-2021-june-2026/access-and-downloads/digital-boundary-files' },
  { id: 'abs-asgs-api', status: 'confirmed', text: 'ABS. ASGS Edition 3 — data services and APIs.', href: 'https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-3-july-2021-june-2026/access-and-downloads/data-services-and-apis' },
  { id: 'abs-seifa-methodology', status: 'confirmed', text: 'ABS. SEIFA 2021 Technical Paper — Conceptual framework (IRSD, base 1000, 2021 Census-derived).', href: 'https://www.abs.gov.au/statistics/detailed-methodology-information/concepts-sources-methods/socio-economic-indexes-areas-seifa-technical-paper/2021/conceptual-framework' },
  { id: 'abs-seifa-sa2-api', status: 'confirmed', text: 'ABS. SEIFA by 2021 SA2 — live ArcGIS FeatureServer (geo.abs.gov.au).', href: 'https://geo.abs.gov.au/arcgis/rest/services/Hosted/ABS_Socio_Economic_Indexes_for_Areas_SEIFA_by_2021_SA2/FeatureServer/layers' },
  { id: 'abs-census-g33-sa2-api', status: 'confirmed', text: 'ABS. 2021 Census G33 (Total household income, weekly) by SA2 — live ArcGIS FeatureServer.', href: 'https://geo.abs.gov.au/arcgis/rest/services/Hosted/ABS_2021_Census_G33_SA2/FeatureServer/layers' },
  { id: 'abs-census-hind', status: 'confirmed', text: 'ABS. Census Dictionary 2021 — "Total household income (weekly) (HIND)".', href: 'https://www.abs.gov.au/census/guide-census-data/census-dictionary/2021/variables-topic/income-and-work/total-household-income-weekly-hind' },
  { id: 'abs-quickstats-wollongong', status: 'confirmed', text: 'ABS. 2021 Census QuickStats — Wollongong (LGA18450). Median household income $1,682/wk; 214,564 people; 89,329 private dwellings.', href: 'https://www.abs.gov.au/census/find-census-data/quickstats/2021/LGA18450' },
  { id: 'abs-community-profile-wollongong', status: 'confirmed', text: 'ABS. 2021 Wollongong Census Community Profile (LGA18450).', href: 'https://abs.gov.au/census/find-census-data/community-profiles/2021/LGA18450' },
  { id: 'nsw-esp-annual-report-2223', status: 'located', text: 'NSW Dept. of Climate Change, Energy, the Environment and Water (DCCEEW). NSW Energy Social Programs Annual Report 2022–23.', href: 'https://www.energy.nsw.gov.au/sites/default/files/2024-03/NSW_Energy_Social_Programs_Annual_Report_2022_2023.pdf' },
  { id: 'nsw-esp-landing', status: 'confirmed', text: 'NSW Government. "Social Programs for Energy" — reports landing page (annual reports + data workbooks by year).', href: 'https://www.energy.nsw.gov.au/nsw-plans-and-progress/regulation-and-policy/nsw-social-programs-energy-code/social-programs-energy' },
  { id: 'aer-annual-retail-2223', status: 'confirmed', text: 'AER. Annual Retail Markets Report 2022–23 — hardship customers 1.1%→1.4%, energy-debt customers 2.5%→2.9%.', href: 'https://www.aer.gov.au/publications/reports/performance/annual-retail-markets-report-2022-23' },
  { id: 'aer-q2-2526', status: 'confirmed', text: 'AER. Retail energy market performance update, October–December 2025 (Quarter 2 2025–26) — hardship-program debt up year-on-year.', href: 'https://www.aer.gov.au/publications/reports/performance/retail-energy-market-performance-update-october-december-2025-quarter-2-2025-26' },
  { id: 'aer-reporting-guidelines', status: 'confirmed', text: 'AER. (Retail Law) Performance Reporting Procedures and Guidelines, Version 4 (28 Aug 2024) — life-support and family-violence customer reporting categories.', href: 'https://www.aer.gov.au/system/files/2024-08/AER%20(Retail%20Law)%20Performance%20reporting%20procedures%20and%20Guidelines%20-%20Version%204%20-%2028%20August%202024.pdf' },
  { id: 'aer-endeavour-registration', status: 'confirmed', text: 'AER. Endeavour Energy — registered electricity distribution network service provider.', href: 'https://www.aer.gov.au/industry/networks/entities/service-providers/endeavour-energy' },
  { id: 'endeavour-what-we-do', status: 'confirmed', text: 'Endeavour Energy. "What we do" — network area: Greater Western Sydney, Blue Mountains, Southern Highlands, Illawarra (incl. Wollongong), South Coast.', href: 'https://www.endeavourenergy.com.au/about-us/who-we-are/what-we-do' },
  { id: 'eca-hardship-report', status: 'confirmed', text: 'Energy Consumers Australia. Consumer Energy Report Card — "Understanding and measuring energy hardship in Australia" (Jun 2025); defines the 6%-of-income hardship threshold.', href: 'https://energyconsumersaustralia.com.au/our-work/surveys/consumer-energy-report-card-understanding-measuring-energy-hardship-australia' },
];

function Cite({ id }) {
  const index = REFERENCES.findIndex((r) => r.id === id) + 1;
  const ref = REFERENCES[index - 1];
  return (
    <a
      href={`#ref-${id}`}
      className="text-[#0071e3] font-semibold no-underline hover:underline text-[0.78em] align-super"
      title={ref?.text}
    >
      [{index}]
    </a>
  );
}

function Badge({ kind, children }) {
  const styles = {
    real: 'bg-[#e6f6ec] text-[#1c7a3d]',
    assumption: 'bg-[#fdf1de] text-[#a6650a]',
    code: 'bg-black/5 text-[#1d1d1f]',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${styles[kind]}`}>{children}</span>;
}

function Code({ children }) {
  return <code className="bg-black/5 rounded px-1.5 py-0.5 text-[0.85em]">{children}</code>;
}

function Table({ head, rows, note }) {
  return (
    <div className="my-4">
      <div className="overflow-x-auto rounded-2xl border border-black/[0.06]">
        <table className="w-full text-[0.86rem] border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-black/[0.04] text-left">
              {head.map((h) => (
                <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-black/[0.06] ${r._total ? 'font-semibold bg-black/[0.02]' : ''}`}>
                {r.cells.map((c, j) => (
                  <td key={j} className="px-4 py-2.5 whitespace-nowrap">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-[0.78rem] text-[var(--muted)] mt-1.5">{note}</p>}
    </div>
  );
}

function Callout({ tone = 'neutral', icon, children }) {
  const tones = {
    neutral: 'bg-black/[0.03]',
    warn: 'bg-[#fdf1de]',
    good: 'bg-[#e6f6ec]',
  };
  return (
    <div className={`rounded-2xl px-5 py-4 text-[0.88rem] leading-relaxed ${tones[tone]} mb-4 flex gap-3`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

function Section({ id, num, title, badge, children }) {
  return (
    <section id={id} className="bg-white rounded-[28px] p-7 max-w-4xl leading-relaxed text-[15px] mb-6 scroll-mt-24">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[0.72rem] font-bold tracking-[0.1em] text-[var(--muted)]">{num}</span>
        {badge}
      </div>
      <h2 className="text-xl font-bold mt-0 mb-4">{title}</h2>
      {children}
    </section>
  );
}

const SA2_TABLE = [
  ['Port Kembla – Warrawong', '9,740', '851.2', '1'],
  ['Berkeley – Lake Heights – Cringila', '14,200', '886.7', '1'],
  ['Windang – Primbee', '4,239', '939.8', '2'],
  ['Corrimal – Tarrawanna – Bellambi', '16,041', '961.8', '3'],
  ['Dapto – Avondale', '24,195', '970.0', '3'],
  ['Wollongong – West', '16,551', '990.7', '4'],
  ['Balgownie – Fairy Meadow', '21,519', '1,006.9', '5'],
  ['Unanderra – Mount Kembla', '15,280', '1,011.1', '5'],
  ['Wollongong – East', '16,020', '1,015.4', '6'],
  ['Figtree – Keiraville', '22,773', '1,038.2', '7'],
  ['Woonona – Bulli – Russell Vale', '20,761', '1,038.4', '7'],
  ['Horsley – Kembla Grange', '12,155', '1,048.1', '8'],
  ['Helensburgh', '9,135', '1,086.8', '10'],
  ['Thirroul – Austinmer – Coalcliff', '11,957', '1,095.9', '10'],
];

const ESP_TABLE = [
  ['Low Income Household Rebate', '29,449', '$7,496,563', '33.0%'],
  ['NSW Gas Rebate', '12,479', '$1,248,110', '14.0%'],
  ['Medical Energy Rebate', '215', '$50,156', '0.2%'],
  ['Seniors Energy Rebate', '1,228', '$245,619', '1.4%'],
  ['Family Energy Rebate', '1,131', '$126,242', '1.3%'],
  ['Life Support Rebate — override signal', '1,501', '$298,782', '1.7%'],
  ['EAPA — crisis payment assistance', '1,613', '$595,367', '1.8%'],
];

const INCOME_BANDS = [
  ['$400–499', '12.2%', '3.6%'],
  ['$650–799', '9.3%', '4.0%'],
  ['$1,000–1,249', '8.4%', '5.2%'],
  ['$2,000–2,499', '9.4%', '11.2%'],
  ['$4,000+', '5.8%', '27.6%'],
];

const FIELD_DICT = [
  ['sa2_id', 'Assigned suburb-group', 'Weighted random draw over the 14 SA2s, weights = each SA2’s real dwelling count', 'Census G33 (tot_tot)', 'SA2'],
  ['irsd_score, irsd_decile', 'Area disadvantage base', 'Direct lookup — no modelling', 'SEIFA 2021 IRSD API', 'SA2'],
  ['household_weekly_income', 'Household’s own income', 'Sampled from the assigned SA2’s real income-band shares, $ interpolated within the drawn band', 'Census G33', 'SA2'],
  ['income_gap', 'Normalised shortfall vs. reference', '(reference − income) / reference, clipped to [0,1]', 'QuickStats — $1,682/wk median', 'LGA (reference), household (input)'],
  ['area_disadvantage', 'Normalised inverse decile', '(10 − irsd_decile) / 9', 'Same SEIFA source as above', 'SA2'],
  ['has_rooftop_solar', 'Flag', 'Drawn at suburb-level uptake rate (placeholder rate — not yet pulled from a live dataset)', 'Not yet sourced — disclosed gap', 'Suburb (SAL)'],
  ['energy_burden', 'Bill-to-income strain', 'clip((bill_to_income_ratio − 0.06) / 0.06, 0, 1)', 'ECA 6% hardship threshold', 'Household'],
  ['life_support_flag', 'Override → Tier 0 / max priority', 'Drawn at ~1.7% incidence, matching the real Life Support Rebate rate', 'NSW ESP workbook, Appendix A', 'LGA rate'],
  ['is_high_need_area', 'Override → max priority (soft, by default)', '1 if household’s SA2 sits in IRSD decile 1, else 0 — direct lookup', 'SEIFA 2021 IRSD API', 'SA2'],
  ['payment_difficulty', 'Simulated bill-default signal', 'Logistic draw on 0.5×income_gap + 0.5×area_disadvantage, β₀ calibrated to the real 1.8% EAPA base rate', 'EAPA rate + Endeavour Energy disconnection data', 'LGA / network rate'],
  ['hardship_score', 'Final composite', 'Weighted sum of the five terms above, or 1.0 flat under either override', 'This project’s own formula', 'Household'],
];

export function DataProvenanceBody() {
  return (
    <>
      <p className="max-w-3xl text-[15px] text-[var(--muted)] mb-6">
        <code className="bg-black/5 rounded px-1.5 py-0.5 text-[0.85em]">compute_hardship_score()</code> takes five pre-normalized
        inputs and two override flags and does no data collection of its own — by design, its own docstring states it
        &ldquo;assumes nothing about where those numbers come from.&rdquo; This page is the answer to that open question for every
        field: exactly which real ABS / NSW Government / AER dataset it traces to where one exists, the live API or document
        endpoint it is pulled from, the exact sampling or lookup procedure used to turn an area-level statistic into a
        household-level number, and — where no real per-household dataset exists — the disclosed, calibrated assumption used
        instead. Every external figure below links inline to the specific source paragraph in §10.
      </p>

      <div className="flex flex-wrap gap-2 mb-8 max-w-4xl">
        <Badge kind="real">real, independently-sourced data</Badge>
        <Badge kind="assumption">disclosed modelling assumption</Badge>
        <Badge kind="code">implementation reference</Badge>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mb-8">
        {[
          ['14', 'SA2s validated against Wollongong LGA'],
          ['9', 'real datasets/APIs used'],
          ['30,780', 'Wollongong ESP rebate/EAPA accounts, FY2022–23'],
          ['$1,682/wk', 'Wollongong LGA median household income'],
        ].map(([v, l]) => (
          <div key={l} className="bg-white rounded-2xl p-4">
            <strong className="block text-2xl tracking-tight">{v}</strong>
            <span className="text-[0.78rem] text-[var(--muted)]">{l}</span>
          </div>
        ))}
      </div>

      {/* Field index */}
      <nav className="bg-white rounded-2xl p-5 max-w-4xl mb-8 text-[0.86rem]">
        <p className="font-bold mb-2 text-[0.75rem] tracking-[0.08em] text-[var(--muted)] uppercase">Field index</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
          {[
            ['sec-01', '01 · Geography units'],
            ['sec-02', '02 · Area disadvantage'],
            ['sec-03', '03 · Household income'],
            ['sec-04', '04 · Rebate & crisis data'],
            ['sec-05', '05 · Provider default data'],
            ['sec-06', '06 · State trend context'],
            ['sec-07', '07 · The formula'],
            ['sec-08', '08 · Field dictionary'],
            ['sec-09', '09 · Caveats'],
            ['sec-10', '10 · Source register'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-[#0071e3] no-underline hover:underline">{label}</a>
          ))}
        </div>
      </nav>

      {/* 01 — Geography */}
      <Section id="sec-01" num="01" title="Geography units — SA1, SA2, LGA" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          The hardship score needs a geography finer than &ldquo;Wollongong LGA&rdquo; but coarser than an exact street address.
          The ABS’s Australian Statistical Geography Standard (ASGS) <Cite id="abs-asgs-overview" /> defines exactly this
          hierarchy of nested, non-overlapping areas, and every level below is a real, currently-published ABS boundary —
          nothing here is drawn freehand.
        </p>
        <Table
          head={['Level', 'Typical population', 'Named?', 'Count nationally', 'Used here for']}
          rows={[
            { cells: ['SA1', '200–800 (avg ~400)', 'No — code only', '61,845', 'Sharper option, not used this pass'] },
            { cells: ['SA2', '3,000–25,000 (avg ~10,000)', 'Yes — e.g. “Port Kembla – Warrawong”', '2,473', 'Area-disadvantage & income base unit'] },
            { cells: ['LGA', 'Wollongong: 214,564', 'Yes', '—', 'Reference income, dwelling counts'] },
          ]}
        />
        <p className="text-[0.8rem] mb-4">
          <Cite id="abs-asgs-sa2" /> ASGS Edition 3, Main Structure — SA2 &nbsp;·&nbsp; <Cite id="abs-asgs-boundaries" /> digital boundary
          files (GeoPackage / shapefile) &nbsp;·&nbsp; <Cite id="abs-quickstats-wollongong" /> Wollongong LGA population &amp; dwellings
        </p>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Why SA2, not SA1</h3>
        <p className="mb-2">
          SA1 is the sharper unit, but its income table is only distributed in bulk DataPack files that require offline
          extraction. SA2’s version of the same table — G33, &ldquo;Total household income (weekly)&rdquo; — is exposed as a
          live, queryable ArcGIS FeatureServer endpoint directly from ABS’s own geo platform (<Cite id="abs-census-g33-sa2-api" />),
          which is what makes it practical to pull real per-suburb numbers programmatically instead of hand-copying a
          spreadsheet. SA1 remains the documented, higher-resolution option if a future pass has time to work against the
          DataPack files directly (<Cite id="abs-asgs-api" />).
        </p>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">How this maps onto the code</h3>
        <p>
          <Code>HouseholdInputs</Code> in <Code>scoring_and_tiered_allocation.py</Code> has no <Code>sa2_id</Code> field of its
          own — the geography assignment happens one layer upstream, in whatever generates the five pre-normalized scores. The
          contract this page documents is: draw an SA2 (weighted by real dwelling share, §03), then derive
          <Code>area_disadvantage</Code> and <Code>income_gap</Code> from that draw before <Code>HouseholdInputs</Code> is ever
          constructed. <Code>compute_hardship_score()</Code> itself never sees an SA2 code — only the two derived, pre-normalized
          numbers.
        </p>
      </Section>

      {/* 02 — Area disadvantage */}
      <Section id="sec-02" num="02" title="Area disadvantage — SEIFA IRSD, suburb by suburb" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          Wollongong LGA’s overall SEIFA score (1,000, by construction — the index is normalised to a national mean of 1,000
          <Cite id="abs-seifa-methodology" />) is a population-weighted average and hides real internal spread. Below is every
          SA2 that makes up Wollongong LGA, with its 2021 Index of Relative Socio-economic Disadvantage (IRSD) score and
          national decile (1 = most disadvantaged 10% of SA2s nationally, 10 = least).
        </p>
        <Table
          head={['Suburb group (SA2)', 'Population', 'IRSD score', "Decile (nat’l, 1=most disadv.)"]}
          rows={[
            ...SA2_TABLE.map(([a, b, c, d]) => ({ cells: [a, b, c, d] })),
            { _total: true, cells: ['Total (validated)', '214,566', '—', 'ABS LGA figure: 214,564'] },
          ]}
        />
        <Callout tone="good" icon={<CheckCircle2 size={18} />}>
          <strong>Verification method.</strong> Wollongong LGA’s boundary polygon was spatially matched against SA2 boundaries
          (both ASGS Edition 3 <Cite id="abs-asgs-boundaries" />) to build the constituent list, then cross-checked against
          population: the 14 SA2s above sum to 214,566 against ABS’s own official LGA figure of 214,564
          <Cite id="abs-quickstats-wollongong" /> — a 2-person gap fully explained by ABS’s routine small-cell perturbation
          applied to protect respondent privacy. A 2-in-214,564 (0.0009%) discrepancy is strong evidence the list is the
          complete, correct constituent set rather than an approximate name-match.
        </Callout>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">How it’s pulled and tracked</h3>
        <p className="mb-2">
          IRSD scores are a <strong>direct lookup, not a model</strong> — for a given SA2 code, the score and decile come
          straight back from ABS’s live SEIFA-by-SA2 FeatureServer (<Cite id="abs-seifa-sa2-api" />), the same geo.abs.gov.au
          platform used for the income table in §03. Nothing is interpolated or estimated: whatever SA2 a household is
          assigned to in §01, its <Code>irsd_decile</Code> is that SA2’s published decile, full stop — no rounding, no
          smoothing across neighbouring suburbs.
        </p>
        <p>
          Two things are then derived from that one lookup and tracked separately through the rest of the pipeline:
          <Code>area_disadvantage = (10 − irsd_decile) / 9</Code> feeds the weighted formula (§07) as a continuous 0–1 term,
          while <Code>is_high_need_area = 1 if irsd_decile == 1 else 0</Code> feeds the hard-override check in
          <Code>compute_hardship_score()</Code> (<Code>scoring_and_tiered_allocation.py:111</Code>) — meaning a single IRSD
          lookup does double duty as both a graded input and a binary override trigger, and both are traceable back to the
          exact same source row.
        </p>
      </Section>

      {/* 03 — Household income */}
      <Section id="sec-03" num="03" title="Household income — sampled, not averaged" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          A common trap: subtracting one area-wide average from another gives every household in the same suburb an
          identical score. Instead, each synthetic household draws its <em>own</em> income from its assigned SA2’s real
          income-band distribution — ABS Census table G33, &ldquo;Total household income (weekly)&rdquo;
          (<Cite id="abs-census-hind" />), which reports the actual count of households in 17 real dollar bands, for every
          SA2, and is exposed live at <Cite id="abs-census-g33-sa2-api" />. Below are two real, opposite ends of Wollongong
          LGA:
        </p>
        <Table
          head={['Weekly household income band', 'Port Kembla–Warrawong (decile 1)', 'Thirroul–Austinmer–Coalcliff (decile 10)']}
          rows={INCOME_BANDS.map(([a, b, c]) => ({ cells: [a, b, c] }))}
          note="Figures are % of households with a stated income in that SA2 only. Full 17-band table available from the same live source."
        />
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">How <Code>income_gap</Code> is actually built — step by step</h3>
        <ol className="list-decimal pl-5 space-y-2 mb-4">
          <li>Assign the synthetic household to one of the 14 SA2s from §01, with selection probability weighted by that
            SA2’s real dwelling count (Census G33 total households row, <Cite id="abs-census-g33-sa2-api" />) — a household
            is far more likely to land in high-population Dapto–Avondale (24,195 people) than low-population
            Windang–Primbee (4,239).</li>
          <li>Within that SA2, sample a weekly income by treating the 17 real band-share percentages above as a discrete
            probability distribution: draw a band by weight, then interpolate a single dollar figure uniformly within that
            band’s dollar range (e.g. a draw landing in &ldquo;$650–799&rdquo; resolves to a uniform random value between
            $650 and $799).</li>
          <li>Compare that <em>drawn</em> income to a fixed, external reference — never the local area’s own average, which
            would be circular (a household would always score as needy relative to its own suburb’s mean, even in a
            wealthy suburb). Wollongong LGA’s real median, $1,682/week <Cite id="abs-quickstats-wollongong" />, is used as
            the reference.</li>
        </ol>
        <div className="bg-black/5 rounded-2xl px-5 py-4 font-mono text-[0.8rem] mb-4 overflow-x-auto">
          income_gap = clip( (reference_income − household_income) / reference_income, 0, 1 )
        </div>
        <p>
          This clip means a household earning at or above the reference gets <Code>income_gap = 0</Code>, and one earning
          nothing (or notionally negative, which the sampling procedure cannot actually produce) is capped at
          <Code>income_gap = 1</Code> — matching the <Code>[0, 1]</Code> pre-normalization contract every field in
          <Code>HouseholdInputs</Code> is required to satisfy before <Code>compute_hardship_score()</Code> will accept it
          (the JS port throws a <Code>TypeError</Code> on a missing or non-numeric factor rather than silently defaulting it
          to zero — <Code>hardshipScore.js:44-46</Code> — precisely so a broken upstream pipeline fails loudly instead of
          quietly under-scoring a household).
        </p>
      </Section>

      {/* 04 — Rebate & crisis data */}
      <Section id="sec-04" num="04" title="Rebate & crisis-payment data — Wollongong LGA, FY2022–23" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          NSW’s Energy Social Programs Annual Report breaks every rebate and crisis-payment scheme down by LGA
          (<Cite id="nsw-esp-annual-report-2223" />, published by the NSW Department of Climate Change, Energy, the
          Environment and Water — landing page at <Cite id="nsw-esp-landing" />). This is Wollongong’s row for FY2022–23:
        </p>
        <Table
          head={['Program', 'Accounts', 'Value', 'of 89,329 dwellings']}
          rows={[
            ...ESP_TABLE.map(([a, b, c, d]) => ({ cells: [a, b, c, d] })),
            { _total: true, cells: ['Total (Wollongong ranks #10 of all NSW LGAs)', '30,780', '$10,060,840', '34.5%'] },
          ]}
        />
        <Callout tone="warn" icon={<AlertTriangle size={18} />}>
          <strong>Verification status.</strong> The report itself — publisher, title, FY, and URL — is confirmed real and
          currently live. Its topline structure (an LGA-by-LGA rebate and EAPA breakdown, one row per program, matching this
          shape) is confirmed from the report’s own summary material. The specific cell values above (account counts, dollar
          totals, per-program percentages) were not re-extracted from the primary PDF/workbook table by table during this
          pass — the source PDF’s text layer did not extract cleanly for automated re-checking. Before quoting these exact
          figures publicly, cross-check them against the LGA table in the source document or its companion Excel workbook
          (linked from <Cite id="nsw-esp-landing" />).
        </Callout>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">The take-up gap — a correction to an earlier claim</h3>
        <p className="mb-2">
          An earlier draft of this project cited &ldquo;over half of hardship-eligible people miss out on concessions.&rdquo;
          The same workbook has a harder, more precise number for this specific claim, reported at the state level:
        </p>
        <Table
          head={['Basis', 'Receiving']}
          rows={[
            { cells: ['Accounts relative to eligible households', '77.1%'] },
            { cells: ['Unique customers relative to eligible households', '67.7%'] },
          ]}
          note="Real gap: roughly a quarter to a third of eligible households aren’t receiving — not “over half.” Same verification caveat as above applies to these two percentages."
        />
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">How <Code>life_support_flag</Code> is pulled and tracked</h3>
        <p>
          The Life Support Rebate row above (1,501 accounts, 1.7% of Wollongong’s 89,329 dwellings) is the real base rate
          used to calibrate the synthetic incidence of <Code>life_support_flag</Code> — households are flagged at
          approximately that population rate rather than an arbitrary round number. In the real world this field would come
          from a retailer’s or network operator’s own life-support register (a household applies, is medically certified,
          and is entered onto the register — see §05); in this dataset it is drawn stochastically at the disclosed rate. It
          is tracked identically either way downstream: <Code>HouseholdInputs.life_support_flag</Code> is read once, in
          <Code>allocate_tiered()</Code>, to route a household into Tier 0 ahead of the normal weighted pool
          (<Code>scoring_and_tiered_allocation.py:154</Code>), and again inside <Code>compute_hardship_score()</Code> as a
          hard override to 1.0 for any household that stays in the general pool for reporting purposes.
        </p>
      </Section>

      {/* 05 — Endeavour Energy */}
      <Section id="sec-05" num="05" title="Provider-reported default data — Endeavour Energy" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          Individual retailers (AGL, Origin, EnergyAustralia…) publish hardship <em>policies</em>, not usage statistics —
          retail is a competitive market in NSW, so no single retailer &ldquo;belongs&rdquo; to Wollongong. The network
          operator does. Endeavour Energy is the registered electricity distribution network service provider covering
          Greater Western Sydney, the Blue Mountains, the Southern Highlands, the Illawarra (including Wollongong) and the
          South Coast — confirmed both on the regulator’s own registry (<Cite id="aer-endeavour-registration" />) and on
          Endeavour Energy’s own network-area description (<Cite id="endeavour-what-we-do" />). This is the one entity in
          the energy supply chain that is geographically exclusive to the region, the way retailers aren’t.
        </p>
        <Table
          head={['Metric', 'Value']}
          rows={[
            ['Residential customers receiving a rebate', '31.6% (304,867 / 965,031)'],
            ['Electricity accounts disconnected (any reason)', '936'],
            ['Disconnected relative to rebate-customer accounts', '0.307%'],
            ['Reconnected within a day of disconnection', '169'],
            ['Average overdue amount when disconnected', '$1,839.66'],
            ['Average annual electricity use', '6,747.8 kWh/yr'],
            ['Average annual electricity bill', '$2,016.03'],
            ['Rebates relative to bill', '20.5%'],
          ].map((r) => ({ cells: r }))}
        />
        <Callout tone="warn" icon={<AlertTriangle size={18} />}>
          As with §04, the existence, publisher, and network-level reporting structure of this data (retailer-submitted
          statistics filtered to Endeavour Energy’s footprint, via the NSW ESP workbook <Cite id="nsw-esp-annual-report-2223" />)
          is confirmed. The specific figures in this table were not independently re-extracted from the primary workbook
          this session — treat them as figures to spot-check against the source before citing as independently re-verified.
        </Callout>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">What this number is (and isn’t)</h3>
        <p className="mb-4">
          $1,839.66 is the average debt among accounts that actually reached disconnection — the most severe end of the
          distress curve, and network-wide (Endeavour also covers Western Sydney and the Blue Mountains, not just
          Wollongong). It is a reasonable real anchor for a &ldquo;debt severity&rdquo; distribution if
          <Code>payment_difficulty</Code> is ever modelled as a continuous severity rather than a binary flag, but it will
          overstate the typical EAPA-recipient’s debt, since EAPA is meant to intervene <em>before</em> disconnection.
        </p>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">How this feeds <Code>payment_difficulty</Code></h3>
        <p>
          This table supplies two things to §07’s logistic model: the population base rate (1.8%, from EAPA uptake in §04)
          that pins the model’s intercept, and this section’s disconnection-debt figures as the qualitative justification for
          treating <Code>payment_difficulty</Code> as bill-default risk specifically, rather than a generic hardship proxy.
          Neither number is read directly into any household’s individual score — they calibrate the shape of the simulated
          distribution once, at the population level, not per household.
        </p>
      </Section>

      {/* 06 — AER state trend */}
      <Section id="sec-06" num="06" title="State-wide trend context (AER)" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          Not Wollongong-specific, but a real, live &ldquo;conditions are worsening&rdquo; dial that can be tuned
          period-to-period in a demo, sourced from the Australian Energy Regulator’s own retail-market reporting.
        </p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li>NSW energy-debt customers rose from 2.5% to 2.9%, and formal hardship-program customers from 1.1% to 1.4%,
            over FY2022–23 <Cite id="aer-annual-retail-2223" /> — both figures independently re-confirmed against the AER’s
            own published report this session.</li>
          <li>The most recent AER quarterly release (October–December 2025, i.e. Quarter 2 2025–26) reports that average
            electricity and gas debt held by customers in a hardship program has increased significantly year-on-year
            <Cite id="aer-q2-2526" /> — also independently re-confirmed this session, and notably the first release under a
            new reporting requirement that separately tracks embedded-network customers, family-violence-affected customers,
            and life-support customers.</li>
          <li>AER’s own reporting standard (version 4, effective 28 August 2024) already codifies life-support and
            family-violence flags as distinct, mandatory retailer-reported categories, alongside hardship counts, debt, and
            disconnections <Cite id="aer-reporting-guidelines" /> — the same shape of categories this project’s own field
            dictionary in §08 uses.</li>
        </ul>
      </Section>

      {/* 07 — The formula */}
      <Section id="sec-07" num="07" title="The hardship score" badge={<Badge kind="code">implementation</Badge>}>
        <p className="mb-4">
          Arithmetic, auditable, and every term traceable to a section above. This is the literal formula implemented in
          <Code>compute_hardship_score()</Code> (<Code>scoring_and_tiered_allocation.py:103-114</Code>) and its JS port
          <Code>computeHardshipScore()</Code> (<Code>hardshipScore.js:37-50</Code>), governed by the versioned policy object
          <Code>HARDSHIP_POLICY_V1</Code> (<Code>hardshipPolicyV1.js</Code>) — not re-derived here, quoted verbatim:
        </p>
        <div className="bg-black/5 rounded-2xl px-5 py-4 font-mono text-[0.8rem] mb-4 overflow-x-auto whitespace-pre">
{`IF life_support_flag == 1 OR is_high_need_area == 1:
    hardship_score = 1.0                         // global overrides — bypass the weighted sum entirely
ELSE:
    hardship_score = 0.30 × income_gap
                    + 0.25 × area_disadvantage
                    + 0.20 × payment_difficulty
                    + 0.15 × energy_burden
                    + 0.10 × no_solar_access       // weights sum to 1.00, every term pre-clipped to 0–1
                                                    // → output always in [0,1]`}
        </div>
        <Table
          head={['Field', 'Weight', 'How it is computed']}
          rows={[
            ['life_support_flag', 'override → 1.0', 'Individual-level override. 1 if the household is on a medical/life-support register (~1.7% incidence, real Wollongong Life Support Rebate rate, §04). Skips the weighted sum entirely — and is also a genuine hard Tier-0 capacity bypass in allocate_tiered(), not just a maximum input (§07 below).'],
            ['is_high_need_area', 'override → 1.0', 'Area-level override. 1 if the household’s assigned SA2 sits in IRSD decile 1 — the real, most-disadvantaged bracket (Port Kembla–Warrawong, Berkeley–Lake Heights–Cringila, §02). Soft ceiling by default (HIGH_NEED_AREA_IS_HARD_OVERRIDE = False) — forces the score to 1.0 but still competes inside the normal weighted pool, rather than jumping the queue like life_support_flag does.'],
            ['income_gap', '0.30', '(reference_income − household_income) / reference_income, clipped to 0–1. reference_income = Wollongong LGA median, $1,682/wk (§03).'],
            ['area_disadvantage', '0.25', '(10 − irsd_decile) / 9 — decile 1 (most disadvantaged) → 1.0, decile 10 → 0.0 (§02). Only reached for households not already caught by is_high_need_area.'],
            ['payment_difficulty', '0.20', 'Bernoulli draw from a logistic function of risk_index = 0.5×income_gap + 0.5×area_disadvantage, calibrated so the population average = 1.8% (real EAPA rate, §04). See worked example below.'],
            ['energy_burden', '0.15', 'clip((bill_to_income_ratio − 0.06) / 0.06, 0, 1) — 0 below the Energy Consumers Australia 6%-of-income hardship threshold, scaling up above it.'],
            ['no_solar_access', '0.10', '1 if the household has no rooftop solar, else 0 — drawn from a suburb-level uptake placeholder rate (disclosed gap, §08).'],
            ['hardship_score (final)', 'Σ = 1.00', 'Weighted sum of the five graded terms above, or 1.0 flat if either override fires. Always lands in [0, 1] — the value the priority-weight function and downstream Nash-welfare allocator sort on.'],
          ].map((r) => ({ cells: r }))}
        />
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Why two overrides, not one</h3>
        <p className="mb-4">
          <Code>life_support_flag</Code> catches individual, medically-certified need regardless of where someone lives.
          <Code>is_high_need_area</Code> catches structural, place-based disadvantage regardless of any one household’s own
          drawn income — a household that happens to sample a decent income inside a decile-1 SA2 still gets pulled to the
          top, on the reasoning that area-wide disadvantage (poor housing stock, lower solar uptake, higher energy burden
          across the board) isn’t fully captured by an individual income draw alone. The module docstring in
          <Code>scoring_and_tiered_allocation.py:15-36</Code> states this as a deliberate, disclosed design choice — with the
          explicit tradeoff that flipping <Code>HIGH_NEED_AREA_IS_HARD_OVERRIDE</Code> to <Code>True</Code> &ldquo;will crowd Tier 0
          with potentially many households and dilute the emergency-priority guarantee for genuine life-support cases.&rdquo;
        </p>
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]"><Code>payment_difficulty</Code>, in full</h3>
        <p className="mb-2">
          Not observed for any real household — this is a calibrated simulation standing in for EAPA-style crisis assistance
          (real Wollongong base rate: 1.8%/yr, §04):
        </p>
        <div className="bg-black/5 rounded-2xl px-5 py-4 font-mono text-[0.8rem] mb-4 overflow-x-auto whitespace-pre">
{`risk_index = 0.5 × income_gap + 0.5 × area_disadvantage
P(payment_difficulty) = 1 / (1 + exp( −(β0 + β1 × risk_index) ))`}
        </div>
        <Table
          head={['Household', 'income_gap', 'area_disadvantage', 'risk_index', 'P(flag)']}
          rows={[
            ['A — comfortable, low-disadvantage suburb', '0.05', '0.10', '0.08', '~0.4%'],
            ['B — below threshold, high-disadvantage suburb', '0.70', '0.90', '0.80', '~6–8%'],
          ].map((r) => ({ cells: r }))}
        />
        <Callout tone="warn" icon={<AlertTriangle size={18} />}>
          <strong>Disclosed assumption.</strong> β1 (correlation strength between disadvantage and default risk) is not
          independently measured for Wollongong — no public dataset gives the true individual-level correlation. β0 is
          solved numerically so the simulated population average matches the real 1.8% EAPA rate; β1 is a chosen, disclosed
          slider, not a fitted parameter.
        </Callout>
      </Section>

      {/* 08 — Field dictionary */}
      <Section id="sec-08" num="08" title="Full field dictionary" badge={<Badge kind="code">implementation</Badge>}>
        <p className="mb-4">
          Every field consumed by <Code>HouseholdInputs</Code> / the JS <Code>HouseholdHardshipInput</Code> type, how it’s
          generated, and exactly where the number comes from.
        </p>
        <Table
          head={['Field', 'Represents', 'Generation method', 'Real source', 'Geography']}
          rows={FIELD_DICT.map((r) => ({ cells: r }))}
        />
        <p className="text-[0.8rem] text-[var(--muted)] mt-2">
          <Code>has_rooftop_solar</Code> is the one field in this dictionary with no real dataset behind it yet — flagged
          here rather than silently treated as solved. A candidate real source (small-scale solar install data, e.g. the
          Clean Energy Regulator’s postcode-level rooftop PV register) has not been pulled into this pipeline.
        </p>
      </Section>

      {/* 09 — Caveats */}
      <Section id="sec-09" num="09" title="Caveats worth disclosing" badge={<Badge kind="assumption">disclosed</Badge>}>
        <ul className="list-disc pl-5 space-y-2.5">
          <li><strong>Accounts ≠ households.</strong> Retailer-switchers can be double-counted across a year; embedded-network
            dwellings can share one account. The §04/§05 figures are fine for calibrating population-level probabilities, not
            for claims of household-level precision.</li>
          <li><strong>Take-up gap.</strong> Roughly 23–32% of rebate-eligible households statewide aren’t currently receiving
            their rebate <Cite id="nsw-esp-annual-report-2223" /> — &ldquo;currently receiving&rdquo; understates true need,
            so any model calibrated only on <em>recipients</em> of a program will under-count eligible-but-unenrolled
            hardship.</li>
          <li><strong><Code>payment_difficulty</Code>’s correlation strength (β1) is chosen, not measured</strong> — no public
            dataset gives the true individual-level correlation between income/area disadvantage and default risk (§07).</li>
          <li><strong>Endeavour Energy’s $1,839.66 figure is network-wide</strong> (Western Sydney + Blue Mountains +
            Illawarra), and specific to the disconnected subset — not a Wollongong-only, all-hardship-customers average
            (§05).</li>
          <li><strong>SEIFA is ordinal and area-level.</strong> A well-off household in a decile-1 SA2 still inherits that
            area’s score under <Code>is_high_need_area</Code>, and a struggling household in a decile-10 SA2 does not get
            that override — this is a deliberate design tradeoff (§07), not an oversight.</li>
          <li><strong><Code>has_rooftop_solar</Code> has no real source pulled in yet</strong> (§08) — currently a placeholder
            uptake rate, the one field in the dictionary still marked as a disclosed gap rather than a disclosed assumption
            with a calibration basis.</li>
          <li><strong>Report/workbook cell-level figures in §04 and §05 were not independently re-extracted this session.</strong>
            The source documents are real and correctly identified; the specific dollar and account figures quoted should be
            spot-checked against the primary PDF/workbook before being presented as independently re-verified (see the
            verification ledger in §10).</li>
        </ul>
      </Section>

      {/* 10 — Source register */}
      <Section id="sec-10" num="10" title="Source register" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          Every external source cited on this page, in one place. <Badge kind="real">Confirmed</Badge> means the exact URL
          was independently re-fetched or re-searched this session and its content matched the specific claim it supports.
          <Badge kind="assumption">Located</Badge> means the document is real, correctly identified, and live, but its
          page-level tables were not re-extracted cell-by-cell this session — see the caveats in §04, §05 and §09.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-black/[0.06] mb-6">
          <table className="w-full text-[0.84rem] border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-black/[0.04] text-left">
                <th className="px-4 py-2.5 font-semibold">#</th>
                <th className="px-4 py-2.5 font-semibold">Source</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCES.map((r, i) => (
                <tr key={r.id} id={`ref-${r.id}`} className="border-t border-black/[0.06] scroll-mt-24">
                  <td className="px-4 py-2.5 align-top text-[var(--muted)]">{i + 1}</td>
                  <td className="px-4 py-2.5 align-top">
                    <a href={r.href} target="_blank" rel="noreferrer" className="text-[#050505] no-underline hover:underline hover:text-[#0071e3] inline-flex items-start gap-1">
                      {r.text} <ExternalLink size={12} className="shrink-0 mt-1" />
                    </a>
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    {r.status === 'confirmed' ? <Badge kind="real">confirmed live</Badge> : <Badge kind="assumption">located</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <p className="text-xs text-[var(--muted)] mt-2 max-w-4xl">
        Compiled for the Fair Energy Allocation hackathon project (Wollongong, NSW). Every number above either traces to a
        live-checked source (§10, &ldquo;confirmed live&rdquo;), a real but not cell-by-cell re-verified document
        (&ldquo;located&rdquo;), or is explicitly flagged as a disclosed modelling assumption. No household-level figure in
        this project is a real, observed individual — every synthetic household is generated from real area-level
        distributions, never real personal data.
      </p>
    </>
  );
}
