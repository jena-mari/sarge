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
  // Added in a second working session that refined area_disadvantage,
  // energy_burden and no_solar_access with finer-grained real data, and
  // cross-checked two Council reports against independent sources.
  { id: 'abs-seifa-sal-api', status: 'confirmed', text: 'ABS. SEIFA by 2021 SAL (Suburbs and Localities) — live ArcGIS FeatureServer, finer-grained than SA2.', href: 'https://services-ap1.arcgis.com/ypkPEy1AmwPKGNNv/arcgis/rest/services/ABS_Socio_Economic_Indexes_for_Areas_SEIFA_by_2021_SAL/FeatureServer/0' },
  { id: 'profile-id-seifa-sal', status: 'located', text: 'profile.id.com.au. "SEIFA by profile area" — Wollongong City Council Community Profile (ABS Census 2021-derived, published at Wollongong’s own named small-area granularity).', href: 'https://profile.id.com.au/wollongong/seifa-disadvantage-small-area' },
  { id: 'profile-id-seifa-lga', status: 'located', text: 'profile.id.com.au. "SEIFA by Local Government Area" — Wollongong City Council Community Profile.', href: 'https://profile.id.com.au/wollongong/seifa-disadvantage' },
  { id: 'apvi-portal', status: 'confirmed', text: 'Australian PV Institute (APVI). Solar Map — live national rooftop PV installation/capacity data by postcode and suburb.', href: 'https://pv-map.apvi.org.au/postcode' },
  { id: 'nsw-esp-annual-report-2324', status: 'located', text: 'NSW DCCEEW. NSW Energy Social Programs Annual Report 2023–24.', href: 'https://www.energy.nsw.gov.au/sites/default/files/2025-05/NSW-Energy-Social-Programs-Annual-Report-2023-24.pdf' },
  { id: 'wollongong-equity-assessment', status: 'user-provided', text: 'Wollongong City Council. Wollongong Energy Equity Assessment (20pp) — supplied directly for this project, not found at a public URL.' },
  { id: 'wollongong-equity-framework', status: 'user-provided', text: 'Wollongong City Council. DRAFT Wollongong Energy Equity Framework ("Plan_v6") — supplied directly for this project, not found at a public URL.' },
  { id: 'endeavour-postcode-workbook', status: 'user-provided', text: 'Endeavour Energy. Domestic electricity consumption by postcode, 2021/22 (user-supplied workbook, not a public URL).' },
  { id: 'apvi-exports', status: 'user-provided', text: 'Australian PV Institute (APVI). Four exported CSVs — installations/capacity by suburb (all-time and FY24–25) and LGA-wide monthly totals — exported from the live portal above at a point in time, not re-fetched live.' },
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
    userProvided: 'bg-[#eef0fb] text-[#3c48b5]',
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
  ['sa2_id', 'Assigned suburb-group (income geography)', 'Weighted random draw over the 14 SA2s, weights = each SA2’s real dwelling count', 'Census G33 (tot_tot)', 'SA2'],
  ['suburb', 'Assigned suburb (area-disadvantage geography)', 'Independent draw, real suburb name — a different geography from sa2_id', 'ABS SAL boundaries', 'SAL'],
  ['household_weekly_income', 'Household’s own income', 'Sampled from the assigned SA2’s real income-band shares, $ interpolated within the drawn band', 'Census G33', 'SA2'],
  ['income_gap', 'Normalised shortfall vs. reference', '(reference − income) / reference, clipped to [0,1]', 'QuickStats — $1,682/wk median', 'LGA (reference), household (input)'],
  ['area_disadvantage', 'Normalised inverse decile/percentile', 'Tiered: ABS SAL decile → profile.id percentile → LGA-wide default (§02)', 'ABS SEIFA SAL API + profile.id', 'SAL, tiered'],
  ['is_high_need_area', 'Override → max priority (soft, by default)', 'True if the tiered resolution in §02 flags the suburb high-need — direct lookup, no modelling', 'ABS SEIFA SAL API + profile.id', 'SAL, tiered'],
  ['has_rooftop_solar', 'Flag', 'Drawn at real per-suburb installation/capacity rate', 'APVI suburb-level exports', 'Suburb (SAL)'],
  ['energy_burden', 'Bill-to-income strain', 'clip((bill_to_income_ratio − 0.06) / 0.06, 0, 1), bill estimate now postcode-level', 'Endeavour Energy postcode workbook + ECA 6% threshold', 'Postcode'],
  ['life_support_flag', 'Override → Tier 0 / max priority', 'Drawn at ~1.7% incidence, matching the real Life Support Rebate rate', 'NSW ESP workbook, Appendix A', 'LGA rate'],
  ['payment_difficulty', 'Simulated bill-default signal', 'Logistic draw on 0.5×income_gap + 0.5×area_disadvantage, β₀ calibrated to the real 1.8% EAPA base rate', 'EAPA rate + Endeavour Energy disconnection data', 'LGA / network rate'],
  ['hardship_score', 'Final composite', 'Weighted sum of the five terms above, or 1.0 flat under either override', 'This project’s own formula', 'Household'],
];

