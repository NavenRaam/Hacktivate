'use client'
import { useState } from 'react'
import { CloudRain, Zap, Wind, AlertTriangle } from 'lucide-react'
import SeverityBar from '@/components/shared/SeverityBar'

const TYPE_ICONS = {
  heavy_rainfall:   <CloudRain size={16}/>,
  store_downtime:   <Zap size={16}/>,
  aqi_heat:         <Wind size={16}/>,
  social_disruption:<AlertTriangle size={16}/>
}

export default function DisruptionForm({ templates, onSelect, selectedId }) {
  const cities = [...new Set(templates.map(t => t.city))]
  const [city, setCity] = useState(cities[0])

  const filtered = templates.filter(t => t.city === city)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-4">
        Select Disruption Event
      </p>

      <div className="flex gap-2 mb-4">
        {cities.map(c => (
          <button key={c} onClick={() => setCity(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${city === c
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filtered.map(t => (
          <button key={t.template_id} onClick={() => onSelect(t)}
            className={`w-full text-left p-3 rounded-xl border transition
              ${selectedId === t.template_id
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-white/5 bg-white/3 hover:bg-white/8'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`${selectedId === t.template_id ? 'text-blue-400' : 'text-white/40'}`}>
                  {TYPE_ICONS[t.type]}
                </span>
                <div>
                  <p className="text-sm text-white font-medium">{t.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {t.zone} · {t.scheduled_start}–{t.scheduled_end}
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/30 font-mono shrink-0">P{t.priority}</span>
            </div>
            <div className="mt-2">
              <SeverityBar severity={t.severity} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}