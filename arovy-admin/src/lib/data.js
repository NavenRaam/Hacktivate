// data.js — hybrid data layer
// Live data (workers, stores, stats) fetched from arovy-backend on every request
// Historical simulations served from local dataset (stable reference data)

import localDataset from '@/data/dataset.json'

export const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'

// ── Live fetchers (server components — always fresh) ──────

export async function fetchWorkers(params = {}) {
  try {
    const qs  = new URLSearchParams(params).toString()
    const res = await fetch(`${BACKEND}/api/workers${qs ? '?' + qs : ''}`, { cache:'no-store' })
    if (!res.ok) throw new Error('backend unavailable')
    return res.json()
  } catch {
    let w = localDataset.workers
    if (params.city)    w = w.filter(x => x.city === params.city)
    if (params.storeId) w = w.filter(x => x.primary_store_id === params.storeId)
    return w
  }
}

export async function fetchWorkerById(id) {
  try {
    const res = await fetch(`${BACKEND}/api/workers/${id}`, { cache:'no-store' })
    if (!res.ok) throw new Error('not found')
    return res.json()
  } catch {
    return localDataset.workers.find(w => w.worker_id === id) || null
  }
}

export async function fetchStores(params = {}) {
  try {
    const qs  = new URLSearchParams(params).toString()
    const res = await fetch(`${BACKEND}/api/stores${qs ? '?' + qs : ''}`, { cache:'no-store' })
    if (!res.ok) throw new Error('backend unavailable')
    return res.json()
  } catch {
    // Fallback: enrich local stores with worker aggregates
    let stores = localDataset.stores || []
    if (params.city) stores = stores.filter(s => s.city === params.city)
    return stores.map(store => {
      const workers  = (localDataset.workers||[]).filter(w => w.primary_store_id === store.store_id)
      const avgTrust = workers.length ? +(workers.reduce((s,w)=>s+w.trust_profile.trust_score,0)/workers.length).toFixed(3) : 0
      const avgRisk  = workers.length ? +(workers.reduce((s,w)=>s+w.risk_profile.risk_score,0)/workers.length).toFixed(3) : 0
      const pool     = +workers.reduce((s,w)=>s+w.premium.weekly_premium,0).toFixed(2)
      return { ...store, live:{ worker_count:workers.length, active_workers:0, avg_trust:avgTrust, avg_risk:avgRisk, weekly_premium_pool:pool } }
    })
  }
}

export async function fetchStoreById(id) {
  try {
    const res = await fetch(`${BACKEND}/api/stores/${id}`, { cache:'no-store' })
    if (!res.ok) throw new Error('not found')
    return res.json()
  } catch {
    const store = (localDataset.stores||[]).find(s => s.store_id === id) || null
    return store
  }
}

export async function fetchStats() {
  try {
    const res = await fetch(`${BACKEND}/api/stats`, { cache:'no-store' })
    if (!res.ok) throw new Error('backend unavailable')
    return res.json()
  } catch {
    return getGlobalStatsLocal()
  }
}

// ── Sync fallbacks (for client-side & stable data) ────────

export function getAllWorkers()         { return localDataset.workers || [] }
export function getWorkerById(id)      { return (localDataset.workers||[]).find(w => w.worker_id === id) || null }
export function getWorkersByStore(sid) { return (localDataset.workers||[]).filter(w => w.primary_store_id === sid) }
export function getWorkersByCity(city) { return (localDataset.workers||[]).filter(w => w.city === city) }

export function getAllStores()         { return localDataset.stores || [] }
export function getStoreById(id)      { return (localDataset.stores||[]).find(s => s.store_id === id) || null }
export function getStoresByCity(city) { return (localDataset.stores||[]).filter(s => s.city === city) }

// ── Simulations (historical — stable, never changes) ──────
export function getAllSimulations()      { return localDataset.simulation_results || [] }
export function getSimulationDetail(id) {
  const sim = (localDataset.simulation_results||[]).find(s => s.simulation_id === id)
  if (!sim) return null
  return { ...sim, worker_results: sim.worker_results || [] }
}
export function getSimsByCity(city)    { return (localDataset.simulation_results||[]).filter(s => s.city === city) }
export function getRiskPools()         { return localDataset.risk_pools || [] }
export function getRiskPoolByStore(id) { return (localDataset.risk_pools||[]).find(p => p.store_id === id) || null }

export function getWorkerPayoutHistory(workerId) {
  return getAllSimulations().flatMap(sim => {
    const r = (sim.worker_results||[]).find(r => r.worker_id === workerId)
    if (!r) return []
    return [{
      sim_id:      sim.simulation_id,
      label:       sim.label,
      city:        sim.city,
      zone:        sim.zone,
      date:        sim.scheduled_start,
      type:        sim.disruption_type,
      severity:    sim.severity,
      payout:      r.outcome?.payout_amount || 0,
      status:      r.outcome?.payout_status || 'unknown',
      verdict:     r.fraud_signals?.fraud_verdict || 'unknown',
      notification:r.outcome?.notification_message || '',
      flags:       r.fraud_signals?.flags || [],
      calculation: r.payout_calculation || null,
      validation:  r.validation || null,
    }]
  })
}

