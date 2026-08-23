'use client';

import { useMemo, useState } from 'react';
import { Beaker, BookOpen, Lock, RefreshCw, ShieldAlert } from 'lucide-react';

import { computeHardshipScore, computePriorityWeight, overrideReason } from '../../algorithms/src/scoring/hardshipScore.js';
import { allocateWithReserve } from '../../algorithms/src/allocation/nashWelfareSinglePool.js';
import { HARDSHIP_POLICY_V1 } from '../../algorithms/policies/hardshipPolicyV1.js';
import { SAMPLE_HOUSEHOLDS_HARDSHIP, SAMPLE_POOL_KWH, SAMPLE_RESERVE_KWH, SAMPLE_CAP_KWH } from '../../algorithms/fixtures/sampleHouseholds.js';

const CRITERIA = [
  ['income_gap', 'Income gap', 0.3],
  ['area_disadvantage', 'Area disadvantage', 0.25],
  ['payment_difficulty', 'Payment difficulty', 0.2],
  ['energy_burden', 'Energy burden', 0.15],
  ['no_solar_access', 'No solar access', 0.1],
];

function cloneFixtures() {
  return SAMPLE_HOUSEHOLDS_HARDSHIP.map((h) => ({ ...h, capKwh: SAMPLE_CAP_KWH }));
}

function readStoredJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function factor(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function requestToHousehold(request) {
  return {
    id: request.recipient_id,
    name: `${request.recipient_id} · ${request.suburb}`,
    suburb: request.suburb,
    life_support_flag: request.life_support_flag ? 1 : 0,
    is_high_need_area: request.is_high_need_area ? 1 : 0,
    income_gap: factor(request.income_gap),
    area_disadvantage: factor(request.area_disadvantage),
    payment_difficulty: factor(request.payment_difficulty),
    energy_burden: factor(request.energy_burden),
    no_solar_access: factor(request.no_solar_access),
    capKwh: Math.max(0, Number(request.demandCapKwh) || 0),
  };
}

function readSubmittedFormData() {
  const contribution = readStoredJson('sargeContribution', null);
  if (!contribution?.confirmed) {
    return { ready: false, message: 'No confirmed donation yet. Complete the final confirmation in the donor form.' };
  }

  const poolKwh = Number(contribution.contributed_kwh);
  if (!Number.isFinite(poolKwh) || poolKwh <= 0) {
    return { ready: false, message: 'The confirmed donation does not contain a usable contributed kWh value.' };
  }

  const storedRequests = readStoredJson('sargeSupportRequests', []);
  const latestRequest = readStoredJson('sargeSupportRequest', null);
  const requests = Array.isArray(storedRequests) && storedRequests.length > 0
    ? storedRequests
    : latestRequest ? [latestRequest] : [];
  const eligibleRequests = requests.filter(
    (request) => request?.consent === true && request.lives_in_wollongong_lga === true
  );

  if (eligibleRequests.length === 0) {
    return { ready: false, message: 'Donation found, but no eligible submitted support requests were found.' };
  }

  return {
    ready: true,
    households: eligibleRequests.map(requestToHousehold),
    poolKwh,
    donorId: contribution.donor_id,
    message: `${poolKwh.toFixed(1)} kWh confirmed by ${contribution.donor_id} · ${eligibleRequests.length} support request${eligibleRequests.length === 1 ? '' : 's'} loaded`,
  };
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01, suffix = '' }) {
  return (
    <label className="pa-slider">
      <span>
        {label}
        <b>{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 1) : value}{suffix}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function HouseholdCard({ household, onChange }) {
  const score = computeHardshipScore(household, HARDSHIP_POLICY_V1);
  const reason = overrideReason(household, HARDSHIP_POLICY_V1);
  return (
    <article className="pa-card">
      <div className="pa-card-head">
        <strong>{household.name}</strong>
        <span className="pa-score">{score.toFixed(2)}</span>
      </div>
      <div className="pa-flags">
        <label className={`pa-flag ${household.life_support_flag ? 'on' : ''}`}>
          <input type="checkbox" checked={!!household.life_support_flag} onChange={(e) => onChange({ ...household, life_support_flag: e.target.checked ? 1 : 0 })} />
          Life-support register
        </label>
        <label className={`pa-flag ${household.is_high_need_area ? 'on' : ''}`}>
          <input type="checkbox" checked={!!household.is_high_need_area} onChange={(e) => onChange({ ...household, is_high_need_area: e.target.checked ? 1 : 0 })} />
          Council high-need area
        </label>
      </div>
      {reason && <div className="pa-override"><ShieldAlert size={14} /> Override active — {reason} forces the score to 1.00</div>}
      <div className={`pa-criteria ${reason ? 'dimmed' : ''}`}>
        {CRITERIA.map(([key, label, weight]) => (
          <Slider key={key} label={`${label} (×${weight.toFixed(2)})`} value={household[key]} onChange={(v) => onChange({ ...household, [key]: v })} />
        ))}
      </div>
      <div className="pa-demand-cap">
        <Slider label="Support allocation cap" value={household.capKwh} onChange={(v) => onChange({ ...household, capKwh: v })} min={0} max={20} step={0.5} suffix=" kWh-eq" />
      </div>
    </article>
  );
}

export default function PriorityAllocation() {
  const [initialFormData] = useState(readSubmittedFormData);
  const [tab, setTab] = useState('demo');
  const [households, setHouseholds] = useState(() => initialFormData.ready ? initialFormData.households : cloneFixtures());
  const [pool, setPool] = useState(() => initialFormData.ready ? initialFormData.poolKwh : SAMPLE_POOL_KWH);
  const [reserve, setReserve] = useState(() => initialFormData.ready ? 0 : SAMPLE_RESERVE_KWH);
  const [sourceMode, setSourceMode] = useState(() => initialFormData.ready ? 'forms' : 'sample');
  const [integrationMessage, setIntegrationMessage] = useState(initialFormData.message);
  const [result, setResult] = useState(null);

  const scored = useMemo(
    () => households.map((h) => ({ id: h.id, name: h.name, weight: computePriorityWeight(h, HARDSHIP_POLICY_V1) })),
    [households]
  );

  function updateHousehold(next) {
    setHouseholds((prev) => prev.map((h) => (h.id === next.id ? next : h)));
    setResult(null);
  }

  function runAllocation() {
    const poolHouseholds = scored.map((h) => {
      const household = households.find((candidate) => candidate.id === h.id);
      return { id: h.id, weight: h.weight, capKwh: household?.capKwh ?? 0 };
    });
    setResult(allocateWithReserve(poolHouseholds, pool, reserve));
  }

  function loadSubmittedForms() {
    const formData = readSubmittedFormData();
    setIntegrationMessage(formData.message);
    if (!formData.ready) return;
    setHouseholds(formData.households);
    setPool(formData.poolKwh);
    setReserve(0);
    setSourceMode('forms');
    setResult(null);
  }

  return (
    <section className="cd-panel pa-root">
      <div className="cd-panel-head">
        <div>
          <p className="cd-kicker">Recipient allocation</p>
          <h2>Priority allocation</h2>
          <p>How verified contribution units are scored and allocated across eligible support requests.</p>
        </div>
        <div className="pa-tabs">
          <button className={tab === 'demo' ? 'active' : ''} onClick={() => setTab('demo')}><Beaker size={14} /> Live simulation</button>
          <button className={tab === 'methodology' ? 'active' : ''} onClick={() => setTab('methodology')}><BookOpen size={14} /> Methodology &amp; sources</button>
        </div>
      </div>

      {tab === 'demo' ? (
        <div className="pa-demo">
          <p className="pa-note">
            This runs the real allocation module (<code>algorithms/src/scoring/hardshipScore.js</code> and{' '}
            <code>algorithms/src/allocation/nashWelfareSinglePool.js</code>) directly in the browser for demonstration —
            per <code>council-frontend/README.md</code>, a production build must move this calculation server-side and
            treat this panel as presentational only. Allocation amounts are kWh-equivalent accounting units; they do not
            represent physical electricity delivery or retailer settlement.
          </p>

          <div className={`pa-form-bridge ${sourceMode === 'forms' ? 'ready' : ''}`}>
            <div>
              <strong>{sourceMode === 'forms' ? 'Using submitted form data' : 'Using sample households'}</strong>
              <span>{integrationMessage}</span>
            </div>
            <button className="cd-secondary" type="button" onClick={loadSubmittedForms}>
              <RefreshCw size={15} /> Load submitted form data
            </button>
          </div>

          <div className="pa-cards">
            {households.map((h) => (
              <HouseholdCard key={h.id} household={h} onChange={updateHousehold} />
            ))}
          </div>

          <div className="pa-pool-controls">
            <Slider label="Contribution pool" value={pool} onChange={setPool} min={0} max={40} step={0.5} suffix=" kWh-eq" />
            <Slider label="Protected reserve" value={reserve} onChange={setReserve} min={0} max={Math.max(15, pool)} step={0.5} suffix=" kWh-eq" />
            <button className="cd-primary" disabled={households.length === 0 || pool <= 0} onClick={runAllocation}>Run allocation</button>
          </div>

          {result && (
            <div className="pa-results">
              <div className="cd-table-scroll">
                <table>
                  <thead><tr><th>Household</th><th>Score</th><th>Support cap</th><th>Allocated equivalent</th><th>Status</th></tr></thead>
                  <tbody>
                    {scored.map((h) => {
                      const amount = result.allocationKwh[h.id] ?? 0;
                      const lock = result.lockOrder.find((e) => e.id === h.id);
                      return (
                        <tr key={h.id}>
                          <td><strong>{h.name}</strong></td>
                          <td>{h.weight.toFixed(3)}</td>
                          <td>{(households.find((candidate) => candidate.id === h.id)?.capKwh ?? 0).toFixed(1)} kWh-eq</td>
                          <td>{amount.toFixed(2)} kWh-eq</td>
                          <td>
                            <span className={`cd-status ${lock?.reason === 'cap' ? 'cd-status--online' : 'cd-status--monitor'}`}>
                              <i />
                              {lock?.reason === 'cap' ? 'Locked at ceiling' : 'Settled — pool exhausted'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="pa-summary">
                <span><Lock size={14} /> Reserve held back: <strong>{result.reserveKwh.toFixed(2)} kWh-eq</strong></span>
                <span>Allocated: <strong>{result.consumedTotalKwh.toFixed(2)} kWh-eq</strong></span>
                <span>Unallocated: <strong>{result.leftoverKwh.toFixed(2)} kWh-eq</strong></span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Methodology />
      )}
    </section>
  );
}

const REFERENCES = [
  { id: 'eisenberg-gale-1959', text: 'Eisenberg, E. & Gale, D. (1959). "Consensus of Subjective Probabilities: The Pari-Mutuel Method." The Annals of Mathematical Statistics, 30(1), 165–168.', href: 'https://projecteuclid.org/euclid.aoms/1177706369' },
  { id: 'kelly-maulloo-tan-1998', text: 'Kelly, F.P., Maulloo, A.K. & Tan, D.K.H. (1998). "Rate Control for Communication Networks: Shadow Prices, Proportional Fairness and Stability." Journal of the Operational Research Society, 49(3), 237–252.', href: 'https://www.jstor.org/stable/3010473' },
  { id: 'nash-1950', text: 'Nash, J. (1950). "The Bargaining Problem." Econometrica, 18(2), 155–162.', href: 'https://www.econometricsociety.org/publications/econometrica/1950/04/01/bargaining-problem' },
  { id: 'caragiannis-2019', text: 'Caragiannis, I., Kurokawa, D., Moulin, H., Procaccia, A.D., Shah, N. & Wang, J. (2019). "The Unreasonable Fairness of Maximum Nash Welfare." ACM Transactions on Economics and Computation, 7(3), Article 12.', href: 'https://dl.acm.org/doi/10.1145/3355902' },
  { id: 'aemo-power-system', text: 'AEMO. Power System Requirements — reference paper (RERT, spinning reserve).', href: 'https://www.aemo.com.au/-/media/Files/Electricity/NEM/Security_and_Reliability/Power-system-requirements.pdf' },
  { id: 'aemo-submission', text: 'AEMO submission on reserve mechanisms.', href: 'https://www.aemc.gov.au/sites/default/files/2025-12/AEMO%20submission%20(1).pdf' },
  { id: 'origin-fcas', text: 'Origin Energy. "Frequency Control Ancillary Services (FCAS)."', href: 'https://www.originenergy.com.au/enterprise/energy-management-solutions/frequency-control-ancillary-services-fcas/' },
  { id: 'nash-bargaining-topic', text: 'ScienceDirect / Elsevier Topics. "Nash Bargaining Solution" (disagreement point, reservation utility).', href: 'https://www.sciencedirect.com/topics/engineering/nash-bargaining-solution' },
  { id: 'cisco-wfq', text: 'Cisco. "QoS: Congestion Management Configuration Guide — Configuring Weighted Fair Queueing."', href: 'https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/15-mt/qos-conmgt-15-mt-book/qos-conmgt-cfg-wfq.html' },
];

function Cite({ id }) {
  const index = REFERENCES.findIndex((r) => r.id === id) + 1;
  return <a className="pa-cite" href={`#ref-${id}`}>[{index}]</a>;
}

function Methodology() {
  return (
    <article className="pa-article">
      <h3>How the priority score is calculated</h3>
      <p>
        Every household’s priority score comes from <code>compute_hardship_score()</code>: a weighted sum of five
        pre-normalized hardship factors (income gap ×0.30, area disadvantage ×0.25, payment difficulty ×0.20, energy
        burden ×0.15, no-solar-access ×0.10, summing to 1.00), unless <code>life_support_flag</code> or{' '}
        <code>is_high_need_area</code> is set — either forces the score straight to 1.00, a hard override, not just a
        maximum input.
      </p>

      <h3>Why Nash welfare, not a simpler split</h3>
      <p>
        Splitting the pool by raw score alone would let one high-priority household take everything. Instead, the
        allocator maximizes the weighted sum of log-utilities across households — the Eisenberg–Gale convex
        program <Cite id="eisenberg-gale-1959" /> — which Eisenberg and Gale proved is identical to the allocation a
        perfectly efficient market with equal purchasing power would reach on its own. The same objective, under the
        name proportional fairness, is the rule real communication networks use to share bandwidth today{' '}
        <Cite id="kelly-maulloo-tan-1998" />. It is also the unique rule satisfying Nash’s four bargaining
        axioms — Pareto optimality, symmetry, scale invariance, and independence of irrelevant alternatives{' '}
        <Cite id="nash-1950" /> — and the modern algorithmic fair-division literature has shown it combines
        efficiency with strong envy-freeness guarantees no simpler rule achieves <Cite id="caragiannis-2019" />.
      </p>

      <h3>Why an emergency reserve sits in front of the split</h3>
      <p>
        A fixed slice of the pool is held back before the proportional split runs, for capacity that should never
        pass through the normal priority mechanism. This mirrors AEMO’s Reliability and Emergency Reserve Trader
        mechanism and spinning-reserve capability, held ready outside normal dispatch <Cite id="aemo-power-system" />
        {' '}<Cite id="aemo-submission" /> <Cite id="origin-fcas" />; it mirrors the Nash bargaining solution’s own
        starting point, a guaranteed disagreement-point utility before anything is negotiated over{' '}
        <Cite id="nash-bargaining-topic" />; and it mirrors weighted fair queueing’s guaranteed-minimum traffic
        classes in network scheduling <Cite id="cisco-wfq" />. Three unrelated domains converging on the same
        reserve-then-fair-share shape is why this is treated as standard practice here, not a bespoke addition.
      </p>

      <h3>References</h3>
      <ol className="pa-refs">
        {REFERENCES.map((r) => (
          <li key={r.id} id={`ref-${r.id}`}>
            <a href={r.href} target="_blank" rel="noreferrer">{r.text}</a>
          </li>
        ))}
      </ol>
    </article>
  );
}
