'use client';

import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { DataProvenanceBody } from './DataProvenance';

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
  return <a href={`#ref-${id}`} className="text-[#0071e3] font-semibold no-underline hover:underline text-[0.82em]">[{index}]</a>;
}

export default function Methodology() {
  return (
    <main className="page" style={{ '--muted': '#5c6268' }}>
      <NavLink to="/overview" className="inline-flex items-center gap-1 text-sm font-bold mb-6"><ChevronLeft size={16} /> Back to Sarge</NavLink>
      <div className="page-title"><p className="eyebrow">Algorithm</p><h1>Methodology &amp; sources</h1></div>

      <p className="max-w-2xl text-[15px] text-[var(--muted)] mb-8">
        How the priority score behind the community pool allocation is calculated, and why the specific
        algorithm and safeguards were chosen — with every claim sourced inline and listed in full below.
      </p>

      <article className="bg-white rounded-[28px] p-7 max-w-3xl leading-relaxed text-[15px]">
        <h2 className="text-lg font-bold mt-0 mb-2">How the priority score is calculated</h2>
        <p className="mb-4">
          Every household’s priority score comes from <code className="bg-black/5 rounded px-1.5 py-0.5 text-[0.85em]">compute_hardship_score()</code>: a
          weighted sum of five pre-normalized hardship factors (income gap ×0.30, area disadvantage ×0.25,
          payment difficulty ×0.20, energy burden ×0.15, no-solar-access ×0.10, summing to 1.00), unless{' '}
          <code className="bg-black/5 rounded px-1.5 py-0.5 text-[0.85em]">life_support_flag</code> or{' '}
          <code className="bg-black/5 rounded px-1.5 py-0.5 text-[0.85em]">is_high_need_area</code> is set —
          either forces the score straight to 1.00, a hard override, not just a maximum input.
        </p>

        <h2 className="text-lg font-bold mt-8 mb-2">Why Nash welfare, not a simpler split</h2>
        <p className="mb-4">
          Splitting the pool by raw score alone would let one high-priority household take everything.
          Instead, the allocator maximizes the weighted sum of log-utilities across households — the
          Eisenberg–Gale convex program <Cite id="eisenberg-gale-1959" /> — which Eisenberg and Gale proved
          is identical to the allocation a perfectly efficient market with equal purchasing power would
          reach on its own. The same objective, under the name proportional fairness, is the rule real
          communication networks use to share bandwidth today <Cite id="kelly-maulloo-tan-1998" />. It is
          also the unique rule satisfying Nash’s four bargaining axioms — Pareto optimality, symmetry,
          scale invariance, and independence of irrelevant alternatives <Cite id="nash-1950" /> — and the
          modern algorithmic fair-division literature has shown it combines efficiency with strong
          envy-freeness guarantees no simpler rule achieves <Cite id="caragiannis-2019" />.
        </p>

        <h2 className="text-lg font-bold mt-8 mb-2">Why an emergency reserve sits in front of the split</h2>
        <p className="mb-4">
          A fixed slice of the pool is held back before the proportional split runs, for capacity that
          should never pass through the normal priority mechanism. This mirrors AEMO’s Reliability and
          Emergency Reserve Trader mechanism and spinning-reserve capability, held ready outside normal
          dispatch <Cite id="aemo-power-system" /> <Cite id="aemo-submission" /> <Cite id="origin-fcas" />;
          it mirrors the Nash bargaining solution’s own starting point, a guaranteed disagreement-point
          utility before anything is negotiated over <Cite id="nash-bargaining-topic" />; and it mirrors
          weighted fair queueing’s guaranteed-minimum traffic classes in network scheduling{' '}
          <Cite id="cisco-wfq" />.
        </p>
        <div className="bg-black/5 rounded-2xl px-5 py-4 text-sm text-[var(--muted)] mb-4">
          Three unrelated domains — power grids, bargaining theory, and network scheduling — converging on
          the same reserve-then-fair-share shape is why this is treated as standard practice here, not a
          bespoke addition.
        </div>

        <h2 className="text-lg font-bold mt-8 mb-3">References</h2>
        <ol className="pl-5 text-sm text-[var(--muted)] space-y-2.5">
          {REFERENCES.map((r) => (
            <li key={r.id} id={`ref-${r.id}`} className="scroll-mt-8">
              <a href={r.href} target="_blank" rel="noreferrer" className="text-[#050505] no-underline hover:underline hover:text-[#0071e3]">{r.text}</a>
            </li>
          ))}
        </ol>
      </article>

      <div className="page-title max-w-4xl" style={{ marginTop: '3rem' }}>
        <p className="eyebrow">Algorithm · Hardship score</p>
        <h1>Data provenance dossier</h1>
      </div>
      <DataProvenanceBody />

      <p className="text-xs text-[var(--muted)] mt-6">
        Implementation: <code className="bg-black/5 rounded px-1.5 py-0.5">algorithms/src/scoring/hardshipScore.js</code> and{' '}
        <code className="bg-black/5 rounded px-1.5 py-0.5">algorithms/src/allocation/nashWelfareSinglePool.js</code>.
      </p>
    </main>
  );
}