// ── Live async city overview ──────────────────────────────
export async function getCityOverviewLive(city) {
  const [workers, stores] = await Promise.all([
    fetchWorkers({ city }),
    fetchStores({ city }),
  ])
  const sims       = getSimsByCity(city)
  const totalPayout= sims.reduce((s,sim)=>s+(sim.summary?.total_payout_disbursed||0),0)
  const avgTrust   = workers.length ? +(workers.reduce((s,w)=>s+w.trust_profile.trust_score,0)/workers.length).toFixed(3) : 0
  const avgRisk    = workers.length ? +(workers.reduce((s,w)=>s+w.risk_profile.risk_score,0)/workers.length).toFixed(3) : 0
  const avgPremium = workers.length ? +(workers.reduce((s,w)=>s+w.premium.weekly_premium,0)/workers.length).toFixed(2) : 0
  const totalPremiumPool = +workers.reduce((s,w)=>s+w.premium.weekly_premium,0).toFixed(2)
  return { city, stores, workers, sims, totalPayout, totalWorkers:workers.length, avgTrust, avgRisk, avgPremium, totalPremiumPool }
}

// ── Live global stats ─────────────────────────────────────
export async function getGlobalStatsLive() {
  try {
    return await fetchStats()
  } catch {
    return getGlobalStatsLocal()
  }
}

function getGlobalStatsLocal() {
  const workers = getAllWorkers()
  const sims    = getAllSimulations()
  const totalPayout   = sims.reduce((s,sim)=>s+(sim.summary?.total_payout_disbursed||0),0)
  const totalPremium  = workers.reduce((s,w)=>s+w.premium.weekly_premium,0)
  const avgTrust      = workers.length ? +(workers.reduce((s,w)=>s+w.trust_profile.trust_score,0)/workers.length).toFixed(3) : 0
  const approved      = sims.reduce((s,sim)=>s+(sim.summary?.approved||0),0)
  const blocked       = sims.reduce((s,sim)=>s+(sim.summary?.blocked||0),0)
  const partial       = sims.reduce((s,sim)=>s+(sim.summary?.partial_approved||0),0)
  const crashEvents   = sims.filter(s=>s.market_crash_controls?.activated).length
  const trustDist     = { excellent:0,good:0,moderate:0,low:0,critical:0 }
  workers.forEach(w => { trustDist[w.trust_profile.profile_type]++ })
  const eligDist = { full:0,partial:0,limited:0,not_eligible:0 }
  workers.forEach(w => { eligDist[w.eligibility_tier]++ })
  return { totalWorkers:workers.length, totalStores:getAllStores().length, totalEvents:sims.length, totalPayout:+totalPayout.toFixed(2), totalPremium:+totalPremium.toFixed(2), avgTrust, approved, blocked, partial, crashEvents, trustDist, eligDist }
}

// ── Label helpers ─────────────────────────────────────────
export function severityLabel(s) {
  if (!s||s===0) return { text:'None',     color:'#6B7280', cls:'badge-gray'  }
  if (s<=0.3)    return { text:'Low',      color:'#F5A623', cls:'badge-amber' }
  if (s<=0.5)    return { text:'Moderate', color:'#F97316', cls:'badge-amber' }
  if (s<=0.7)    return { text:'High',     color:'#F5532D', cls:'badge-red'   }
  return               { text:'Critical', color:'#EF4444', cls:'badge-red'   }
}
export function trustLabel(t) {
  if (t>=0.90) return { text:'Excellent', color:'#23D18B', cls:'badge-green' }
  if (t>=0.75) return { text:'Good',      color:'#4F8EF7', cls:'badge-blue'  }
  if (t>=0.55) return { text:'Moderate',  color:'#F5A623', cls:'badge-amber' }
  if (t>=0.35) return { text:'Low',       color:'#F5532D', cls:'badge-red'   }
  return             { text:'Critical',  color:'#EF4444', cls:'badge-red'   }
}
export function eligLabel(e) {
  const m = { full:{text:'Full',cls:'badge-green'}, partial:{text:'Partial',cls:'badge-blue'}, limited:{text:'Limited',cls:'badge-amber'}, not_eligible:{text:'Ineligible',cls:'badge-gray'} }
  return m[e] || m.not_eligible
}
export function planLabel(p) {
  const m = { pro:{text:'Pro',cls:'badge-iris'}, standard:{text:'Standard',cls:'badge-blue'}, basic:{text:'Basic',cls:'badge-gray'} }
  return m[p] || m.basic
}
export function disruptionTypeLabel(t) {
  const m = { heavy_rainfall:{text:'Rainfall',icon:'🌧',color:'#4F8EF7'}, aqi_heat:{text:'AQI/Heat',icon:'🌫',color:'#F5A623'}, store_downtime:{text:'Downtime',icon:'⚡',color:'#F5532D'}, social_disruption:{text:'Social',icon:'🚧',color:'#8B7FED'} }
  return m[t] || { text:t, icon:'•', color:'#6B7280' }
}
export const CITY_COLORS = { Chennai:'#4F8EF7', Bangalore:'#23D18B', Hyderabad:'#F5A623' }
