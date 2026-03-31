export default function StatCard({ label, value, sub, accent, icon, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-widest"
          style={{ color:'rgba(238,242,255,0.35)' }}>
          {label}
        </p>
        {icon && (
          <span className="text-lg leading-none">{icon}</span>
        )}
      </div>
      <p className="font-display font-bold text-3xl text-white leading-none mb-1"
        style={accent ? { color: accent } : {}}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color:'rgba(238,242,255,0.38)' }}>{sub}</p>
      )}
    </div>
  )
}
