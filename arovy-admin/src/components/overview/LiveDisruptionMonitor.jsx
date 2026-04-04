'use client'
import { useState } from 'react'
import { useSystemEvents } from '@/lib/useSystemEvents'
import { formatTime } from '@/lib/dataHelpers'
import {
  CheckCircle2, XCircle, AlertCircle, MinusCircle,
  Wifi, WifiOff, Database, CreditCard
} from 'lucide-react'

const BACKEND = 'http://localhost:3002'

function VerdictIcon({ verdict }) {
  const map = {
    clean:      <CheckCircle2 size={13} color="#23D18B"/>,
    partial:    <AlertCircle  size={13} color="#F5A623"/>,
    suspicious: <AlertCircle  size={13} color="#F97316"/>,
    blocked:    <XCircle      size={13} color="#F5532D"/>,
    ineligible: <MinusCircle  size={13} color="#6B7280"/>,
  }
  return map[verdict] || map.ineligible
}

// Phase labels and colors
const PHASE_CONFIG = {
  idle:       { label:'No Active Event',  color:'rgba(238,242,255,0.3)',  dot:'bg-zinc-600'             },
  scheduled:  { label:'Scheduled',        color:'#F5A623',                dot:'bg-amber-500 animate-pulse'},
  active:     { label:'Disruption Active',color:'#F5532D',                dot:'bg-red-500 animate-pulse' },
  validating: { label:'Running Validation',color:'#4F8EF7',               dot:'bg-blue-500 animate-pulse'},
  validated:  { label:'Validation Done',  color:'#4F8EF7',                dot:'bg-blue-500'              },
  paying:     { label:'Processing Payouts',color:'#8B7FED',               dot:'bg-iris-500 animate-pulse'},
  completed:  { label:'Completed',        color:'#23D18B',                dot:'bg-green-500'             },
}

