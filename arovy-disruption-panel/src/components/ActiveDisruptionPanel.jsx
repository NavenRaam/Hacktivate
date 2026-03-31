'use client'
import { useEffect, useState } from 'react'
import { formatTime, parseTime, severityLabel } from '@/lib/data'
import { Users, Clock, Zap } from 'lucide-react'

export default function ActiveDisruptionPanel({ event, systemMinutes, onEnd }) {
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState(0)

  const startMins = parseTime(event.startTime)
  const endMins   = startMins + event.durationHours * 60

  useEffect(() => {
    const el  = Math.max(0, systemMinutes - startMins)
    const dur = event.durationHours * 60
    const pct = Math.min(100, (el / dur) * 100)
    setElapsed(el)
    setProgress(pct)

    if (systemMinutes >= endMins) {
      onEnd?.()
    }
  }, [systemMinutes])

  const sl = severityLabel(event.severity)
  const remaining = Math.max(0, endMins - systemMinutes)

  return (
    <div className="relative rounded-2xl border border-red-500/30 bg-red-950/15 overflow-hidden">
      {/* scan line */}
      <div className="scan-overlay"/>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase">
              Disruption Active
            </span>
          </div>
          <div className="ml-auto text-[10px] font-mono text-white/25">
            ends {formatTime(endMins)}
          </div>
        </div>

        {/* Store info */}
        <p className="font-display font-semibold text-white text-base leading-tight">
          {event.store.name}
        </p>
        <p className="text-xs text-white/40 mb-4">
          {event.store.zone} · {event.store.city}
        </p>

        {/* Severity */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Severity</span>
          <span className="font-mono text-sm font-semibold" style={{ color: sl.color }}>
            {event.severity} · {sl.text}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-white/30 mb-1">
              <Users size={11}/>
              <span className="text-[10px] font-mono">Total</span>
            </div>
            <p className="text-xl font-display font-bold text-white">
              {event.affected.total}
            </p>
          </div>
          <div className="bg-green-500/8 border border-green-500/15 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-400/60 mb-1">
              <Users size={11}/>
              <span className="text-[10px] font-mono">Active</span>
            </div>
            <p className="text-xl font-display font-bold text-green-400">
              {event.affected.active}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-white/30 mb-1">
              <Clock size={11}/>
              <span className="text-[10px] font-mono">Remain</span>
            </div>
            <p className="text-xl font-display font-bold text-white font-mono">
              {formatTime(remaining)}
            </p>
          </div>
        </div>

        {/* Type pill */}
        <div className="mt-4 flex items-center gap-2">
          <Zap size={11} className="text-white/25"/>
          <span className="text-[11px] text-white/35 font-mono capitalize">
            {event.type.replace(/_/g,' ')} ·{' '}
            {event.type === 'heavy_rainfall'    ? `${event.params.rainfall_mm}mm/hr` :
             event.type === 'aqi_heat'          ? `AQI ${event.params.aqi} · ${event.params.temperature}°C` :
             event.type === 'store_downtime'    ? `${event.params.downtime_minutes}min offline` :
             event.params.scope?.replace('_',' ')}
          </span>
        </div>
      </div>
    </div>
  )
}
