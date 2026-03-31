import { severityLabel } from '@/lib/data'

export default function SeverityBar({ value, showLabel = true }) {
  const { text, color } = severityLabel(value)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width:`${value*100}%`, background:color }}/>
      </div>
      {showLabel && (
        <span className="font-mono text-xs w-14 text-right" style={{ color }}>
          {value} · {text}
        </span>
      )}
    </div>
  )
}
