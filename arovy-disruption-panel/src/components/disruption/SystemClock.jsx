'use client'
import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, FastForward, SkipForward } from 'lucide-react'
import { formatTime, parseTime } from '@/lib/clock'

export default function SystemClock({ onTimeChange, scheduledStart }) {
  const [minutes, setMinutes]   = useState(parseTime('09:00'))
  const [running, setRunning]   = useState(false)
  const [speed, setSpeed]       = useState(1)

  const tick = useCallback(() => {
    setMinutes(prev => {
      const next = prev + 1
      onTimeChange?.(next)
      return next
    })
  }, [onTimeChange])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(tick, 1000 / speed)
    return () => clearInterval(interval)
  }, [running, speed, tick])

  const jumpToPreEvent = () => {
    const start = parseTime(scheduledStart || '10:00')
    const pre   = start - 10
    setMinutes(pre)
    onTimeChange?.(pre)
  }

  const reset = () => {
    setMinutes(parseTime('09:00'))
    setRunning(false)
    onTimeChange?.(parseTime('09:00'))
  }

  const startMins  = parseTime(scheduledStart || '10:00')
  const countdown  = startMins - minutes
  const isPre      = countdown > 0
  const isActive   = countdown <= 0 && minutes < startMins + 180

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">System Clock</p>

      <div className="flex items-end gap-3 mb-4">
        <span className="text-5xl font-mono font-bold text-white tracking-tight">
          {formatTime(minutes)}
        </span>
        <span className="text-sm text-white/40 mb-1">IST</span>
      </div>

      {isPre && countdown <= 20 && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm font-medium">
            ⚡ Disruption starting in {countdown} min
          </p>
        </div>
      )}

      {!isPre && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm font-medium animate-pulse">
            🔴 Disruption Active
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setRunning(r => !r)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
          {running ? <Pause size={14}/> : <Play size={14}/>}
          {running ? 'Pause' : 'Run'}
        </button>

        <button onClick={jumpToPreEvent}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition">
          <SkipForward size={14}/> Jump to T-10
        </button>

        <button onClick={reset}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition">
          Reset
        </button>
      </div>

      <div className="flex gap-2">
        {[1, 5, 10, 30].map(s => (
          <button key={s} onClick={() => setSpeed(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition
              ${speed === s
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}