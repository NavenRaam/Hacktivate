import { trustLabel } from '@/lib/data'

export default function TrustRing({ score, size = 48 }) {
  const { color } = trustLabel(score)
  const pct    = Math.round(score * 100)
  const r      = (size / 2) - 4
  const circ   = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 0.6s ease' }}/>
      </svg>
      <span className="absolute font-mono text-white font-semibold"
        style={{ fontSize: size * 0.22 }}>
        {pct}
      </span>
    </div>
  )
}
