// Lightweight helpers safe to use in client components
// Does NOT import the full dataset JSON

export function formatTime(totalMinutes) {
  const h = Math.floor((totalMinutes || 0) / 60) % 24
  const m = (totalMinutes || 0) % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export function parseTime(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

export const BACKEND = 'http://localhost:3002'