export default function LiveDisruptionMonitor() {
  const [clockMins,    setClockMins]    = useState(null)
  const [phase,        setPhase]        = useState('idle')
  const [activeD,      setActiveD]      = useState(null)
  const [scheduledD,   setScheduledD]   = useState(null)
  const [results,      setResults]      = useState([])
  const [summary,      setSummary]      = useState(null)
  const [razorpay,     setRazorpay]     = useState(null)
  const [datasetUpdate,setDatasetUpdate]= useState(null)
  const [progress,     setProgress]     = useState(0)

  const connected = true // SSE connection status handled internally
  useSystemEvents({
      onInit: (d) => {
        if (d.clock) setClockMins(d.clock.minutes)
        if (d.activeDisruption) { setActiveD(d.activeDisruption); setPhase('active') }
      },
      onClock: (d) => {
        setClockMins(d.minutes)
        if (activeD) {
          const start = parseTime(activeD.startTime)
          const dur   = activeD.durationHours * 60
          setProgress(Math.min(100, Math.max(0, ((d.minutes - start) / dur) * 100)))
        }
      },
      onScheduled:  (d) => { setScheduledD(d); setPhase('scheduled'); setResults([]); setSummary(null) },
      onActive:     (d) => { setActiveD(d); setPhase('active'); setScheduledD(null); setResults([]); setProgress(0) },
      onValidating: ()  => setPhase('validating'),
      onValidated:  (d) => {
        setPhase('validated')
        setSummary(d.summary)
        // stream results in one by one
        d.results.forEach((r, i) => {
          setTimeout(() => setResults(prev => [...prev, r]), i * 100)
        })
      },
      onPaying:     ()  => setPhase('paying'),
      onCompleted:  (d) => {
        setPhase('completed')
        setSummary(d.summary)
        setRazorpay(d.razorpay)
        setDatasetUpdate(d.datasetUpdate)
        // update results with razorpay data
        if (d.results) setResults(d.results)
      },
  })

  const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG.idle

  if (phase === 'idle') {
    return (
      <div className="card p-6 flex flex-col items-center justify-center min-h-48 text-center">
        <div className={`flex items-center gap-2 mb-3`}
          style={{ color: connected ? '#23D18B' : '#F5532D' }}>
          {connected ? <Wifi size={14}/> : <WifiOff size={14}/>}
          <span className="text-xs font-mono">
            {connected ? 'Connected · watching for events' : 'Backend offline'}
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
    <div className="space-y-3">

      {/* Phase status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
          <span className="text-xs font-mono" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        {clockMins !== null && (
          <span className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>
            {formatTime(clockMins)}
          </span>
        )}
      </div>

      {/* Active disruption card */}
      {(phase === 'active' || phase === 'validating' || phase === 'validated' || phase === 'paying') && activeD && (
        <div className="card p-4"
          style={{ borderColor:'rgba(245,83,45,0.25)', background:'rgba(245,83,45,0.04)' }}>
          <p className="font-display font-semibold text-white text-sm">{activeD.storeName}</p>
          <p className="text-xs font-mono mt-0.5 mb-3" style={{ color:'rgba(238,242,255,0.4)' }}>
            {activeD.zone} · {activeD.city} · {activeD.startTime}–{activeD.endTime}
          </p>

          {phase === 'active' && (
            <>
              <div className="flex justify-between text-xs font-mono mb-1"
                style={{ color:'rgba(238,242,255,0.35)' }}>
                <span>Progress</span><span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-3"
                style={{ background:'rgba(255,255,255,0.08)' }}>
                <div className="h-full bg-red-500 rounded-full transition-all duration-1000"
                  style={{ width:`${progress}%` }}/>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 text-center"
              style={{ background:'rgba(255,255,255,0.04)' }}>
              <p className="font-display font-bold text-lg text-white">{activeD.affectedTotal}</p>
              <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>in zone</p>
            </div>
            <div className="rounded-lg p-2 text-center"
              style={{ background:'rgba(35,209,139,0.06)', border:'1px solid rgba(35,209,139,0.12)' }}>
              <p className="font-display font-bold text-lg text-green-400">{activeD.affectedActive}</p>
              <p className="text-xs font-mono" style={{ color:'rgba(238,242,255,0.35)' }}>active</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation summary */}
      {summary && (
        <div className="card p-4"
          style={{ borderColor:'rgba(35,209,139,0.2)', background:'rgba(35,209,139,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={13} color="#23D18B"/>
            <span className="text-xs font-mono text-green-400">Validation Complete</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono mb-3">
            {[
              [summary.approved,  '#23D18B', '✓'],
              [summary.partial,   '#F5A623', '~'],
              [summary.blocked,   '#F5532D', '✗'],
              [summary.ineligible,'#6B7280', '—'],
            ].map(([v,c,icon], i) => (
              <div key={i}>
                <p className="font-bold text-base" style={{ color:c }}>{v}</p>
                <p style={{ color:'rgba(238,242,255,0.35)' }}>{icon}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-xl" style={{ color:'#23D18B' }}>
              ₹{summary.totalDisbursed}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(238,242,255,0.35)' }}>
              total disbursed
            </p>
          </div>
        </div>
      )}

      {/* Razorpay batch summary */}
      {razorpay && (
        <div className="card p-4"
          style={{ borderColor:'rgba(139,127,237,0.2)', background:'rgba(139,127,237,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={13} color="#8B7FED"/>
            <span className="text-xs font-mono" style={{ color:'#8B7FED' }}>
              Razorpay Payouts
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
            <div>
              <p className="font-bold" style={{ color:'#23D18B' }}>{razorpay.succeeded}</p>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>succeeded</p>
            </div>
            <div>
              <p className="font-bold" style={{ color:'#F5532D' }}>{razorpay.failed}</p>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>failed</p>
            </div>
            <div>
              <p className="font-bold" style={{ color:'#6B7280' }}>{razorpay.skipped}</p>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>skipped</p>
            </div>
          </div>
          <p className="text-xs font-mono text-center mt-2" style={{ color:'#23D18B' }}>
            ₹{razorpay.totalPaid} transferred
          </p>
        </div>
      )}

      {/* Dataset update summary */}
      {datasetUpdate && (
        <div className="card p-4"
          style={{ borderColor:'rgba(79,142,247,0.2)', background:'rgba(79,142,247,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Database size={13} color="#4F8EF7"/>
            <span className="text-xs font-mono" style={{ color:'#4F8EF7' }}>
              Dataset Updated
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Workers updated</p>
              <p className="font-bold text-white mt-0.5">{datasetUpdate.updated_count}</p>
            </div>
            <div>
              <p style={{ color:'rgba(238,242,255,0.35)' }}>Avg trust delta</p>
              <p className="font-bold mt-0.5"
                style={{ color: datasetUpdate.avg_trust_delta >= 0 ? '#23D18B' : '#F5532D' }}>
                {datasetUpdate.avg_trust_delta > 0 ? '+' : ''}{datasetUpdate.avg_trust_delta}
              </p>
            </div>
          </div>
          <p className="text-xs font-mono mt-2" style={{ color:'rgba(238,242,255,0.3)' }}>
            Trust scores, baseline income and premiums recalculated
          </p>
        </div>
      )}

      {/* Streaming worker results */}
      {results.length > 0 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {results.map((r, i) => (
            <div key={r.workerId || r.worker_id || i}
              className="flex items-center gap-2.5 p-2.5 rounded-xl"
              style={{
                background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.06)',
              }}>
              <VerdictIcon verdict={r.verdict}/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{r.workerName}</p>
                <p className="text-xs font-mono truncate"
                  style={{ color:'rgba(238,242,255,0.35)' }}>
                  {r.passedChecks}/{r.totalChecks} checks · {r.notification?.slice(0,50)}…
                </p>
              </div>
              {r.payoutAmount > 0 ? (
                <p className="text-xs font-mono font-semibold text-green-400 shrink-0">
                  ₹{r.payoutAmount}
                </p>
              ) : (
                <p className="text-xs font-mono shrink-0" style={{ color:'rgba(238,242,255,0.2)' }}>—</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function parseTime(str) {
  if (!str) return 0
  const [h,m] = str.split(':').map(Number)
  return h * 60 + m
}
