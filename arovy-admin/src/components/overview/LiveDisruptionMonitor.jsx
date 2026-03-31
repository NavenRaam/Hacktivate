'use client'
import { useState, useEffect } from 'react'
import { useSystemEvents } from '@/lib/useSystemEvents'
import { formatTime } from '@/lib/dataHelpers'
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, Wifi, WifiOff } from 'lucide-react'
import TrustRing from '@/components/shared/TrustRing'

const BACKEND = 'http://localhost:3002'

function VerdictIcon({ verdict, size = 13 }) {
  const map = {
    clean:      <CheckCircle2 size={size} color="#23D18B"/>,
    partial:    <AlertCircle  size={size} color="#F5A623"/>,
    suspicious: <AlertCircle  size={size} color="#F97316"/>,
    blocked:    <XCircle      size={size} color="#F5532D"/>,
    ineligible: <MinusCircle  size={size} color="#6B7280"/>,
  }
  return map[verdict] || map.ineligible
}

export default function LiveDisruptionMonitor() {
  const [clockMins,    setClockMins]    = useState(null)
  const [activeD,      setActiveD]      = useState(null)
  const [validating,   setValidating]   = useState(false)
  const [results,      setResults]      = useState([])
  const [summary,      setSummary]      = useState(null)
  const [phase,        setPhase]        = useState('idle') // idle|scheduled|active|validating|completed
  const [scheduledD,   setScheduledD]   = useState(null)
  const [visibleCount, setVisibleCount] = useState(0)

  const { connected } = useSystemEvents({
    onInit: (data) => {
      if (data.clock) setClockMins(data.clock.minutes)
      if (data.activeDisruption) {
        setActiveD(data.activeDisruption)
        setPhase('active')
      }
    },
    onClock: (data) => setClockMins(data.minutes),
    onScheduled: (d) => {
      setScheduledD(d)
      setPhase('scheduled')
      setResults([])
      setSummary(null)
    },
    onActive: (d) => {
      setActiveD(d)
      setPhase('active')
      setScheduledD(null)
      setResults([])
      setSummary(null)
      setVisibleCount(0)
    },
    onValidating: () => {
      setPhase('validating')
      setValidating(true)
    },
    onCompleted: (data) => {
      setSummary(data.summary)
      setPhase('completed')
      setValidating(false)
      // Reveal workers one by one
      data.results.forEach((r, i) => {
        setTimeout(() => {
          setResults(prev => [...prev, r])
          setVisibleCount(i + 1)
        }, i * 120)
      })
    },
  })

  const progress = activeD && clockMins !== null
    ? Math.min(100, Math.max(0,
        ((clockMins - parseTime(activeD.startTime)) /
         (activeD.durationHours * 60)) * 100
      ))
    : 0

  if (phase === 'idle') {
    return (
      <div className="card p-6 flex flex-col items-center justify-center min-h-48 text-center">
        <div className={`flex items-center gap-2 mb-3 ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? <Wifi size={14}/> : <WifiOff size={14}/>}
          <span className="text-xs font-mono">
            {connected ? 'Connected to backend' : 'Backend offline'}
          </span>
        </div>
        <p className="text-sm" style={{ color:'rgba(238,242,255,0.3)' }}>
          No active disruption
        </p>
        <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.2)' }}>
          Trigger one from the Disruption Panel
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Connection indicator */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-white text-base">Live System</h3>
        <div className={`flex items-center gap-1.5 text-xs font-mono ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? <Wifi size={11}/> : <WifiOff size={11}/>}
          {connected ? 'Live' : 'Reconnecting'}
        </div>
      </div>

      {/* Scheduled state */}
      {phase === 'scheduled' && scheduledD && (
        <div className="card p-5" style={{ borderColor:'rgba(245,166,35,0.25)', background:'rgba(245,166,35,0.05)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>
            <span className="text-xs font-mono text-amber-400">Disruption Scheduled</span>
          </div>
          <p className="font-display font-semibold text-white">{scheduledD.storeName}</p>
          <p className="text-xs font-mono mt-1" style={{ color:'rgba(238,242,255,0.4)' }}>
            {scheduledD.zone} · {scheduledD.city}
          </p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs font-mono">
            <div className="rounded-lg p-2.5" style={{ background:'rgba(255,255,255,0.05)' }}>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Start</p>
              <p className="text-amber-400 mt-0.5">{scheduledD.startTime}</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ background:'rgba(255,255,255,0.05)' }}>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Workers</p>
              <p className="text-white mt-0.5">{scheduledD.affectedTotal}</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ background:'rgba(255,255,255,0.05)' }}>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Severity</p>
              <p className="text-white mt-0.5">{scheduledD.severity}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active state */}
      {(phase === 'active' || phase === 'validating') && activeD && (
        <div className="card p-5 relative overflow-hidden"
          style={{ borderColor:'rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.05)' }}>
          {phase === 'active' && <div className="scan-overlay"/>}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-xs font-mono text-red-400">
              {phase === 'validating' ? 'Running Validation...' : 'Disruption Active'}
            </span>
            {clockMins !== null && (
              <span className="ml-auto text-xs font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>
                {formatTime(clockMins)}
              </span>
            )}
          </div>
          <p className="font-display font-semibold text-white">{activeD.storeName}</p>
          <p className="text-xs font-mono mt-1 mb-4" style={{ color:'rgba(238,242,255,0.4)' }}>
            {activeD.zone} · {activeD.city}
          </p>

          {phase === 'active' && (
            <>
              <div className="flex justify-between text-xs font-mono mb-1"
                style={{ color:'rgba(238,242,255,0.35)' }}>
                <span>Progress</span><span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-4"
                style={{ background:'rgba(255,255,255,0.08)' }}>
                <div className="h-full bg-red-500 rounded-full transition-all duration-1000"
                  style={{ width:`${progress}%` }}/>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl p-3 text-center"
                  style={{ background:'rgba(255,255,255,0.04)' }}>
                  <p className="font-display font-bold text-xl text-white">{activeD.affectedTotal}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>
                    workers in zone
                  </p>
                </div>
                <div className="rounded-xl p-3 text-center"
                  style={{ background:'rgba(35,209,139,0.08)', border:'1px solid rgba(35,209,139,0.15)' }}>
                  <p className="font-display font-bold text-xl text-green-400">{activeD.affectedActive}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>
                    active in shift
                  </p>
                </div>
              </div>
            </>
          )}

          {phase === 'validating' && (
            <div className="flex items-center gap-2 text-xs font-mono"
              style={{ color:'rgba(238,242,255,0.5)' }}>
              <div className="w-3 h-3 border border-blue-400/50 border-t-blue-400 rounded-full animate-spin"/>
              Running validation pipeline for {activeD.affectedActive} workers...
            </div>
          )}
        </div>
      )}

      {/* Completed — worker results stream in */}
      {phase === 'completed' && summary && (
        <div>
          {/* Summary */}
          <div className="card p-4 mb-3"
            style={{ borderColor:'rgba(35,209,139,0.25)', background:'rgba(35,209,139,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={13} color="#23D18B"/>
              <span className="text-xs font-mono text-green-400">Validation Complete</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div>
                <p className="font-bold text-base text-green-400">{summary.approved}</p>
                <p style={{ color:'rgba(238,242,255,0.35)' }}>approved</p>
              </div>
              <div>
                <p className="font-bold text-base text-amber-400">{summary.partial}</p>
                <p style={{ color:'rgba(238,242,255,0.35)' }}>partial</p>
              </div>
              <div>
                <p className="font-bold text-base text-red-400">{summary.blocked}</p>
                <p style={{ color:'rgba(238,242,255,0.35)' }}>blocked</p>
              </div>
              <div>
                <p className="font-bold text-base" style={{ color:'#4F8EF7' }}>
                  ₹{summary.totalDisbursed}
                </p>
                <p style={{ color:'rgba(238,242,255,0.35)' }}>disbursed</p>
              </div>
            </div>
          </div>

          {/* Worker results — animate in */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {results.map((r, i) => {
              const statusCls = {
                approved:'text-green-400', partial_approved:'text-amber-400',
                blocked:'text-red-400', not_applicable:'text-zinc-500'
              }[r.payoutStatus] || 'text-zinc-500'

              return (
                <div key={r.workerId}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl"
                  style={{
                    background:'rgba(255,255,255,0.03)',
                    border:'1px solid rgba(255,255,255,0.06)',
                    animation:'slideIn 0.3s ease forwards',
                  }}>
                  <VerdictIcon verdict={r.verdict}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{r.workerName}</p>
                    <p className="text-[10px] font-mono truncate"
                      style={{ color:'rgba(238,242,255,0.35)' }}>
                      {r.notification}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {r.payoutAmount > 0 ? (
                      <p className="text-xs font-mono font-semibold text-green-400">
                        ₹{r.payoutAmount}
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-zinc-600">—</p>
                    )}
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

function parseTime(str) {
  if (!str) return 0
  const [h,m] = str.split(':').map(Number)
  return h*60 + m
}
