import dataset from '@/data/dataset.json'

// ─── Workers ────────────────────────────────────────────
export function getAllWorkers()         { return dataset.workers }
export function getWorkerById(id)      { return dataset.workers.find(w => w.worker_id === id) || null }
export function getWorkersByStore(sid) { return dataset.workers.filter(w => w.primary_store_id === sid) }
export function getWorkersByCity(city) { return dataset.workers.filter(w => w.city === city) }

// ─── Stores ─────────────────────────────────────────────
export function getAllStores()         { return dataset.stores }
export function getStoreById(id)       { return dataset.stores.find(s => s.store_id === id) || null }
export function getStoresByCity(city)  { return dataset.stores.filter(s => s.city === city) }

// ─── Disruptions / Simulations ──────────────────────────
export function getAllSimulations()    { return dataset.simulation_results }
export function getSimById(id)         { return dataset.simulation_results.find(s => s.simulation_id === id) || null }
export function getSimsByCity(city)    { return dataset.simulation_results.filter(s => s.city === city) }
export function getSimByStore(sid)     { return dataset.simulation_results.find(s => s.template_id && s.template_id.includes(sid.slice(-2))) || null }

// ─── Risk Pools ─────────────────────────────────────────
export function getRiskPools()         { return dataset.risk_pools }
export function getRiskPoolByStore(id) { return dataset.risk_pools.find(p => p.store_id === id) || null }

// ─── City overview aggregation ──────────────────────────
export function getCityOverview(city) {
  const workers = getWorkersByCity(city)
  const stores  = getStoresByCity(city)
  const sims    = getSimsByCity(city)

  const totalPayout = sims.reduce((s, sim) => s + (sim.summary?.total_payout_disbursed || 0), 0)
  const totalWorkers = workers.length
  const activeWorkers = workers.filter(w => w.current_session?.status === 'active').length
  const avgTrust  = workers.reduce((s, w) => s + w.trust_profile.trust_score, 0) / workers.length
  const avgRisk   = workers.reduce((s, w) => s + w.risk_profile.risk_score, 0) / workers.length
  const avgPremium = workers.reduce((s, w) => s + w.premium.weekly_premium, 0) / workers.length

  return { city, stores, workers, sims, totalPayout, totalWorkers, activeWorkers, avgTrust: +avgTrust.toFixed(2), avgRisk: +avgRisk.toFixed(2), avgPremium: +avgPremium.toFixed(2) }
}

// ─── Global stats ───────────────────────────────────────
export function getGlobalStats() {
  const workers  = getAllWorkers()
  const sims     = getAllSimulations()
  const pools    = getRiskPools()

  const totalPayout    = sims.reduce((s, sim) => s + (sim.summary?.total_payout_disbursed || 0), 0)
  const totalPremium   = workers.reduce((s, w) => s + w.premium.weekly_premium, 0)
  const avgTrust       = workers.reduce((s, w) => s + w.trust_profile.trust_score, 0) / workers.length
  const approved       = sims.reduce((s, sim) => s + (sim.summary?.approved || 0), 0)
  const blocked        = sims.reduce((s, sim) => s + (sim.summary?.blocked || 0), 0)
  const partial        = sims.reduce((s, sim) => s + (sim.summary?.partial_approved || 0), 0)
  const crashEvents    = sims.filter(s => s.market_crash_controls?.activated).length

  const trustDist = { excellent:0, good:0, moderate:0, low:0, critical:0 }
  workers.forEach(w => { trustDist[w.trust_profile.profile_type]++ })

  const eligDist = { full:0, partial:0, limited:0, not_eligible:0 }
  workers.forEach(w => { eligDist[w.eligibility_tier]++ })

  return {
    totalWorkers:  workers.length,
    totalStores:   getAllStores().length,
    totalEvents:   sims.length,
    totalPayout:   +totalPayout.toFixed(2),
    totalPremium:  +totalPremium.toFixed(2),
    avgTrust:      +avgTrust.toFixed(2),
    approved, blocked, partial, crashEvents,
    trustDist, eligDist,
  }
}