const COUNCIL_DATASETS = [
  ['Wollongong Energy Equity Assessment (PDF)', 'income_gap, payment_difficulty', 'Source of the two income brackets and the typical arrears range calibrating those two fields (v1, unchanged) — cross-checked against independent sources below.'],
  ['DRAFT Wollongong Energy Equity Framework “Plan_v6” (PDF)', 'energy_burden', 'Source of the 10%-of-income Council hardship target used as burden threshold context.'],
  ['Endeavour Energy postcode consumption workbook (xlsx)', 'energy_burden', 'Real postcode-level weekly kWh, replacing the old flat LGA-wide bill estimate.'],
  ['APVI: Installations_Capacity_by_suburb_-_All_Time.csv', 'has_rooftop_solar / no_solar_access', 'Per-suburb solar installs + capacity, all 65 localities, since 2001.'],
  ['APVI: Installations_Capacity_by_Suburb_-_FY_24-25.csv', 'has_rooftop_solar / no_solar_access', 'Same localities, used to recompute the 36.4% LGA-wide density.'],
  ['APVI: Total_System_Capacity_-_Wollongong_-_All_Time.csv', 'not wired into any field', 'LGA-wide monthly totals — kept for Council-level monitoring only.'],
  ['APVI: Total_System_Installations_-_Wollongong_-_All_Time.csv', 'not wired into any field', 'LGA-wide monthly totals — kept for Council-level monitoring only.'],
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
          ['66', 'Wollongong localities resolved for area disadvantage'],
          ['27', 'real / user-provided sources cited'],
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
            { cells: ['SA2', '3,000–25,000 (avg ~10,000)', 'Yes — e.g. “Port Kembla – Warrawong”', '2,473', 'Income sampling base unit (§03)'] },
            { cells: ['SAL', 'Varies — matches real suburb boundaries', 'Yes — real suburb names, e.g. “Warrawong”', '~15,300', 'Area-disadvantage base unit, primary source (§02)'] },
            { cells: ['LGA', 'Wollongong: 214,564', 'Yes', '—', 'Reference income, dwelling counts, fallback default (§02)'] },
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
          <Code>HouseholdInputs</Code> in <Code>scoring_and_tiered_allocation.py</Code> has no <Code>sa2_id</Code> or
          <Code>suburb</Code> field of its own — the geography assignment happens one layer upstream, in whatever generates
          the five pre-normalized scores. A household carries two independent geography draws: an SA2 (weighted by real
          dwelling share, §03) for <Code>income_gap</Code>, and a real suburb name for <Code>area_disadvantage</Code> /
          <Code>is_high_need_area</Code> (§02) — these are two different ABS geographies, not the same draw reused twice.
          <Code>compute_hardship_score()</Code> itself never sees a geography code — only the derived, pre-normalized
          numbers.
        </p>
      </Section>

      {/* 02 — Area disadvantage */}
      <Section id="sec-02" num="02" title="Area disadvantage — real suburb-level SEIFA, tiered by source" badge={<Badge kind="real">real</Badge>}>
        <p className="mb-4">
          Wollongong LGA’s overall SEIFA score (1,000, by construction — the index is normalised to a national mean of 1,000
          <Cite id="abs-seifa-methodology" />) is a population-weighted average and hides real internal spread. Rather than
          rely on one geography, <Code>area_disadvantage</Code> and <Code>is_high_need_area</Code> are resolved by checking
          two independent, real, ABS-Census-2021-derived suburb datasets in a fixed priority order, falling back to an
          LGA-wide default only when neither has a match:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 mb-4">
          <li><strong>Tier 1 — ABS SEIFA by SAL</strong> (Suburbs and Localities), a live ABS API <Cite id="abs-seifa-sal-api" /> — checked first.</li>
          <li><strong>Tier 2 — profile.id’s SEIFA by profile area</strong> <Cite id="profile-id-seifa-sal" /> — used only for a suburb Tier 1 doesn’t individually cover.</li>
          <li><strong>Tier 3 — Wollongong LGA-wide default</strong> — used only if neither tier has a match.</li>
        </ol>
        <div className="bg-black/5 rounded-2xl px-5 py-4 font-mono text-[0.78rem] mb-4 overflow-x-auto whitespace-pre">
{`FUNCTION resolve_area_disadvantage(suburb):
    abs_row = ABS_SAL_DECILE_BY_SUBURB.get(suburb)      // Tier 1 — live ABS API, decile 1–10
    IF abs_row EXISTS:
        RETURN { area_disadvantage: (10 − abs_row.decile) / 9,
                 is_high_need_area: abs_row.decile == 1,
                 source: "ABS SAL" }

    pid_row = getSeifaForSuburb(suburb)                  // Tier 2 — profile.id, percentile 1–100
    IF NOT pid_row.isLgaFallback:
        RETURN { area_disadvantage: (100 − pid_row.percentile) / 99,
                 is_high_need_area: pid_row.percentile <= 10,
                 source: "profile.id" }

    RETURN {                                             // Tier 3 — final fallback
        area_disadvantage: (100 − WOLLONGONG_LGA_SEIFA_IRSD.percentile) / 99,
        is_high_need_area: false,
        source: "LGA-wide default"
    }`}
        </div>
        <p className="mb-4">
          Each tier is evaluated in its own source’s native scale (decile ÷9, percentile ÷99) rather than forcing both onto
          one grain — a 10-bucket figure isn’t made to look as precise as a 100-point one just for convenience. Why two real
          sources instead of one: profile.id’s own suburb boundaries occasionally combine a disadvantaged suburb with a
          considerably more comfortable neighbour into one blended &ldquo;profile area&rdquo; (see the Unanderra example
          below) — ABS SAL draws that specific boundary differently and is checked first for exactly that reason.
        </p>
        <Table
          head={['Tier', 'Source', 'Localities resolved (of 66)', 'Notes']}
          rows={[
            ['1', 'ABS SAL', '63', 'Includes Unanderra as its own suburb, decile 1'],
            ['2', 'profile.id', '0', 'ABS SAL already covers every suburb profile.id also covers'],
            ['3', 'LGA-wide default', '3', 'Avon, Cordeaux, Woronora Dam — real SAL localities with no published population/IRSD (negligible-population reservoir/catchment areas)'],
          ].map((r) => ({ cells: r }))}
          note="How often each tier actually fires, checked against the live ABS SAL query — spatially matched against Wollongong LGA, then cross-checked suburb-by-suburb against this page's own suburb list. One correction this cross-check surfaced: “Lindendale” was earlier assumed to be a Tier-3 fallback case — it in fact has a real ABS SAL score (decile 7) and is counted in Tier 1 above."
        />
        <Callout tone="good" icon={<CheckCircle2 size={18} />}>
          <strong>Implemented.</strong> This tiered resolution is live: <Code>createAreaDisadvantageResolver()</Code> and the
          real <Code>ABS_SAL_DECILE_BY_SUBURB</Code> dataset (fetched from the same live ABS API cited above) are in
          <Code>algorithms/policies/wollongongEquityDataV3.js</Code>, and <Code>deriveAreaDisadvantageFactor()</Code> in
          <Code>algorithms/src/scoring/deriveHardshipFactors.js</Code> now calls it — replacing the direct
          <Code>getSeifaForSuburb()</Code> call that previously ran only Tier 2. <Code>wollongongDemoHouseholds.js</Code> and
          <Code>explainAllocation.js</Code> were updated to match; 175 tests pass, including dedicated coverage of all three
          tiers (Tier 2 via injected synthetic fixtures, since real Wollongong data never reaches it) and the exact Unanderra
          regression this fix was for.
        </Callout>

        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Tier 1 — ABS SEIFA by SAL</h3>
        <p className="mb-4">
          ABS publishes SEIFA 2021 at Suburbs and Localities (SAL) level <Cite id="abs-seifa-sal-api" /> — real suburb
          boundaries, not a blended multi-suburb group. Spatially matched against Wollongong LGA’s boundary
          (<Cite id="abs-asgs-boundaries" />), 63 suburbs return a valid IRSD score directly.
        </p>
        <Table
          head={['Suburb', 'Population', 'IRSD score', 'Decile']}
          rows={[
            ['Warrawong', '4,659', '764.6', '1'],
            ['Cringila', '2,156', '796.3', '1'],
            ['Bellambi', '4,039', '845.7', '1'],
            ['Koonawarra', '3,732', '868.4', '1'],
            ['Berkeley', '7,798', '885.1', '1'],
            ['Unanderra', '5,476', '890.5', '1'],
          ].map((r) => ({ cells: r }))}
          note="Wollongong LGA · decile-1 suburbs at SAL level (most disadvantaged nationally). Full 63-suburb table in algorithms/policies/wollongongEquityDataV3.js."
        />
        <p className="mb-4">
          <Code>isHighNeedAreaBySeifa()</Code>-equivalent behaviour at Tier 1 independently reproduces the five suburbs
          Council’s own Energy Equity Assessment names as priority areas — Warrawong, Cringila, Bellambi, Koonawarra,
          Berkeley — and adds a 6th, Unanderra, which Council’s own report doesn’t name individually. That agreement
          between an independent ABS-derived statistic and the Council’s own suburb-level fieldwork is a genuine
          cross-validation, not a coincidence.
        </p>
        <Callout tone="good" icon={<CheckCircle2 size={18} />}>
          <strong>Why Unanderra needs suburb-level (SAL), not a blended group.</strong> An earlier SA2-level pull grouped
          Unanderra with Mount Kembla into one &ldquo;Unanderra – Mount Kembla&rdquo; unit at decile 5 — Mount Kembla’s
          much better-off numbers pulled the blended score up, hiding Unanderra’s real disadvantage entirely. Even
          profile.id’s own suburb-level table (Tier 2) blends Unanderra with Kembla Grange into &ldquo;Unanderra - Kembla
          Grange&rdquo; at percentile 14 — just outside the high-need threshold. Only Tier 1’s SAL boundary keeps Unanderra
          as its own suburb, correctly at decile 1. This is exactly why Tier 1 is checked first: whichever real,
          ABS-sourced geography draws suburb lines without blending disadvantaged and comfortable areas together wins.
        </Callout>

        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Tier 2 — profile.id, fallback</h3>
        <p className="mb-4">
          profile.id.com.au’s Wollongong City community profile report <Cite id="profile-id-seifa-sal" /> compiles the same
          underlying ABS Census 2021 SEIFA data as Tier 1, published at its own named &ldquo;profile area&rdquo; grain. The
          live profile.id site blocks automated fetches (confirmed this session — a direct fetch attempt returned HTTP
          403), so this table was taken from a user-exported PDF rather than an API — recorded verbatim from pp.102–103
          rather than re-derived, so every figure is directly checkable against that source. In practice this tier resolves
          0 of the 66 localities used on this page (see the table above) — Tier 1 already covers every suburb profile.id
          also covers — so it exists purely as a documented fallback, not because it currently changes any answer.
        </p>
        <Table
          head={['Profile area', 'IRSD index', 'National percentile']}
          rows={[
            ['Stanwell Park - Stanwell Tops - Coalcliff and surrounds', '1,111.0', '99'],
            ['Austinmer', '1,101.7', '97'],
            ['Wongawilli - Dombarton - Huntley', '1,100.8', '97'],
            ['Wombarra - Coledale - Scarborough - Clifton', '1,098.7', '96'],
            ['Mount Ousley - Mount Pleasant', '1,092.8', '95'],
            ['Thirroul', '1,091.6', '94'],
            ['Cordeaux Heights - Mount Kembla - Kembla Heights', '1,083.5', '92'],
            ['Helensburgh - Lilyvale - Otford', '1,079.5', '90'],
            ['Farmborough Heights', '1,070.9', '86'],
            ['Haywards Bay - Yallah - Marshall Mount', '1,069.5', '85'],
            ['Bulli', '1,060.0', '79'],
            ['Mangerton', '1,057.7', '78'],
            ['Figtree', '1,054.1', '75'],
            ['Keiraville - Mount Keira', '1,043.8', '68'],
            ['Horsley', '1,035.7', '63'],
            ['Woonona - Russell Vale', '1,027.8', '58'],
            ['Kanahooka', '1,009.3', '47'],
            ['Balgownie - Tarrawanna - Fernhill', '1,008.7', '47'],
            ['North Wollongong', '1,008.0', '46'],
            ['Towradgi', '1,004.6', '44'],
            ['Wollongong', '1,003.4', '44'],
            ['East Corrimal', '1,003.2', '44'],
            ['West Wollongong', '998.2', '41'],
            ['Corrimal', '996.8', '40'],
            ['Coniston - Mount Saint Thomas', '982.9', '33'],
            ['Fairy Meadow', '976.9', '30'],
            ['Dapto - Brownsville', '971.7', '27'],
            ['Cleveland - Avondale', '971.6', '27'],
            ['Gwynneville', '950.3', '20'],
            ['Windang - Primbee', '939.8', '17'],
            ['Lake Heights', '936.1', '16'],
            ['Port Kembla - Spring Hill', '930.5', '15'],
            ['Unanderra - Kembla Grange', '927.2', '14'],
            ['Berkeley', '885.1', '7'],
            ['Koonawarra', '868.4', '6'],
            ['Bellambi', '845.7', '5'],
            ['Cringila', '796.3', '3'],
            ['Warrawong', '764.6', '2'],
          ].map((r) => ({ cells: r }))}
          note="ABS SEIFA IRSD 2021 by profile.id profile area · Wollongong City · full published table, pp.102–103."
        />
        <p className="mb-4">
          Short suburb names used elsewhere in the codebase resolve to a compound profile-area name via an explicit,
          reviewable alias table rather than fuzzy string matching:
        </p>
        <Table
          head={['Short name', 'Resolves to profile area']}
          rows={[
            ['Dapto', 'Dapto - Brownsville'],
            ['Cordeaux Heights', 'Cordeaux Heights - Mount Kembla - Kembla Heights'],
            ['Coniston', 'Coniston - Mount Saint Thomas'],
            ['Unanderra', 'Unanderra - Kembla Grange'],
            ['Port Kembla', 'Port Kembla - Spring Hill'],
            ['Woonona', 'Woonona - Russell Vale'],
          ].map((r) => ({ cells: r }))}
        />

        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Tier 3 — LGA-wide default</h3>
        <p>
          Wollongong City LGA-wide IRSD sits at index 999.8, percentile 42 <Cite id="profile-id-seifa-lga" /> — just below
          the national and NSW medians. Used only for the 5 negligible-population localities neither tier individually
          covers, this is a genuine &ldquo;roughly average, slightly disadvantaged&rdquo; default, not an arbitrary
          baseline invented for this project.
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
        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Median income — two real sources disagree slightly</h3>
        <p className="mb-2">Two independent ABS Census 2021 compilations of Wollongong LGA’s median weekly household income disagree slightly:</p>
        <Table
          head={['Source', 'Median ($/week)']}
          rows={[
            ['ABS QuickStats (LGA18450) — used above as reference_income', '1,682'],
            ['profile.id Wollongong City community profile', '1,637'],
          ].map((r) => ({ cells: r }))}
          note={<>~2.7% gap, most likely rounding or a geography-boundary-version difference between compilations rather than a real disagreement about the underlying population <Cite id="abs-quickstats-wollongong" /> <Cite id="profile-id-seifa-lga" />. income_gap continues to use $1,682 — switching to $1,637 is a separate, not-yet-made decision.</>}
        />
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
            ['is_high_need_area', 'override → 1.0', 'Area-level override. 1 if the household’s suburb resolves to high-need under the tiered ABS-SAL/profile.id/LGA-default rule in §02 (independently reproduces Council’s 5 named priority suburbs, plus Unanderra). Soft ceiling by default (HIGH_NEED_AREA_IS_HARD_OVERRIDE = False) — forces the score to 1.0 but still competes inside the normal weighted pool, rather than jumping the queue like life_support_flag does.'],
            ['income_gap', '0.30', '(reference_income − household_income) / reference_income, clipped to 0–1. reference_income = Wollongong LGA median, $1,682/wk (§03).'],
            ['area_disadvantage', '0.25', 'Tiered ABS-SAL/profile.id/LGA-default resolution (§02): (10 − decile)/9 at Tier 1, (100 − percentile)/99 at Tiers 2–3. Only reached for households not already caught by is_high_need_area.'],
            ['payment_difficulty', '0.20', 'Bernoulli draw from a logistic function of risk_index = 0.5×income_gap + 0.5×area_disadvantage, calibrated so the population average = 1.8% (real EAPA rate, §04). See worked example below.'],
            ['energy_burden', '0.15', 'clip((bill_to_income_ratio − 0.06) / 0.06, 0, 1) — bill estimate uses the household’s own postcode’s real weekly kWh (Endeavour Energy consumption workbook, §08) against the ECA’s 6%-of-income hardship threshold.'],
            ['no_solar_access', '0.10', '1 if the household has no rooftop solar, else 0 — drawn from real per-suburb APVI installation/capacity data (§08), not a placeholder rate.'],
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

        <h3 className="font-bold mt-6 mb-2 text-[0.95rem]">Council-supplied datasets → which field each one feeds</h3>
        <p className="mb-4">
          Two Council PDFs, one Endeavour Energy workbook, and four Australian PV Institute (APVI) exports were supplied
          directly for this project <Cite id="wollongong-equity-assessment" /> <Cite id="wollongong-equity-framework" /> <Cite id="endeavour-postcode-workbook" /> <Cite id="apvi-exports" /> —
          seven datasets in total. Below is exactly which field(s) each one actually feeds, including the two that don’t
          feed any field at all, disclosed rather than left implicit.
        </p>
        <Table
          head={['Dataset', 'Field(s) it feeds', 'How']}
          rows={COUNCIL_DATASETS.map((r) => ({ cells: r }))}
        />
        <p className="text-[0.8rem] text-[var(--muted)] mt-2">
          <Code>has_rooftop_solar</Code> / <Code>no_solar_access</Code> now has a real dataset behind it (the two APVI
          installs/capacity exports above) — previously flagged in this dictionary as &ldquo;not pulled yet.&rdquo; The
          remaining disclosed gap is measurement precision, not missing data: per-suburb solar is expressed as capacity per
          1,000 residents (LGA-wide benchmark 724 kW/1,000 residents; Warrawong, Gwynneville and Bellambi sit furthest
          below it at 56–60% of that benchmark), because no suburb-level dwelling-count table exists in bulk form to
          compute a true &ldquo;% of houses with solar&rdquo; denominator. A suburb with unusually high population density
          will read as lower per-capita solar even at an identical rooftop-installation rate — treat the ranking as
          directionally reliable, not as a precise density percentage per suburb.
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
          <li><strong>SEIFA is ordinal and area-level.</strong> A well-off household in a high-need suburb still inherits
            that suburb’s score under <Code>is_high_need_area</Code>, and a struggling household in a comfortable suburb
            does not get that override — this is a deliberate design tradeoff (§07), not an oversight.</li>
          <li><strong>Cross-checking live ABS data against this page’s own suburb list surfaced one correction.</strong>
            &ldquo;Lindendale&rdquo; was assumed to have no ABS SAL score and to fall to the LGA-wide default — it in fact
            has a real score (decile 7) and resolves via Tier 1 like any other suburb (§02). Caught only because the
            resolver’s data was built directly from a live re-query rather than trusted from an earlier, unverified
            suburb list.</li>
          <li><strong>Per-capita solar is not the same as &ldquo;% of houses with solar.&rdquo;</strong> No suburb-level
            dwelling-count table exists in bulk form, so <Code>no_solar_access</Code>’s real APVI data is expressed as
            capacity per 1,000 residents (§08) — a suburb with unusually high population density will read as lower
            per-capita solar even at an identical installation rate.</li>
          <li><strong>Median income has two disagreeing real sources.</strong> ABS QuickStats gives $1,682/wk, profile.id
            gives $1,637/wk for the same LGA (§03) — a ~2.7% gap, most likely a compilation/boundary-version difference.
            income_gap uses $1,682; switching is a separate, not-yet-made decision.</li>
          <li><strong>Renter status and language access are named barriers with no field yet.</strong> Both Council
            documents cite renters and limited-English-proficiency households as structurally locked out of solar/energy
            literacy regardless of income — no <Code>renter_barrier</Code> or <Code>language_access</Code> field exists in
            §07’s formula today (§08).</li>
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
          <Badge kind="userProvided">User-provided</Badge> means the source is a real document or dataset export supplied
          directly by the team for this project — not something fetchable at a public URL, so it can’t be independently
          re-checked here, only cited by name and page/table reference (see §08’s dataset table).
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
                    {r.href ? (
                      <a href={r.href} target="_blank" rel="noreferrer" className="text-[#050505] no-underline hover:underline hover:text-[#0071e3] inline-flex items-start gap-1">
                        {r.text} <ExternalLink size={12} className="shrink-0 mt-1" />
                      </a>
                    ) : (
                      <span className="text-[#050505]">{r.text}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    {r.status === 'confirmed' ? <Badge kind="real">confirmed live</Badge> : r.status === 'user-provided' ? <Badge kind="userProvided">user-provided</Badge> : <Badge kind="assumption">located</Badge>}
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
        (&ldquo;located&rdquo;), a document or export supplied directly by the team (&ldquo;user-provided,&rdquo; §08), or
        is explicitly flagged as a disclosed modelling assumption. §02’s tiered ABS/profile.id resolution is implemented
        and tested — see its own implementation-status callout. No household-level figure in this project is a real,
        observed individual — every synthetic household is generated from real area-level distributions, never real
        personal data.
      </p>
    </>
  );
}
