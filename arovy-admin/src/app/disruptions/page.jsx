'use client'
import { useState, useEffect } from 'react'
import { useSystemEvents } from '@/lib/useSystemEvents'
import { getAllSimulations, disruptionTypeLabel, CITY_COLORS } from '@/lib/data'
import SeverityBar from '@/components/shared/SeverityBar'
import Link from 'next/link'
import { ArrowRight, ShieldAlert, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

const BACKEND = 'http://localhost:3002'

const STATUS_CONFIG = {
  scheduled:  { label:'Scheduled',  dot:'bg-amber-500',  text:'text-amber-400',  border:'border-amber-500/20',  bg:'bg-amber-500/5'  },
  active:     { label:'Active',     dot:'bg-red-500 animate-pulse', text:'text-red-400', border:'border-red-500/25', bg:'bg-red-500/5' },
  validating: { label:'Validating', dot:'bg-blue-500 animate-pulse',text:'text-blue-400',border:'border-blue-500/20',bg:'bg-blue-500/5'},
  completed:  { label:'Completed',  dot:'bg-green-500',  text:'text-green-400',  border:'border-green-500/20',  bg:'bg-green-500/5'  },
}

function LiveEventCard({ event }) {
  const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.scheduled
  const tl  = disruptionTypeLabel(event.type)
  const col = CITY_COLORS[event.city] || '#6B7280'

  return (
    <div className={`card p-5 ${cfg.bg} border ${cfg.border}`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background:tl.color+'15', border:`1px solid ${tl.color}25` }}>
          {tl.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
              {cfg.label}
            </span>
            <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.2)' }}>
              {event.id?.slice(0,8)}
            </span>
          </div>
          <p className="font-display font-semibold text-white">{event.storeName}</p>
          <div className="flex items-center gap-2 text-xs font-mono mt-0.5"
            style={{ color:'rgba(238,242,255,0.4)' }}>
            <span style={{ color:col }}>{event.city}</span>
            <span>·</span><span>{event.zone}</span>
            <span>·</span><span>{event.startTime}–{event.endTime}</span>
          </div>

          <div className="mt-3">
            <SeverityBar value={event.severity}/>
          </div>

          <div className="flex items-center gap-3 mt-3 text-xs font-mono">
            <span style={{ color:'rgba(238,242,255,0.35)' }}>
              {event.affectedTotal} workers
            </span>
            {event.summary && (
              <>
                <span className="badge badge-green">{event.summary.approved} ✓</span>
                {event.summary.blocked > 0 && (
                  <span className="badge badge-red">{event.summary.blocked} ✗</span>
                )}
                {event.summary.partial > 0 && (
                  <span className="badge badge-amber">{event.summary.partial} ~</span>
                )}
                <span className="ml-auto font-semibold" style={{ color:'#23D18B' }}>
                  ₹{event.summary.totalDisbursed}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoricalEventRow({ sim }) {
  const tl  = disruptionTypeLabel(sim.disruption_type)
  const col = CITY_COLORS[sim.city] || '#6B7280'
  const isCrash = sim.market_crash_controls?.activated

  return (
    <Link href={`/disruptions/${sim.simulation_id}`}
      className="table-row no-underline"
      style={{ gridTemplateColumns:'1fr 120px 80px auto auto' }}>
      <div className="flex items-center gap-2.5">
        <span>{tl.icon}</span>
        <div>
          <p className="text-sm font-medium text-white leading-tight truncate max-w-xs">{sim.label}</p>
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
        {(sim.summary?.blocked||0) > 0 && (
          <span className="badge badge-red">{sim.summary.blocked} ✗</span>
        )}
      </div>
      <ArrowRight size={13} style={{ color:'rgba(238,242,255,0.2)' }}/>
    </Link>
  )
}

export default function DisruptionsPage() {
  const historicalSims = getAllSimulations()

  // Live disruptions from backend
  const [liveEvents, setLiveEvents] = useState([])
  const [loading,    setLoading]    = useState(true)

  // Fetch existing backend history on load
  useEffect(() => {
    fetch(`${BACKEND}/api/disruptions`)
      .then(r => r.json())
      .then(data => { setLiveEvents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Subscribe to live updates
  useSystemEvents({
    onScheduled: (d) => setLiveEvents(prev => {
      const exists = prev.find(e => e.id === d.id)
      return exists ? prev.map(e => e.id === d.id ? { ...e, ...d } : e) : [d, ...prev]
    }),
    onActive: (d) => setLiveEvents(prev =>
      prev.map(e => e.id === d.id ? { ...e, status:'active' } : e)
    ),
    onValidating: (d) => setLiveEvents(prev =>
      prev.map(e => e.id === d.id ? { ...e, status:'validating' } : e)
    ),
    onCompleted: (d) => setLiveEvents(prev =>
      prev.map(e => e.id === d.id ? { ...e, status:'completed', summary:d.summary } : e)
    ),
  })

  const activeLive    = liveEvents.filter(e => ['active','validating'].includes(e.status))
  const scheduledLive = liveEvents.filter(e => e.status === 'scheduled')
  const completedLive = liveEvents.filter(e => e.status === 'completed')

  const totalDisbursed = historicalSims.reduce((s,sim) => s+(sim.summary?.total_payout_disbursed||0), 0)
    + completedLive.reduce((s,e) => s+(e.summary?.totalDisbursed||0), 0)

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      {/* Header */}
      <div className="stagger-1">
        <h1 className="font-display font-bold text-3xl text-white">Disruptions</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
          Live events from Disruption Panel + historical records
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4 stagger-2">
        {[
          { label:'Historical Events', value:historicalSims.length,                  accent:'#4F8EF7' },
          { label:'Live Events',       value:liveEvents.length,                      accent:'#23D18B' },
          { label:'Currently Active',  value:activeLive.length,                      accent: activeLive.length>0 ? '#F5532D' : '#6B7280' },
          { label:'Total Disbursed',   value:`₹${Math.round(totalDisbursed)}`,       accent:'#23D18B' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-mono uppercase tracking-widest mb-2"
              style={{ color:'rgba(238,242,255,0.3)' }}>{item.label}</p>
            <p className="font-display font-bold text-2xl" style={{ color:item.accent }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Active / scheduled live events */}
      {(activeLive.length > 0 || scheduledLive.length > 0) && (
        <div className="stagger-3">
          <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            Live Events
          </h2>
          <div className="space-y-3">
            {[...activeLive, ...scheduledLive].map(e => (
              <LiveEventCard key={e.id} event={e}/>
            ))}
          </div>
        </div>
      )}

      {/* Recently completed live events */}
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

      {/* Historical events */}
      <div className="stagger-4">
        <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
          <Clock size={16} style={{ color:'rgba(238,242,255,0.4)' }}/>
          Historical Records
        </h2>
        <div className="card overflow-hidden">
          {historicalSims.map(sim => (
            <HistoricalEventRow key={sim.simulation_id} sim={sim}/>
          ))}
        </div>
      </div>

    </div>
  )
}
