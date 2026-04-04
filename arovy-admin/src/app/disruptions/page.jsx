'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSystemEvents } from '@/lib/useSystemEvents'
import { getAllSimulations, disruptionTypeLabel, CITY_COLORS } from '@/lib/data'
import SeverityBar from '@/components/shared/SeverityBar'
import Link from 'next/link'
import { ArrowRight, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react'

const BACKEND = 'http://localhost:3002'

const STATUS_CFG = {
  scheduled:  { label:'Scheduled',        dotCls:'bg-amber-500 animate-pulse', color:'#F5A623', border:'rgba(245,166,35,0.25)', bg:'rgba(245,166,35,0.04)' },
  active:     { label:'Active',           dotCls:'bg-red-500 animate-pulse',   color:'#F5532D', border:'rgba(245,83,45,0.3)',   bg:'rgba(245,83,45,0.05)'  },
  validating: { label:'Validating...',    dotCls:'bg-blue-500 animate-pulse',  color:'#4F8EF7', border:'rgba(79,142,247,0.25)', bg:'rgba(79,142,247,0.04)' },
  paying:     { label:'Processing Payouts',dotCls:'bg-iris-500 animate-pulse', color:'#8B7FED', border:'rgba(139,127,237,0.25)',bg:'rgba(139,127,237,0.04)'},
  completed:  { label:'Completed',        dotCls:'bg-green-500',               color:'#23D18B', border:'rgba(35,209,139,0.25)', bg:'rgba(35,209,139,0.04)' },
  error:      { label:'Error',            dotCls:'bg-red-600',                 color:'#F5532D', border:'rgba(245,83,45,0.3)',   bg:'rgba(245,83,45,0.04)'  },
}

function LiveEventCard({ event }) {
  const cfg = STATUS_CFG[event.status] || STATUS_CFG.scheduled
  const tl  = disruptionTypeLabel(event.type)
  const col = CITY_COLORS[event.city] || '#6B7280'
  const s   = event.summary

  return (
    <Link href={`/disruptions/${event.id}`} className="block no-underline">
      <div className="card card-hover p-5" style={{ borderColor:cfg.border, background:cfg.bg }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background:tl.color+'15', border:`1px solid ${tl.color}25` }}>
            {tl.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest"
                style={{ color:cfg.color }}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`}/>
                {cfg.label}
              </span>
              <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.2)' }}>
                {event.id?.slice(0,8)}
              </span>
            </div>
            <p className="font-display font-semibold text-white">{event.storeName}</p>
            <div className="flex items-center gap-2 text-xs font-mono mt-0.5 mb-3"
              style={{ color:'rgba(238,242,255,0.4)' }}>
              <span style={{ color:col }}>{event.city}</span>
              <span>·</span><span>{event.zone}</span>
              <span>·</span><span>{event.startTime}–{event.endTime}</span>
            </div>
            <SeverityBar value={event.severity}/>
            {s && (
              <div className="flex items-center gap-3 mt-3 text-xs font-mono flex-wrap">
                <span style={{ color:'rgba(238,242,255,0.4)' }}>{event.affectedTotal} workers</span>
                {s.approved  > 0 && <span className="badge badge-green">{s.approved} ✓</span>}
                {s.partial   > 0 && <span className="badge badge-amber">{s.partial} ~</span>}
                {s.blocked   > 0 && <span className="badge badge-red">{s.blocked} ✗</span>}
                {s.ineligible> 0 && <span className="badge badge-gray">{s.ineligible} —</span>}
                {s.totalDisbursed > 0 && (
                  <span className="ml-auto font-semibold" style={{ color:'#23D18B' }}>
                    ₹{s.totalDisbursed}
                  </span>
                )}
              </div>
            )}
          </div>
          <ArrowRight size={13} style={{ color:'rgba(238,242,255,0.2)', flexShrink:0 }}/>
        </div>
      </div>
    </Link>
  )
}

export default function DisruptionsPage() {
  const historicalSims = getAllSimulations()
  const [liveEvents,   setLiveEvents]   = useState([])
  const [loading,      setLoading]      = useState(true)

  // Fetch backend history on every load (persistent, survives refresh)
  const fetchLive = useCallback(() => {
    fetch(`${BACKEND}/api/disruptions`)
      .then(r => r.json())
      .then(data => {
        setLiveEvents(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLive() }, [fetchLive])

  // Live SSE updates
  useSystemEvents({
    onScheduled: (d) => setLiveEvents(prev => {
      const exists = prev.find(e => e.id === d.id)
      return exists ? prev.map(e => e.id===d.id ? {...e,...d} : e) : [d,...prev]
    }),
    onActive:     (d) => setLiveEvents(prev => prev.map(e => e.id===d.id ? {...e,status:'active',...d} : e)),
    onValidating: (d) => setLiveEvents(prev => prev.map(e => e.id===d.id ? {...e,status:'validating'} : e)),
    onCompleted:  (d) => {
      setLiveEvents(prev => prev.map(e => e.id===d.id
        ? {...e, status:'completed', summary:d.summary, razorpay:d.razorpay, datasetUpdate:d.datasetUpdate}
        : e
      ))
    },
  })

  const activeLive    = liveEvents.filter(e => ['active','validating','paying'].includes(e.status))
  const scheduledLive = liveEvents.filter(e => e.status === 'scheduled')
  const completedLive = liveEvents.filter(e => e.status === 'completed')

  const totalDisbursed =
    historicalSims.reduce((s,sim) => s+(sim.summary?.total_payout_disbursed||0), 0) +
    completedLive.reduce((s,e)    => s+(e.summary?.totalDisbursed||0), 0)

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Disruptions</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          Live events from Disruption Panel + historical records
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 stagger-2">
        {[
          { label:'Historical Events', value:historicalSims.length,  accent:'#4F8EF7' },
          { label:'Live Events',       value:liveEvents.length,       accent:'#23D18B' },
          { label:'Currently Active',  value:activeLive.length,       accent:activeLive.length>0?'#F5532D':'#6B7280' },
          { label:'Total Disbursed',   value:`₹${Math.round(totalDisbursed)}`, accent:'#23D18B' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-mono uppercase tracking-widest mb-2"
              style={{ color:'rgba(238,242,255,0.3)' }}>{item.label}</p>
            <p className="font-display font-bold text-2xl" style={{ color:item.accent }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Active / scheduled */}
      {(activeLive.length > 0 || scheduledLive.length > 0) && (
        <div className="stagger-3">
          <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            Live Events
          </h2>
          <div className="space-y-3">
            {[...activeLive,...scheduledLive].map(e => <LiveEventCard key={e.id} event={e}/>)}
          </div>
        </div>
      )}

      {/* Completed live */}
      {completedLive.length > 0 && (
        <div className="stagger-3">
          <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} color="#23D18B"/>
            Completed This Session
          </h2>
          <div className="space-y-3">
            {completedLive.map(e => <LiveEventCard key={e.id} event={e}/>)}
          </div>
        </div>
      )}

      {/* Historical */}
      <div className="stagger-4">
        <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
          <Clock size={16} style={{ color:'rgba(238,242,255,0.4)' }}/>
          Historical Records
        </h2>
        <div className="card overflow-hidden">
          {historicalSims.map(sim => {
            const tl  = disruptionTypeLabel(sim.disruption_type)
            const col = CITY_COLORS[sim.city] || '#6B7280'
            const isCrash = sim.market_crash_controls?.activated
            return (
              <Link key={sim.simulation_id} href={`/disruptions/${sim.simulation_id}`}
                className="table-row no-underline"
                style={{ gridTemplateColumns:'1fr 120px 80px auto auto' }}>
                <div className="flex items-center gap-2.5">
                  <span>{tl.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white leading-tight truncate max-w-xs">
                      {sim.label}
                    </p>
                    <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>
                      {sim.scheduled_start}–{sim.scheduled_end}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.45)' }}>
                  <span style={{ color:col }}>{sim.city}</span> · {sim.zone}
                </p>
                <p className="text-sm font-mono font-medium text-right" style={{ color:'#23D18B' }}>
                  ₹{sim.summary?.total_payout_disbursed?.toFixed(0)||0}
                </p>
                <div className="flex gap-1.5 justify-end">
                  {isCrash && <span className="badge badge-iris">⚡ Crash</span>}
                  <span className="badge badge-green">{sim.summary?.approved||0} ✓</span>
                  {(sim.summary?.blocked||0)>0 && <span className="badge badge-red">{sim.summary.blocked} ✗</span>}
                </div>
                <ArrowRight size={13} style={{ color:'rgba(238,242,255,0.2)' }}/>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
