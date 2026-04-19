// api.js — centralised backend service
// Change BACKEND_URL for deployment

export const BACKEND_URL = 'http://172.18.171.28:3002'

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    opts.body = JSON.stringify(body)
    console.log('Sending data:', body)
  }
  const res  = await fetch(`${BACKEND_URL}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ─── Auth ────────────────────────────────────────────────
export const login = (username, password) =>
  request('POST', '/api/auth/login', { username, password })

export const refreshProfile = (workerId) =>
  request('GET', `/api/auth/worker/${workerId}`)

// ─── Workers ─────────────────────────────────────────────
export const getWorker = (id) =>
  request('GET', `/api/workers/${id}`)

// ─── Disruptions ─────────────────────────────────────────
export const getActiveDisruption = () =>
  request('GET', '/api/disruptions/active')

export const getAllDisruptions = () =>
  request('GET', '/api/disruptions')

// ─── Stats ────────────────────────────────────────────────
export const getStats = () =>
  request('GET', '/api/stats')

// ─── SSE events ───────────────────────────────────────────
// Returns an EventSource — caller manages lifecycle
export function subscribeToEvents(handlers) {
  const es = new EventSource(`${BACKEND_URL}/api/events`)

  const on = (event, key) => {
    es.addEventListener(event, e => {
      try { handlers[key]?.(JSON.parse(e.data)) } catch {}
    })
  }

  on('init',                 'onInit')
  on('clock',                'onClock')
  on('disruption:scheduled', 'onScheduled')
  on('disruption:active',    'onActive')
  on('disruption:completed', 'onCompleted')

  return es
}