// ─── Simulation detail with worker results ──────────────
export function getSimulationDetail(simId) {
  const sim = getSimById(simId)
  if (!sim) return null
  // Enrich worker results with full worker profiles
  const enriched = (sim.worker_results || []).map(wr => ({
    ...wr,
    workerProfile: getWorkerById(wr.worker_id)
  }))
  return { ...sim, worker_results: enriched }
}

// ─── Worker payout history (all sims they appear in) ────
export function getWorkerPayoutHistory(workerId) {
  return getAllSimulations()
    .map(sim => {
      const result = (sim.worker_results || []).find(r => r.worker_id === workerId)
      if (!result) return null
      return {
        sim_id:    sim.simulation_id,
        label:     sim.label,
        city:      sim.city,
        zone:      sim.zone,
        date:      sim.scheduled_start,
        type:      sim.disruption_type,
        severity:  sim.severity,
        payout:    result.outcome?.payout_amount || 0,
        status:    result.outcome?.payout_status || 'unknown',
        verdict:   result.fraud_signals?.fraud_verdict || 'unknown',
      }
    })
    .filter(Boolean)
}

// ─── Helpers ────────────────────────────────────────────
export function severityLabel(s) {
  if (!s || s === 0) return { text: 'None',     color: '#6B7280', cls: 'badge-gray'  }
  if (s <= 0.3)      return { text: 'Low',      color: '#F5A623', cls: 'badge-amber' }
  if (s <= 0.5)      return { text: 'Moderate', color: '#F97316', cls: 'badge-amber' }
  if (s <= 0.7)      return { text: 'High',     color: '#F5532D', cls: 'badge-red'   }
  return                    { text: 'Critical', color: '#EF4444', cls: 'badge-red'   }
}

export function trustLabel(t) {
  if (t >= 0.90) return { text: 'Excellent', color: '#23D18B', cls: 'badge-green' }
  if (t >= 0.75) return { text: 'Good',      color: '#4F8EF7', cls: 'badge-blue'  }
  if (t >= 0.55) return { text: 'Moderate',  color: '#F5A623', cls: 'badge-amber' }
  if (t >= 0.35) return { text: 'Low',       color: '#F5532D', cls: 'badge-red'   }
  return                { text: 'Critical',  color: '#EF4444', cls: 'badge-red'   }
}

export function eligLabel(e) {
  const map = {
    full:         { text: 'Full',         cls: 'badge-green' },
    partial:      { text: 'Partial',      cls: 'badge-blue'  },
    limited:      { text: 'Limited',      cls: 'badge-amber' },
    not_eligible: { text: 'Ineligible',   cls: 'badge-gray'  },
  }
  return map[e] || map.not_eligible
}

export function planLabel(p) {
  const map = {
    pro:      { text: 'Pro',      cls: 'badge-iris'  },
    standard: { text: 'Standard', cls: 'badge-blue'  },
    basic:    { text: 'Basic',    cls: 'badge-gray'  },
  }
  return map[p] || map.basic
}

export function disruptionTypeLabel(t) {
  const map = {
    heavy_rainfall:    { text: 'Rainfall',  icon: '🌧', color: '#4F8EF7' },
    aqi_heat:          { text: 'AQI/Heat',  icon: '🌫', color: '#F5A623' },
    store_downtime:    { text: 'Downtime',  icon: '⚡', color: '#F5532D' },
    social_disruption: { text: 'Social',    icon: '🚧', color: '#8B7FED' },
  }
  return map[t] || { text: t, icon: '•', color: '#6B7280' }
}

export const CITY_COLORS = {
  Chennai:   '#4F8EF7',
  Bangalore: '#23D18B',
  Hyderabad: '#F5A623',
}
