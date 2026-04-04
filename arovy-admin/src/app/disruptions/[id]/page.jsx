import { getSimulationDetail, disruptionTypeLabel, CITY_COLORS } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, Database, CreditCard } from 'lucide-react'
import SeverityBar from '@/components/shared/SeverityBar'
import LiveDisruptionDetail from '@/components/disruptions/LiveDisruptionDetail'
import WorkerValidationRow from '@/components/workers/WorkerValidationRow'

const BACKEND = 'http://localhost:3002'

async function getBackendDisruption(id) {
  try {
    const res = await fetch(`${BACKEND}/api/disruptions/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export default async function DisruptionDetailPage({ params }) {
  // Try static dataset first
  const sim = getSimulationDetail(params.id)
  if (sim) {
    return <StaticDisruptionDetail sim={sim}/>
  }

  // Try backend (live disruption)
  const live = await getBackendDisruption(params.id)
  if (live) {
    return <LiveDisruptionDetail disruption={live}/>
  }

  notFound()
}

// ─── Static (historical dataset) detail ──────────────────
function StaticDisruptionDetail({ sim }) {
  const tl      = disruptionTypeLabel(sim.disruption_type)
  const cityCol = CITY_COLORS[sim.city] || '#6B7280'
  const isCrash = sim.market_crash_controls?.activated
  const results = sim.worker_results || []

  const approved = results.filter(r => r.outcome?.payout_status === 'approved').length
  const partial  = results.filter(r => r.outcome?.payout_status === 'partial_approved').length
  const blocked  = results.filter(r => r.outcome?.payout_status === 'blocked').length
  const inelig   = results.filter(r => r.outcome?.payout_status === 'not_applicable').length

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <Link href="/disruptions"
        className="flex items-center gap-1.5 text-sm no-underline"
        style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Disruptions
      </Link>

      <div className="card mesh-blue p-6 stagger-1">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background:tl.color+'15', border:`1px solid ${tl.color}25` }}>
            {tl.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-bold text-2xl text-white">{sim.label}</h1>
              {isCrash && <span className="badge badge-iris flex items-center gap-1"><ShieldAlert size={10}/> Market Crash</span>}
            </div>
            <div className="flex items-center gap-2 text-sm font-mono mb-4"
              style={{ color:'rgba(238,242,255,0.4)' }}>
              <span style={{ color:cityCol }}>{sim.city}</span>
              <span>·</span><span>{sim.zone}</span>
              <span>·</span><span>{sim.scheduled_start}–{sim.scheduled_end}</span>
            </div>
            <SeverityBar value={sim.severity}/>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display font-bold text-3xl" style={{ color:'#23D18B' }}>
              ₹{(sim.summary?.total_payout_disbursed||0).toFixed(2)}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.3)' }}>total disbursed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 stagger-2">
        {[
          ['Approved',   approved, '#23D18B','rgba(35,209,139,0.08)' ],
          ['Partial',    partial,  '#F5A623','rgba(245,166,35,0.08)' ],
          ['Blocked',    blocked,  '#F5532D','rgba(245,83,45,0.08)'  ],
          ['Ineligible', inelig,   '#6B7280','rgba(255,255,255,0.04)'],
        ].map(([label,count,color,bg]) => (
          <div key={label} className="card p-4 text-center" style={{ background:bg, borderColor:color+'20' }}>
            <p className="font-display font-bold text-3xl" style={{ color }}>{count}</p>
            <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.45)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="stagger-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">
            Worker Validation Results · {results.length} workers
          </h2>
          <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>
            Click any row to expand
          </p>
        </div>
        <div className="card overflow-hidden">
          <div style={{
            display:'grid',
            gridTemplateColumns:'1fr 60px 80px 80px 100px 90px 36px',
            gap:'8px', padding:'8px 16px',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
            background:'rgba(255,255,255,0.02)',
          }}>
            {['Worker','Trust','Verdict','Payout','Status','Razorpay',''].map((h,i) => (
              <div key={i} style={{
                fontSize:'10px',color:'rgba(238,242,255,0.3)',
                fontFamily:'IBM Plex Mono',textTransform:'uppercase',letterSpacing:'0.5px',
                textAlign:i>=2?'center':'left',
              }}>{h}</div>
            ))}
          </div>
          {results.map((r,i) => (
            <WorkerValidationRow key={r.worker_id||r.workerId||i} result={r} index={i}/>
          ))}
        </div>
      </div>
    </div>
  )
}
