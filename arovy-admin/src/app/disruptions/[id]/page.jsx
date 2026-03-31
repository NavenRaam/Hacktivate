import { getSimulationDetail, disruptionTypeLabel, severityLabel, trustLabel, CITY_COLORS } from '@/lib/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react'
import SeverityBar from '@/components/shared/SeverityBar'
import TrustRing from '@/components/shared/TrustRing'

function VerdictIcon({ verdict }) {
  const map = {
    clean:      <CheckCircle2 size={14} color="#23D18B"/>,
    partial:    <AlertCircle  size={14} color="#F5A623"/>,
    suspicious: <AlertCircle  size={14} color="#F97316"/>,
    blocked:    <XCircle      size={14} color="#F5532D"/>,
    ineligible: <MinusCircle  size={14} color="#6B7280"/>,
  }
  return map[verdict] || map.ineligible
}

export default function DisruptionDetailPage({ params }) {
  // Try historical dataset first
  const sim = getSimulationDetail(params.id)

  // If not found in dataset, it might be a live backend disruption
  // (those are viewed from the disruptions list via LiveEventCard)
  if (!sim) {
    return (
      <div className="p-8 max-w-5xl">
        <Link href="/disruptions"
          className="flex items-center gap-1.5 text-sm no-underline mb-8"
          style={{ color:'rgba(238,242,255,0.4)' }}>
          <ArrowLeft size={13}/> Back to Disruptions
        </Link>
        <div className="card p-8 text-center">
          <p className="font-display font-semibold text-white mb-2">Live Disruption</p>
          <p className="text-sm" style={{ color:'rgba(238,242,255,0.4)' }}>
            This disruption was triggered from the Disruption Panel this session.
            Full validation details are visible on the Disruptions page while the event is active.
          </p>
          <Link href="/disruptions"
            className="inline-flex items-center gap-1.5 mt-4 text-sm no-underline"
            style={{ color:'#4F8EF7' }}>
            View live disruptions <ArrowLeft size={12} style={{ transform:'rotate(180deg)' }}/>
          </Link>
        </div>
      </div>
    )
  }

  const tl      = disruptionTypeLabel(sim.disruption_type)
  const cityCol = CITY_COLORS[sim.city] || '#6B7280'
  const isCrash = sim.market_crash_controls?.activated
  const results = sim.worker_results || []

  const approved = results.filter(r => r.outcome?.payoutStatus === 'approved')
  const partial  = results.filter(r => r.outcome?.payoutStatus === 'partial_approved')
  const blocked  = results.filter(r => r.outcome?.payoutStatus === 'blocked')
  const inelig   = results.filter(r => r.outcome?.payoutStatus === 'not_applicable')

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      <Link href="/disruptions"
        className="flex items-center gap-1.5 text-sm no-underline"
        style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Disruptions
      </Link>

      {/* Event header */}
      <div className="card mesh-blue p-6 stagger-1">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background:tl.color+'15', border:`1px solid ${tl.color}25` }}>
            {tl.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-bold text-2xl text-white">{sim.label}</h1>
              {isCrash && (
                <span className="badge badge-iris flex items-center gap-1">
                  <ShieldAlert size={10}/> Market Crash
                </span>
              )}
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

      {/* Outcome grid */}
      <div className="grid grid-cols-4 gap-4 stagger-2">
        {[
          { label:'Approved',   count:approved.length, color:'#23D18B', bg:'rgba(35,209,139,0.08)'  },
          { label:'Partial',    count:partial.length,  color:'#F5A623', bg:'rgba(245,166,35,0.08)'  },
          { label:'Blocked',    count:blocked.length,  color:'#F5532D', bg:'rgba(245,83,45,0.08)'   },
          { label:'Ineligible', count:inelig.length,   color:'#6B7280', bg:'rgba(255,255,255,0.04)' },
        ].map(item => (
          <div key={item.label} className="card p-4 text-center"
            style={{ background:item.bg, borderColor:item.color+'20' }}>
            <p className="font-display font-bold text-3xl" style={{ color:item.color }}>{item.count}</p>
            <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.45)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Market crash panel */}
      {isCrash && (
        <div className="card mesh-fire p-5 stagger-3"
          style={{ borderColor:'rgba(245,83,45,0.25)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={15} color="#F5532D"/>
            <p className="font-display font-semibold text-white">Market Crash Controls Activated</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Cluster Risk</p>
              <p className="text-white font-semibold mt-0.5">{sim.market_crash_controls.cluster_risk_score}</p>
            </div>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Coverage Reduction</p>
              <p className="mt-0.5" style={{ color:'#F5A623' }}>×{sim.market_crash_controls.coverage_reduction_factor}</p>
            </div>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Hard Cap/Worker</p>
              <p className="mt-0.5" style={{ color:'#F5532D' }}>₹{sim.market_crash_controls.hard_cap_per_worker||'None'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Worker validation table */}
      <div className="stagger-4">
        <h2 className="font-display font-bold text-lg text-white mb-4">
          Worker Validation Results · {results.length} workers
        </h2>
        <div className="card overflow-hidden">
          <div className="grid px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b"
            style={{
              gridTemplateColumns:'1fr 60px 80px 80px 100px 90px',
              color:'rgba(238,242,255,0.3)',
              borderColor:'rgba(255,255,255,0.07)',
              background:'rgba(255,255,255,0.02)'
            }}>
            <span>Worker</span>
            <span className="text-center">Trust</span>
            <span className="text-center">Verdict</span>
            <span className="text-center">Payout</span>
            <span className="text-center">Status</span>
            <span className="text-right">Flags</span>
          </div>

          {results.map((r, i) => {
            const tl2    = trustLabel(r.fraud_signals?.trustScore || 0)
            const payout = r.outcome?.payoutAmount || 0
            const status = r.outcome?.payoutStatus || 'unknown'
            const verdict= r.fraud_signals?.fraud_verdict || 'unknown'
            const flags  = r.fraud_signals?.flags || []
            const statusCls = {
              approved:'badge-green', partial_approved:'badge-amber',
              blocked:'badge-red',    not_applicable:'badge-gray',
            }[status] || 'badge-gray'

            return (
              <Link key={r.worker_id||i}
                href={`/workers/${r.worker_id}`}
                className="table-row no-underline"
                style={{ gridTemplateColumns:'1fr 60px 80px 80px 100px 90px' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <VerdictIcon verdict={verdict}/>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.workerName||r.worker_id}</p>
                    <p className="text-xs font-mono truncate"
                      style={{ color:'rgba(238,242,255,0.35)' }}>
                      {r.zone} · {r.eligibilityTier}
                    </p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <TrustRing score={r.fraud_signals?.trustScore||0} size={36}/>
                </div>
                <div className="flex justify-center">
                  <span className={`badge ${tl2.cls} capitalize`}>{verdict}</span>
                </div>
                <div className="text-center">
                  {payout > 0
                    ? <span className="font-mono text-sm font-semibold" style={{ color:'#23D18B' }}>₹{payout.toFixed(0)}</span>
                    : <span className="font-mono text-sm" style={{ color:'rgba(238,242,255,0.2)' }}>—</span>}
                </div>
                <div className="flex justify-center">
                  <span className={`badge ${statusCls}`}>{status.replace('_',' ')}</span>
                </div>
                <div className="text-right">
                  {flags.length > 0
                    ? <span className="badge badge-red">{flags.length} flag{flags.length>1?'s':''}</span>
                    : <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.2)' }}>—</span>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
