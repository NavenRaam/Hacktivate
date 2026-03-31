export function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export function getCountdown(systemMinutes, eventStartMinutes) {
  const diff = eventStartMinutes - systemMinutes
  if (diff <= 0) return null
  return diff
}

export function isDisruptionActive(systemMinutes, startMinutes, endMinutes) {
  return systemMinutes >= startMinutes && systemMinutes < endMinutes
}

export function isDisruptionEnded(systemMinutes, endMinutes) {
  return systemMinutes >= endMinutes
}

export function getProgressPercent(systemMinutes, startMinutes, endMinutes) {
  if (systemMinutes < startMinutes) return 0
  if (systemMinutes >= endMinutes) return 100
  return Math.round(((systemMinutes - startMinutes) / (endMinutes - startMinutes)) * 100)
}