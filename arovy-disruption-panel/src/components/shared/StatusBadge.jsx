export default function StatusBadge({ status }) {
  const styles = {
    approved:        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    partial_approved:'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    blocked:         'bg-red-500/20 text-red-400 border border-red-500/30',
    not_applicable:  'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    clean:           'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    suspicious:      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    partial:         'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    ineligible:      'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  }
  const labels = {
    approved:        'Approved',
    partial_approved:'Partial',
    blocked:         'Blocked',
    not_applicable:  'Ineligible',
    clean:           'Clean',
    suspicious:      'Suspicious',
    partial:         'Partial',
    ineligible:      'Ineligible',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] || styles.not_applicable}`}>
      {labels[status] || status}
    </span>
  )
}