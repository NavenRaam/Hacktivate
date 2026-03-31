'use client'
import { useState, useEffect } from 'react'
import { CloudRain, Wind, Zap, AlertTriangle, ChevronDown } from 'lucide-react'
import { computeSeverity, severityLabel, parseTime, formatTime } from '@/lib/data'

const TYPES = [
  { value: 'heavy_rainfall',    label: 'Heavy Rainfall',    icon: CloudRain,      color: '#3B82F6' },
  { value: 'aqi_heat',          label: 'AQI / Heat Stress', icon: Wind,           color: '#F59E0B' },
  { value: 'store_downtime',    label: 'Store Downtime',    icon: Zap,            color: '#EF4444' },
  { value: 'social_disruption', label: 'Social Disruption', icon: AlertTriangle,  color: '#8B5CF6' },
]

const SCOPE_OPTIONS = ['localized', 'area_wide', 'city_wide']

export default function DisruptionForm({ store, onSchedule, onClose }) {
  const [type,       setType]       = useState('heavy_rainfall')
  const [startTime,  setStartTime]  = useState('10:00')
  const [duration,   setDuration]   = useState(3)
  const [params,     setParams]     = useState({
    rainfall_mm: 55, aqi: 0, temperature: 28,
    downtime_minutes: 120, scope: 'localized'
  })
  const [severity,   setSeverity]   = useState(0)

  // recompute severity whenever type or params change
  useEffect(() => {
    const s = computeSeverity(type, params)
    setSeverity(+s.toFixed(2))
  }, [type, params])

  const setParam = (key, val) => setParams(prev => ({ ...prev, [key]: val }))

  const endTime = formatTime(parseTime(startTime) + duration * 60)

  const sl = severityLabel(severity)

  const handleSubmit = () => {
    onSchedule({ type, params, startTime, endTime, durationHours: duration, severity })
  }

  const selectedType = TYPES.find(t => t.value === type)
  const Icon = selectedType?.icon

  return (
    <div className="flex flex-col h-full">
      {/* Store header */}
      <div className="p-5 border-b border-white/6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-white/30 uppercase mb-1">
              Dark Store · {store.city}
            </p>
            <h2 className="font-display text-lg font-semibold text-white leading-tight">
              {store.name}
            </h2>
            <p className="text-sm text-white/40 mt-0.5">{store.zone}</p>
          </div>
          <button onClick={onClose}
            className="text-white/25 hover:text-white/60 transition-colors text-xs mt-1">
            ✕
          </button>
        </div>

        {/* Store meta pills */}
        <div className="flex gap-2 mt-3">
          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-[11px] text-white/50 font-mono">
            {store.worker_count} workers
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono border ${
            store.reliability >= 0.7
              ? 'bg-green-500/8 border-green-500/20 text-green-400'
              : store.reliability >= 0.5
              ? 'bg-amber-500/8 border-amber-500/20 text-amber-400'
              : 'bg-red-500/8 border-red-500/20 text-red-400'
          }`}>
            {Math.round(store.reliability * 100)}% uptime
          </span>
        </div>
      </div>

      {/* Scrollable form area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Disruption type */}
        <div>
          <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
            Disruption Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => {
              const TIcon = t.icon
              return (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    type === t.value
                      ? 'border-opacity-40 bg-opacity-10'
                      : 'border-white/6 bg-white/3 hover:bg-white/6'
                  }`}
                  style={type === t.value ? {
                    borderColor: t.color + '60',
                    backgroundColor: t.color + '10'
                  } : {}}>
                  <TIcon size={14} style={{ color: type === t.value ? t.color : 'rgba(255,255,255,0.3)' }}/>
                  <span className={`text-xs font-medium ${
                    type === t.value ? 'text-white' : 'text-white/50'
                  }`}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic params based on type */}
        {type === 'heavy_rainfall' && (
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
              Rainfall Intensity (mm/hr)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} step={1}
                value={params.rainfall_mm}
                onChange={e => setParam('rainfall_mm', +e.target.value)}
                className="flex-1 accent-blue-500 h-1"
              />
              <span className="font-mono text-sm text-white w-12 text-right">
                {params.rainfall_mm}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>0</span><span>20 ↑ trigger</span><span>40</span><span>60+</span>
            </div>
          </div>
        )}

        {type === 'aqi_heat' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
                AQI Reading
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={500} step={5}
                  value={params.aqi}
                  onChange={e => setParam('aqi', +e.target.value)}
                  className="flex-1 accent-amber-500 h-1"/>
                <span className="font-mono text-sm text-white w-12 text-right">{params.aqi}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
                Temperature (°C)
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={25} max={50} step={0.5}
                  value={params.temperature}
                  onChange={e => setParam('temperature', +e.target.value)}
                  className="flex-1 accent-orange-500 h-1"/>
                <span className="font-mono text-sm text-white w-12 text-right">{params.temperature}°</span>
              </div>
            </div>
          </div>
        )}

        {type === 'store_downtime' && (
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
              Downtime Duration (minutes)
            </label>
            <div className="flex items-center gap-3">
              <input type="range" min={30} max={480} step={15}
                value={params.downtime_minutes}
                onChange={e => setParam('downtime_minutes', +e.target.value)}
                className="flex-1 accent-red-500 h-1"/>
              <span className="font-mono text-sm text-white w-16 text-right">
                {params.downtime_minutes}m
              </span>
            </div>
            <p className="text-[10px] text-white/25 mt-1 font-mono">
              severity = {params.downtime_minutes}/480 = {(params.downtime_minutes/480).toFixed(2)}
            </p>
          </div>
        )}

        {type === 'social_disruption' && (
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
              Disruption Scope
            </label>
            <div className="space-y-1.5">
              {SCOPE_OPTIONS.map(s => (
                <button key={s} onClick={() => setParam('scope', s)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                    border text-sm transition-all ${
                    params.scope === s
                      ? 'border-purple-500/40 bg-purple-500/10 text-white'
                      : 'border-white/6 bg-white/3 text-white/50 hover:bg-white/6'
                  }`}>
                  <span className="capitalize">{s.replace('_',' ')}</span>
                  <span className="font-mono text-xs">
                    {s === 'localized' ? '0.5' : s === 'area_wide' ? '0.8' : '1.0'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Severity display — live computed */}
        <div className={`rounded-xl border p-4 transition-all duration-500 ${
          severity === 0     ? 'border-white/8 bg-white/3'
          : severity <= 0.4  ? 'border-amber-500/25 bg-amber-500/5'
          : severity <= 0.7  ? 'border-orange-500/25 bg-orange-500/5'
          : 'border-red-500/30 bg-red-500/8'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
              Computed Severity
            </span>
            <span className="font-mono text-xs font-semibold" style={{ color: sl.color }}>
              {sl.text}
            </span>
          </div>
          <div className="flex items-end gap-3">
            <span className="font-display text-4xl font-bold" style={{ color: sl.color }}>
              {severity.toFixed(1)}
            </span>
            <div className="flex-1 pb-2">
              <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${severity * 100}%`, backgroundColor: sl.color }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Timing */}
        <div>
          <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
            Start Time
          </label>
          <input
            type="time" value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                       text-white font-mono text-sm focus:outline-none focus:border-blue-500/50
                       transition-colors"/>
        </div>

        <div>
          <label className="block text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
            Duration (hours)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${
                  duration === d
                    ? 'bg-blue-600/70 text-white border border-blue-500/50'
                    : 'bg-white/5 text-white/40 border border-white/8 hover:bg-white/8'
                }`}>
                {d}h
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/25 font-mono mt-2">
            {startTime} → {endTime}
          </p>
        </div>

      </div>

      {/* Schedule button */}
      <div className="p-5 border-t border-white/6">
        <button
          onClick={handleSubmit}
          disabled={severity === 0}
          className={`w-full py-3 rounded-xl font-display font-semibold text-sm
            transition-all duration-300 flex items-center justify-center gap-2 ${
            severity === 0
              ? 'bg-white/5 text-white/25 cursor-not-allowed'
              : severity >= 0.8
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
          }`}>
          {severity === 0 ? 'Configure disruption above' : (
            <>
              <Icon size={14}/>
              Schedule Disruption · {startTime}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
