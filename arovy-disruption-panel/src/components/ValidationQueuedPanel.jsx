'use client'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export default function ValidationQueuedPanel({ event }) {
  return (
    <div className="rounded-2xl border border-green-500/25 bg-green-950/10 p-5
                    animate-[fadeUp_0.4s_ease_forwards]">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={15} className="text-green-400"/>
        <span className="text-[10px] font-mono tracking-widest text-green-400 uppercase">
          Disruption Ended
        </span>
      </div>

      <p className="font-display font-semibold text-white text-base mb-1">
        {event.store.name}
      </p>
      <p className="text-xs text-white/40 mb-4">
        {event.startTime} – {event.endTime} · {event.durationHours}h duration
      </p>

      <div className="bg-white/5 rounded-xl p-3 mb-4">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">
          Affected Workers
        </p>
        <p className="text-3xl font-display font-bold text-white">
          {event.affected.active}
          <span className="text-base text-white/30 font-normal ml-1">
            / {event.affected.total}
          </span>
        </p>
        <p className="text-xs text-white/35 mt-1">active during disruption window</p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/8
                      border border-blue-500/20">
        <div className="flex-1">
          <p className="text-xs text-blue-300 font-medium">Validation pipeline queued</p>
          <p className="text-[11px] text-blue-400/60 mt-0.5">
            Results visible in Admin Dashboard
          </p>
        </div>
        <ArrowRight size={14} className="text-blue-400/40 shrink-0"/>
      </div>

      <p className="text-[10px] text-white/20 font-mono mt-3 text-center">
        event_id · {event.eventId}
      </p>
    </div>
  )
}
