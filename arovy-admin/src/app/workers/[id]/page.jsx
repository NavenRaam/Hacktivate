import { getWorkerById, getWorkerPayoutHistory, trustLabel, eligLabel, planLabel, disruptionTypeLabel, severityLabel, CITY_COLORS } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react'
import TrustRing from '@/components/shared/TrustRing'
import SeverityBar from '@/components/shared/SeverityBar'

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_SHORT = { monday:'M', tuesday:'T', wednesday:'W', thursday:'T', friday:'F', saturday:'S', sunday:'S' }

export default function WorkerDetailPage({ params }) {
  const worker = getWorkerById(params.id)
  if (!worker) notFound()

  const history  = getWorkerPayoutHistory(params.id)
  const tl       = trustLabel(worker.trust_profile.trust_score)
  const el       = eligLabel(worker.eligibility_tier)
  const pl       = planLabel(worker.insurance_plan.plan_tier)
  const cityCol  = CITY_COLORS[worker.city] || '#4F8EF7'

  const maxIncome  = Math.max(...Object.values(worker.baseline_income))
  const totalHistory = history.reduce((s,h) => s + h.payout, 0)

  const rp = worker.risk_profile
  const riskFactors = [
    { label:'Location Risk',      value: rp.location_risk,              weight:0.4 },
    { label:'Temporal Risk',      value: rp.temporal_risk,              weight:0.2 },
    { label:'Exposure Level',     value: rp.exposure_level,             weight:0.2 },
    { label:'Store Unreliability',value: rp.store_reliability_inverse,  weight:0.2 },
  ]

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      <Link href="/workers"
        className="flex items-center gap-1.5 text-sm no-underline"
        style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Workers
      </Link>

      {/* Worker header */}
      <div className="card p-6 stagger-1"
        style={{ background:`radial-gradient(ellipse 50% 70% at 0% 0%, ${cityCol}12, transparent 60%), #0F1521` }}>
        <div className="flex items-start gap-5">
          {/* Trust ring large */}
          <TrustRing score={worker.trust_profile.trust_score} size={72}/>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono" style={{ color:cityCol }}>{worker.city}</span>
              <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.2)' }}>·</span>
              <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>{worker.zone}</span>
            </div>
            <h1 className="font-display font-bold text-3xl text-white mb-1">{worker.name}</h1>
            <p className="text-sm font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>
              {worker.worker_id} · {worker.months_of_service} months · Age {worker.age}
            </p>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`badge ${tl.cls}`}>{tl.text} trust</span>
              <span className={`badge ${pl.cls}`}>{pl.text} plan</span>
              <span className={`badge ${el.cls}`}>{el.text}</span>
              <span className="badge badge-gray">{worker.primary_store_id}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="font-display font-bold text-3xl" style={{ color:'#4F8EF7' }}>
              ₹{Math.round(worker.premium.weekly_premium)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.35)' }}>
              weekly premium
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* Baseline income chart */}
        <div className="card p-5 stagger-2">
          <p className="text-xs font-mono uppercase tracking-widest mb-4"
            style={{ color:'rgba(238,242,255,0.35)' }}>
            Baseline Income · by Day
          </p>
          <div className="flex items-end gap-1.5 h-28">
            {DAY_ORDER.map(day => {
              const val  = worker.baseline_income[day]
              const pct  = (val / maxIncome) * 100
              const isWeekend = day === 'saturday' || day === 'sunday'
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.5)' }}>
                    ₹{val}
                  </span>
                  <div className="w-full rounded-t-md transition-all duration-700"
                    style={{
                      height:`${pct}%`,
                      minHeight:'8px',
                      background: isWeekend
                        ? 'linear-gradient(to top, #4F8EF7, #8B7FED)'
                        : 'rgba(79,142,247,0.35)',
                    }}/>
                  <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>
                    {DAY_SHORT[day]}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] font-mono mt-2" style={{ color:'rgba(238,242,255,0.25)' }}>
            Weekly avg ₹{Math.round(worker.premium.weekly_baseline)}
          </p>
        </div>

        {/* Risk breakdown */}
        <div className="card p-5 stagger-2">
          <p className="text-xs font-mono uppercase tracking-widest mb-1"
            style={{ color:'rgba(238,242,255,0.35)' }}>
            Risk Score Breakdown
          </p>
          <div className="flex items-end gap-2 mb-4">
            <span className="font-display font-bold text-4xl text-white">
              {rp.risk_score}
            </span>
            <span className="text-sm font-mono pb-1"
              style={{ color: rp.risk_score > 0.6 ? '#F5532D' : '#F5A623' }}>
              {rp.risk_score > 0.6 ? 'High' : rp.risk_score > 0.4 ? 'Moderate' : 'Low'} risk
            </span>
          </div>
          <div className="space-y-3">
            {riskFactors.map(f => (
              <div key={f.label}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span style={{ color:'rgba(238,242,255,0.5)' }}>{f.label}</span>
                  <span style={{ color:'rgba(238,242,255,0.7)' }}>
                    {f.value} × {f.weight} = {(f.value * f.weight).toFixed(3)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                  style={{ background:'rgba(255,255,255,0.07)' }}>
                  <div className="h-full rounded-full"
                    style={{
                      width:`${f.value*100}%`,
                      background: f.value > 0.7 ? '#F5532D'
                                : f.value > 0.5 ? '#F5A623'
                                : '#4F8EF7'
                    }}/>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t text-xs font-mono"
            style={{ borderColor:'rgba(255,255,255,0.07)', color:'rgba(238,242,255,0.35)' }}>
            Expected loss · ₹{Math.round(worker.premium.expected_loss)}/wk
          </div>
        </div>
      </div>

      {/* Trust profile */}
      <div className="card p-5 stagger-3">
        <p className="text-xs font-mono uppercase tracking-widest mb-4"
          style={{ color:'rgba(238,242,255,0.35)' }}>
          Trust Profile
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Trust Score',            value:worker.trust_profile.trust_score,              color: tl.color },
            { label:'Participation',          value:worker.trust_profile.participation_consistency, color:'#4F8EF7' },
            { label:'Movement Consistency',   value:worker.trust_profile.movement_consistency,      color:'#23D18B' },
            { label:'Deviation Avg',          value:worker.trust_profile.historical_deviation_avg,  color: worker.trust_profile.historical_deviation_avg > 0.4 ? '#F5532D' : '#F5A623', inverse:true },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-2"
                style={{ color:'rgba(238,242,255,0.3)' }}>{item.label}</p>
              <p className="font-display font-bold text-2xl mb-2" style={{ color:item.color }}>
                {Math.round(item.value*100)}%
              </p>
              <div className="h-1.5 rounded-full overflow-hidden"
                style={{ background:'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full"
                  style={{ width:`${item.value*100}%`, background:item.color }}/>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex items-center gap-2"
          style={{ borderColor:'rgba(255,255,255,0.07)' }}>
          <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>
            Anomaly flags:
          </span>
          <span className={`badge ${worker.trust_profile.anomaly_flag_count > 5 ? 'badge-red' : worker.trust_profile.anomaly_flag_count > 0 ? 'badge-amber' : 'badge-green'}`}>
            {worker.trust_profile.anomaly_flag_count} flags
          </span>
          <span className="badge badge-gray capitalize ml-1">
            {worker.trust_profile.profile_type}
          </span>
        </div>
      </div>

      {/* Payout history */}
      <div className="stagger-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">Payout History</h2>
          {totalHistory > 0 && (
            <span className="text-sm font-mono" style={{ color:'#23D18B' }}>
              ₹{totalHistory.toFixed(2)} total received
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm" style={{ color:'rgba(238,242,255,0.35)' }}>
              No payout events recorded for this worker
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="grid px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b"
              style={{
                gridTemplateColumns:'1fr 80px 80px 80px 90px',
                color:'rgba(238,242,255,0.3)',
                borderColor:'rgba(255,255,255,0.07)',
                background:'rgba(255,255,255,0.02)'
              }}>
              <span>Event</span>
              <span className="text-center">Type</span>
              <span className="text-center">Severity</span>
              <span className="text-center">Verdict</span>
              <span className="text-right">Payout</span>
            </div>

            {history.map((h, i) => {
              const dtl = disruptionTypeLabel(h.type)
              const sl  = severityLabel(h.severity)
              const verdictColors = {
                clean:'#23D18B', partial:'#F5A623', suspicious:'#F97316',
                blocked:'#F5532D', ineligible:'#6B7280'
              }

              return (
                <Link key={i} href={`/disruptions/${h.sim_id}`}
                  className="table-row no-underline"
                  style={{ gridTemplateColumns:'1fr 80px 80px 80px 90px' }}>

                  <div>
                    <p className="text-sm font-medium text-white truncate">{h.label}</p>
                    <p className="text-xs font-mono mt-0.5"
                      style={{ color:'rgba(238,242,255,0.35)' }}>
                      {h.city} · {h.zone}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <span className="text-lg">{dtl.icon}</span>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-mono" style={{ color:sl.color }}>
                      {h.severity}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-mono capitalize"
                      style={{ color: verdictColors[h.verdict] || '#6B7280' }}>
                      {h.verdict}
                    </span>
                  </div>

                  <div className="text-right">
                    {h.payout > 0 ? (
                      <span className="font-mono text-sm font-semibold" style={{ color:'#23D18B' }}>
                        ₹{h.payout.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-mono text-sm" style={{ color:'rgba(238,242,255,0.2)' }}>—</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Insurance plan */}
      <div className="card p-5 stagger-5">
        <p className="text-xs font-mono uppercase tracking-widest mb-4"
          style={{ color:'rgba(238,242,255,0.35)' }}>
          Insurance Plan Details
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm font-mono">
          {[
            ['Plan Tier',          worker.insurance_plan.plan_tier,                            '#8B7FED'],
            ['Base Coverage',      `${Math.round(worker.insurance_plan.base_coverage*100)}%`, '#4F8EF7'],
            ['Adjusted Coverage',  `${Math.round(worker.insurance_plan.adjusted_coverage*100)}%`,'#23D18B'],
            ['Weekly Baseline',    `₹${Math.round(worker.premium.weekly_baseline)}`,          '#fff'   ],
            ['Expected Loss',      `₹${Math.round(worker.premium.expected_loss)}`,            '#F5A623'],
            ['Weekly Premium',     `₹${Math.round(worker.premium.weekly_premium)}`,           '#4F8EF7'],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background:'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] uppercase tracking-widest mb-1.5"
                style={{ color:'rgba(238,242,255,0.3)' }}>{label}</p>
              <p className="font-display font-semibold text-base capitalize"
                style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
