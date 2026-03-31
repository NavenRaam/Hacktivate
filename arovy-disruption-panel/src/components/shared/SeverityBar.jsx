export default function SeverityBar({ severity, label }) {
  const pct   = Math.round(severity * 100)
  const color = severity >= 0.8 ? 'bg-red-500'
              : severity >= 0.5 ? 'bg-orange-500'
              : 'bg-yellow-500'
  return (
    <div>
      {label && <p className="text-xs text-white/50 mb-1">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700`}
               style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-mono text-white/70 w-8">{severity}</span>
      </div>
    </div>
  )
}