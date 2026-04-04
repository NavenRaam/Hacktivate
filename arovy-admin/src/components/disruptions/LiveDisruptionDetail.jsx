'use client'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, Database, CreditCard } from 'lucide-react'
import SeverityBar from '@/components/shared/SeverityBar'
import WorkerValidationRow from '@/components/workers/WorkerValidationRow'
import { disruptionTypeLabel, CITY_COLORS } from '@/lib/data'

export default function LiveDisruptionDetail({ disruption: d }) {
  const tl      = disruptionTypeLabel(d.type)
  const cityCol = CITY_COLORS[d.city] || '#6B7280'
  const results = d.validationResults || []
  const s       = d.summary || {}
  const rz      = d.razorpay || null
  const du      = d.datasetUpdate || null

  const statusCfg = {
    scheduled:  { label:'Scheduled',   color:'#F5A623' },
    active:     { label:'Active',      color:'#F5532D' },
    validating: { label:'Validating',  color:'#4F8EF7' },
    paying:     { label:'Processing',  color:'#8B7FED' },
    completed:  { label:'Completed',   color:'#23D18B' },
    error:      { label:'Error',       color:'#F5532D' },
  }
  const sc = statusCfg[d.status] || statusCfg.completed

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <Link href="/disruptions"
        className="flex items-center gap-1.5 text-sm no-underline"
        style={{ color:'rgba(238,242,255,0.4)' }}>
        <ArrowLeft size={13}/> Back to Disruptions
      </Link>

      {/* Header */}
      <div className="card mesh-blue p-6 stagger-1">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background:tl.color+'15', border:`1px solid ${tl.color}25` }}>
            {tl.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-bold text-2xl text-white">{d.storeName}</h1>
              <span className="badge" style={{
                background:sc.color+'15', color:sc.color,
                border:`1px solid ${sc.color}30`,
                padding:'2px 8px', borderRadius:'999px',
                fontSize:'10px', fontFamily:'IBM Plex Mono',
              }}>
                {sc.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono mb-4"
              style={{ color:'rgba(238,242,255,0.4)' }}>
              <span style={{ color:cityCol }}>{d.city}</span>
              <span>·</span><span>{d.zone}</span>
              <span>·</span><span>{d.startTime}–{d.endTime}</span>
              <span>·</span>
              <span className="text-[10px]" style={{ color:'rgba(238,242,255,0.25)' }}>
                {d.id?.slice(0,8)}
              </span>
            </div>
            <SeverityBar value={d.severity}/>
          </div>
          {s.totalDisbursed > 0 && (
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-3xl" style={{ color:'#23D18B' }}>
                ₹{s.totalDisbursed}
              </p>
              <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.3)' }}>
                total disbursed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Outcome counts */}
      {Object.keys(s).length > 0 && (
        <div className="grid grid-cols-4 gap-4 stagger-2">
          {[
            ['Approved',   s.approved||0,   '#23D18B','rgba(35,209,139,0.08)' ],
            ['Partial',    s.partial||0,    '#F5A623','rgba(245,166,35,0.08)' ],
            ['Blocked',    s.blocked||0,    '#F5532D','rgba(245,83,45,0.08)'  ],
            ['Ineligible', s.ineligible||0, '#6B7280','rgba(255,255,255,0.04)'],
          ].map(([label,count,color,bg]) => (
            <div key={label} className="card p-4 text-center" style={{ background:bg, borderColor:color+'20' }}>
              <p className="font-display font-bold text-3xl" style={{ color }}>{count}</p>
              <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.45)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Razorpay summary */}
      {rz && (
        <div className="card p-5 stagger-3"
          style={{ borderColor:'rgba(139,127,237,0.2)', background:'rgba(139,127,237,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} color="#8B7FED"/>
            <p className="font-display font-semibold text-white">Razorpay Payout Summary</p>
          </div>
          <div className="grid grid-cols-4 gap-4 text-xs font-mono text-center">
            {[
              ['Succeeded', rz.succeeded||0, '#23D18B'],
              ['Failed',    rz.failed||0,    '#F5532D'],
              ['Skipped',   rz.skipped||0,   '#6B7280'],
              ['Paid',      `₹${rz.totalPaid||0}`, '#23D18B'],
            ].map(([k,v,c]) => (
              <div key={k} className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)' }}>
                <p className="font-bold text-xl" style={{ color:c }}>{v}</p>
                <p style={{ color:'rgba(238,242,255,0.35)' }}>{k}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset update */}
      {du && (
        <div className="card p-5 stagger-3"
          style={{ borderColor:'rgba(79,142,247,0.2)', background:'rgba(79,142,247,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} color="#4F8EF7"/>
            <p className="font-display font-semibold text-white">Dataset Updated</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Workers updated</p>
              <p className="text-white font-bold text-xl mt-0.5">{du.updated_count}</p>
            </div>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Avg trust delta</p>
              <p className="font-bold text-xl mt-0.5"
                style={{ color: du.avg_trust_delta >= 0 ? '#23D18B' : '#F5532D' }}>
                {du.avg_trust_delta > 0 ? '+' : ''}{du.avg_trust_delta}
              </p>
            </div>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Updated at</p>
              <p className="text-white mt-0.5">{du.updated_at?.split('T')[1]?.slice(0,8)}</p>
            </div>
          </div>
          {du.updates?.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-mono uppercase tracking-widest mb-3"
                style={{ color:'rgba(238,242,255,0.3)' }}>
                Per-worker changes
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {du.updates.map(u => (
                  <div key={u.worker_id} className="flex items-center gap-3 text-xs font-mono py-1.5 border-b"
                    style={{ borderColor:'rgba(255,255,255,0.05)' }}>
                    <span className="text-white min-w-[120px]">{u.name}</span>
                    <span style={{ color:'rgba(238,242,255,0.4)' }}>trust</span>
                    <span style={{ color:'rgba(238,242,255,0.6)' }}>{u.trust_before.toFixed(2)}</span>
                    <span style={{ color:'rgba(238,242,255,0.3)' }}>→</span>
                    <span style={{ color: u.trust_delta>=0?'#23D18B':'#F5532D' }}>
                      {u.trust_after.toFixed(2)} ({u.trust_delta>0?'+':''}{u.trust_delta})
                    </span>
                    <span className="ml-auto" style={{ color:'rgba(238,242,255,0.4)' }}>
                      baseline {u.baseline_before}→{u.baseline_after}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Worker validation table */}
      {results.length > 0 && (
        <div className="stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white">
              Worker Validation Results · {results.length} workers
            </h2>
            <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>
              Click any row to expand validation + payout details
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
      )}

      {d.status !== 'completed' && results.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color:'rgba(238,242,255,0.4)' }}>
            Validation results will appear here once the disruption ends and the pipeline completes.
          </p>
        </div>
      )}
    </div>
  )
}
