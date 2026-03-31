'use client'
import { IndianRupee, Users, CheckCircle, XCircle, AlertCircle, ShieldAlert } from 'lucide-react'

export default function PayoutSummary({ data }) {
  if (!data) return null

  const { summary, marketCrash } = data

  const cards = [
    { label: 'Total Workers',  value: summary.totalWorkers,  icon: <Users size={16}/>,          color: 'text-blue-400'   },
    { label: 'Approved',       value: summary.approved,      icon: <CheckCircle size={16}/>,    color: 'text-emerald-400'},
    { label: 'Partial',        value: summary.partial,       icon: <AlertCircle size={16}/>,    color: 'text-yellow-400' },
    { label: 'Blocked',        value: summary.blocked,       icon: <XCircle size={16}/>,        color: 'text-red-400'    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Payout Summary</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {cards.map(c => (
            <div key={c.label} className="bg-white/3 rounded-xl p-3">
              <div className={`flex items-center gap-1.5 ${c.color} mb-1`}>
                {c.icon}
                <span className="text-xs text-white/50">{c.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <IndianRupee size={18}/>
            <span className="text-sm font-medium">Total Disbursed</span>
          </div>
          <span className="text-2xl font-bold text-emerald-400 font-mono">
            ₹{summary.totalDisbursed.toFixed(2)}
          </span>
        </div>
      </div>

      {marketCrash?.activated && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <ShieldAlert size={16}/>
            <span className="text-sm font-bold">Market Crash Controls Active</span>
          </div>
          <p className="text-xs text-red-400/70">
            Coverage reduced to 75% · Hard cap ₹250 per worker · Premium rebalancing queued
          </p>
          <p className="text-xs text-red-400/50 mt-1">
            Cluster risk score: {marketCrash.clusterRiskScore}
          </p>
        </div>
      )}
    </div>
  )
}