'use client'
import { useState } from 'react'
import { useSystemEvents } from '@/lib/useSystemEvents'
import { formatTime } from '@/lib/dataHelpers'

export default function LiveClock() {
  const [minutes, setMinutes] = useState(null)
  const [active,  setActive]  = useState(false)

  useSystemEvents({
    onInit:   (d) => { if (d.clock) setMinutes(d.clock.minutes) },
    onClock:  (d) => setMinutes(d.minutes),
    onActive: ()  => setActive(true),
    onCompleted: () => setActive(false),
  })

  if (minutes === null) return null

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
      active
        ? 'border-red-500/30 bg-red-500/8'
        : 'border-white/8 bg-white/4'
    }`}>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>}
      <span className="font-mono text-sm font-semibold text-white">
        {formatTime(minutes)}
      </span>
      <span className="text-[10px] font-mono" style={{ color:'rgba(238,242,255,0.3)' }}>IST</span>
    </div>
  )
}
