'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import TrustMeter from '@/components/shared/TrustMeter'

const VERDICT_ICON = {
  clean:      <CheckCircle size={14} className="text-emerald-400"/>,
  partial:    <AlertCircle size={14} className="text-orange-400"/>,
  suspicious: <AlertCircle size={14} className="text-yellow-400"/>,
  blocked:    <XCircle size={14} className="text-red-400"/>,
  ineligible: <XCircle size={14} className="text-zinc-500"/>,
}

export default function WorkerPipeline({ results, loading }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    if (!results?.length) { setVisible([]); return }
    setVisible([])
    results.forEach((r, i) => {
      setTimeout(() => setVisible(prev => [...prev, r]), i * 80)
    })
  }, [results])

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Validation Pipeline</p>
        <div className="flex items-center gap-3 text-white/40">
          <Clock size={16} className="animate-spin"/>
          <span className="text-sm">Running validation...</span>
        </div>
      </div>
    )
  }

  if (!visible.length) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Validation Pipeline</p>
        <p className="text-sm text-white/30">Trigger a disruption to see results</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-4">
        Validation Pipeline · {results.length} workers
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {visible.map((r, i) => (
          <div key={r.workerId}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5
                       animate-in fade-in slide-in-from-left-2 duration-300">

            <span className="shrink-0">{VERDICT_ICON[r.fraud.verdict]}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-white font-medium truncate">{r.workerName}</p>
                <StatusBadge status={r.outcome.payoutStatus}/>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-white/40">{r.zone}</span>
                <TrustMeter score={r.fraud.trustScore}/>
              </div>
              {r.outcome.payoutAmount > 0 && (
                <p className="text-xs text-emerald-400 mt-0.5 font-mono">
                  ₹{r.outcome.payoutAmount.toFixed(2)}
                </p>
              )}
              {r.fraud.flags?.length > 0 && (
                <p className="text-xs text-red-400/70 mt-0.5 truncate">
                  {r.fraud.flags[0]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}