import { fetchWorkerById, getWorkerPayoutHistory, trustLabel, eligLabel, planLabel, disruptionTypeLabel, severityLabel, CITY_COLORS } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react'
import TrustRing from '@/components/shared/TrustRing'
import SeverityBar from '@/components/shared/SeverityBar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_SHORT = { monday:'M', tuesday:'T', wednesday:'W', thursday:'T', friday:'F', saturday:'S', sunday:'S' }

function VerdictIcon({ verdict }) {
  const map = { clean:<CheckCircle2 size={13} color="#23D18B"/>, partial:<AlertCircle size={13} color="#F5A623"/>, suspicious:<AlertCircle size={13} color="#F97316"/>, blocked:<XCircle size={13} color="#F5532D"/>, ineligible:<MinusCircle size={13} color="#6B7280"/> }
  return map[verdict] || map.ineligible
}

export default async function WorkerDetailPage({ params }) {
  const worker = await fetchWorkerById(params.id)
  if (!worker) notFound()

  const history  = getWorkerPayoutHistory(params.id)
  const tl       = trustLabel(worker.trust_profile.trust_score)
  const el       = eligLabel(worker.eligibility_tier)
  const pl       = planLabel(worker.insurance_plan.plan_tier)
  const cityCol  = CITY_COLORS[worker.city] || '#4F8EF7'
  const maxIncome= Math.max(...Object.values(worker.baseline_income))
  const totalHistory = history.reduce((s,h) => s + (h.payout||0), 0)
  const rp = worker.risk_profile
  const riskFactors = [
    { label:'Location Risk',      value:rp.location_risk,             weight:0.4 },
    { label:'Temporal Risk',      value:rp.temporal_risk,             weight:0.2 },
    { label:'Exposure Level',     value:rp.exposure_level,            weight:0.2 },
    { label:'Store Unreliability',value:rp.store_reliability_inverse, weight:0.2 },
  ]

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      <Link href="/workers" className="flex items-center gap-1.5 text-sm no-underline" style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Workers
      </Link>

      {/* Worker header */}
      <div className="card mesh-blue p-6 stagger-1">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-2">
            <TrustRing score={worker.trust_profile.trust_score} size={80}/>
            <span className={`badge ${tl.cls}`}>{tl.text}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display font-bold text-2xl text-white">{worker.name}</h1>
              <span className={`badge ${el.cls}`}>{el.text}</span>
              <span className={`badge ${pl.cls}`}>{pl.text}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono mb-4" style={{ color:'rgba(238,242,255,0.4)' }}>
              <span style={{ color:cityCol }}>{worker.city}</span>
              <span>·</span><span>{worker.zone}</span>
              <span>·</span><span>{worker.worker_id}</span>
              <span>·</span><span>{worker.months_of_service}mo service</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:'Weekly Premium', value:`₹${Math.round(worker.premium.weekly_premium)}/wk`, color:'#4F8EF7' },
                { label:'Exp. Loss/wk',   value:`₹${Math.round(worker.premium.expected_loss||0)}`,  color:'#F5A623' },
                { label:'Coverage',       value:`${Math.round((worker.insurance_plan.adjusted_coverage||0)*100)}%`, color:'#23D18B' },
                { label:'Risk Score',     value:rp.risk_score, color:rp.risk_score>0.6?'#F5532D':'#F5A623' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-mono mb-1" style={{ color:'rgba(238,242,255,0.4)' }}>{item.label}</p>
                  <p className="font-display font-bold text-lg" style={{ color:item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 stagger-2">
        {/* Baseline income chart */}
        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>
            Baseline Income · By Day
          </p>
          <div className="flex items-end gap-1.5 h-20 mb-2">
            {DAY_ORDER.map(day => {
              const val = worker.baseline_income[day] || 0
              const pct = maxIncome > 0 ? (val/maxIncome) * 100 : 0
              const isWeekend = day==='saturday'||day==='sunday'
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>₹{val}</span>
                  <div className="w-full rounded-sm" style={{ height:`${pct}%`, minHeight:4, background:isWeekend?'rgba(79,142,247,0.4)':'rgba(255,255,255,0.15)' }}/>
                  <span className="text-[9px] font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>{DAY_SHORT[day]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Risk profile */}
        <div className="card p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>
            Risk Score Breakdown
          </p>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-display font-bold text-4xl" style={{ color:rp.risk_score>0.6?'#F5532D':'#F5A623' }}>
              {rp.risk_score}
            </span>
            <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.4)' }}>composite risk</span>
          </div>
          <div className="space-y-2.5">
            {riskFactors.map(f => (
              <div key={f.label}>
                <div className="flex justify-between text-xs font-mono mb-1" style={{ color:'rgba(238,242,255,0.5)' }}>
                  <span>{f.label}</span>
                  <span>{f.value} ×{f.weight}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.07)' }}>
                  <div className="h-full rounded-full" style={{ width:`${f.value*100}%`, background:f.value>0.6?'#F5532D':f.value>0.4?'#F5A623':'#23D18B' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust profile detail */}
      <div className="card p-5 stagger-3">
        <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:'rgba(238,242,255,0.35)' }}>
          Trust Profile · Live
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Trust Score',        value:`${Math.round(worker.trust_profile.trust_score*100)}%`, color:tl.color },
            { label:'Participation',      value:`${Math.round(worker.trust_profile.participation_consistency*100)}%`, color:'#4F8EF7' },
            { label:'Movement',           value:`${Math.round(worker.trust_profile.movement_consistency*100)}%`, color:'#23D18B' },
            { label:'Anomaly Flags',      value:worker.trust_profile.anomaly_flag_count, color:worker.trust_profile.anomaly_flag_count>3?'#F5532D':'#F5A623' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center" style={{ background:'rgba(255,255,255,0.04)' }}>
              <p className="font-display font-bold text-xl" style={{ color:item.color }}>{item.value}</p>
              <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t text-xs font-mono" style={{ borderColor:'rgba(255,255,255,0.07)', color:'rgba(238,242,255,0.35)' }}>
          Profile type: <span className={`badge ${tl.cls} ml-1`}>{worker.trust_profile.profile_type}</span>
          {worker.trust_profile.last_updated && (
            <span className="ml-3">Last updated: {worker.trust_profile.last_updated}</span>
          )}
        </div>
      </div>

      {/* Payout history */}
      {history.length > 0 && (
        <div className="stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white">Payout History</h2>
            <span className="badge badge-green">₹{totalHistory.toFixed(2)} total</span>
          </div>
          <div className="card overflow-hidden">
            {history.map((h,i) => {
              const tl2 = disruptionTypeLabel(h.type)
              const sl  = severityLabel(h.severity)
              return (
                <div key={i} className="table-row" style={{ gridTemplateColumns:'1fr 80px 80px 80px' }}>
                  <div className="flex items-center gap-2.5">
                    <VerdictIcon verdict={h.verdict}/>
                    <div>
                      <p className="text-sm font-medium text-white">{h.label || tl2.text}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>{h.date}</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <span className={`badge ${sl.cls}`}>{sl.text}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-mono" style={{ color:h.payout>0?'#23D18B':'rgba(238,242,255,0.3)' }}>
                      {h.payout>0?`₹${h.payout.toFixed(2)}`:'—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${h.status==='approved'?'badge-green':h.status==='partial_approved'?'badge-amber':'badge-red'}`}>
                      {h.status?.replace('_',' ')||'unknown'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
