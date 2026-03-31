'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react'
import { formatTime, parseTime } from '@/lib/data'

const BACKEND = 'http://localhost:3002'
const SPEEDS  = [1, 5, 10, 30, 60]

export default function SystemClock({ onTick, scheduledStart, scheduledEnd, disruptionActive }) {
  const [minutes, setMinutes]  = useState(parseTime('08:00'))
  const [running, setRunning]  = useState(false)
  const [speed,   setSpeed]    = useState(1)
  const tickRef                = useRef(null)
  const lastPushedRef          = useRef(null)

  const pushTick = useCallback(async (mins) => {
    if (lastPushedRef.current === mins) return
    lastPushedRef.current = mins
    try {
      await fetch(`${BACKEND}/api/clock/tick`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: mins }),
      })
    } catch { /* backend offline - still works locally */ }
  }, [])

  const tick = useCallback(() => {
    setMinutes(prev => {
      const next = (prev + 1) % (24 * 60)
      onTick?.(next)
      pushTick(next)
      return next
    })
  }, [onTick, pushTick])

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (!running) return
    tickRef.current = setInterval(tick, Math.max(50, 1000 / speed))
    return () => clearInterval(tickRef.current)
  }, [running, speed, tick])

  useEffect(() => {
    fetch(`${BACKEND}/api/clock/set`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ running, speed }),
    }).catch(() => {})
  }, [running, speed])

  const reset = () => {
    setRunning(false)
    const t = parseTime('08:00')
    setMinutes(t)
    onTick?.(t)
    pushTick(t)
  }

  const jumpToPreEvent = () => {
    if (!scheduledStart) return
    const t = Math.max(0, parseTime(scheduledStart) - 10)
    setMinutes(t)
    onTick?.(t)
    pushTick(t)
  }

  const startMins   = scheduledStart ? parseTime(scheduledStart) : null
  const countdown   = startMins !== null ? startMins - minutes : null
  const isCountdown = countdown !== null && countdown > 0 && countdown <= 15
  const isPost      = scheduledEnd ? minutes >= parseTime(scheduledEnd) : false

  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60

  return (
    <div className="relative">
      <div className={`rounded-2xl border p-5 transition-all duration-700 ${
        disruptionActive
          ? 'border-red-500/40 bg-red-950/20'
          : isCountdown
          ? 'border-amber-500/30 bg-amber-950/10'
          : 'border-white/8 bg-[#131923]'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/30 uppercase">
            System Clock · IST
          </span>
          {disruptionActive && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-end gap-1 mb-1">
          <span className="font-display text-6xl font-bold tracking-tight text-white leading-none">
            {String(h).padStart(2,'0')}
          </span>
          <span className={`text-4xl font-display font-bold mb-1 ${
            disruptionActive ? 'text-red-400' : 'text-white/40'
          }`}>:</span>
          <span className="font-display text-6xl font-bold tracking-tight text-white leading-none">
            {String(m).padStart(2,'0')}
          </span>
        </div>

        <div className="h-5 mb-4">
          {isCountdown && (
            <p className="text-xs font-mono text-amber-400 animate-pulse">
              ⚡ disruption in {countdown}m
            </p>
          )}
          {disruptionActive && !isPost && (
            <p className="text-xs font-mono text-red-400">
              ▶ active · ends {scheduledEnd}
            </p>
          )}
          {isPost && (
            <p className="text-xs font-mono text-green-400">✓ disruption ended</p>
          )}
          {!isCountdown && !disruptionActive && !isPost && (
            <p className="text-xs font-mono text-white/25">nominal · synced to backend</p>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setRunning(r => !r)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              running ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}>
            {running ? <><Pause size={13}/> Pause</> : <><Play size={13}/> Run</>}
          </button>
          {scheduledStart && (
            <button onClick={jumpToPreEvent}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white/60
                         bg-white/5 hover:bg-white/10 transition-all border border-white/8">
              <ChevronRight size={13}/> T−10
            </button>
          )}
          <button onClick={reset}
            className="p-2 rounded-lg text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/8 transition-all ml-auto">
            <RotateCcw size={13}/>
          </button>
        </div>

        <div className="flex gap-1.5">
          {SPEEDS.map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`flex-1 py-1 rounded-md text-[11px] font-mono transition-all ${
                speed === s ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-white/35 hover:bg-white/10'
              }`}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
