// datasetUpdater.js
// Single source of truth update after each disruption.
// Updates: worker trust, baseline, premium, session
//          store reliability, disruption_count, avg_trust
//          city-level aggregates propagate automatically via workers route

const fs   = require('fs')
const path = require('path')
const DS_PATH = path.join(__dirname, '../../data/dataset.json')

function load()     { return JSON.parse(fs.readFileSync(DS_PATH, 'utf8')) }
function save(ds)   { fs.writeFileSync(DS_PATH, JSON.stringify(ds, null, 2)) }

function trustType(s) {
  return s>=0.90?'excellent':s>=0.75?'good':s>=0.55?'moderate':s>=0.35?'low':'critical'
}

function recalcTrust(profile, verdict, flags) {
  const cur   = profile.trust_score
  const delta = { clean:+0.02, partial:0, suspicious:-0.04, blocked:-0.08, ineligible:0 }[verdict] || 0
  const pen   = ['suspicious','blocked'].includes(verdict) ? Math.min(flags.length * 0.01, 0.04) : 0
  const ns    = +Math.max(0.05, Math.min(0.99, cur + delta - pen)).toFixed(3)
  const ratio = ns / (cur || 1)
  return {
    trust_score:               ns,
    participation_consistency: +Math.min(0.99, profile.participation_consistency * ratio).toFixed(3),
    movement_consistency:      +Math.min(0.99, profile.movement_consistency * ratio).toFixed(3),
    historical_deviation_avg:  +Math.max(0.01, profile.historical_deviation_avg / ratio).toFixed(3),
    anomaly_flag_count:        profile.anomaly_flag_count + (flags.length > 0 ? 1 : 0),
    profile_type:              trustType(ns),
    last_updated:              new Date().toISOString().split('T')[0],
  }
}

function recalcBaseline(cur, day, actualIncome) {
  if (!day || actualIncome === undefined) return cur
  return { ...cur, [day]: Math.round((cur[day] || 0) * 0.80 + actualIncome * 0.20) }
}

// Realistic premium formula: 2-5% of weekly income
function recalcPremium(worker, baseline) {
  const PLAN  = { pro:{cov:0.85,mult:1.30}, standard:{cov:0.70,mult:1.00}, basic:{cov:0.55,mult:0.75} }
  const plan  = worker.insurance_plan.plan_tier
  const cfg   = PLAN[plan] || PLAN.basic
  const avgD  = Object.values(baseline).reduce((s,v)=>s+v,0) / 7
  const weekly = avgD * 6
  const rs     = worker.risk_profile.risk_score
  const riskAdj= 0.80 + (rs * 0.40)
  const expLoss= (3.2 / 52) * 145 * riskAdj * cfg.cov
  let   prem   = expLoss * 9.5 * cfg.mult
  prem         = Math.min(prem, weekly * 0.05)
  prem         = Math.max(prem, 40.0)
  return {
    weekly_baseline: +weekly.toFixed(2),
    expected_loss:   +expLoss.toFixed(2),
    weekly_premium:  +prem.toFixed(2),
    annual_premium:  +(prem * 52).toFixed(2),
    coverage_tier:   plan,
  }
}

function recalcAdjCov(worker, trust) {
  const cov   = worker.insurance_plan.base_coverage || 0.70
  const alpha = worker.insurance_plan.alpha || 0.1
  const rs    = worker.risk_profile.risk_score
  return +(cov * (1 - alpha * rs) * trust).toFixed(3)
}

function getDOW() {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
}

// ── Update store aggregates ──────────────────────────────
function updateStoreAggregates(ds, affectedStoreId, severity, now) {
  if (!ds.stores || !Array.isArray(ds.stores)) return

  const sIdx = ds.stores.findIndex(s => s.store_id === affectedStoreId)
  if (sIdx === -1) return

  const store   = ds.stores[sIdx]
  const workers = ds.workers.filter(w => w.primary_store_id === affectedStoreId)

  // Reliability degrades slightly after each disruption, recovers slowly over time
  const newReliability = +Math.max(0.10, Math.min(0.99,
    (store.reliability || 0.60) * (1 - severity * 0.10)
  )).toFixed(3)

  // Live trust and risk aggregates from workers
  const avgTrust = workers.length
    ? +(workers.reduce((s,w) => s + w.trust_profile.trust_score, 0) / workers.length).toFixed(3)
    : store.avg_trust || 0.70

  const avgRisk = workers.length
    ? +(workers.reduce((s,w) => s + w.risk_profile.risk_score, 0) / workers.length).toFixed(3)
    : store.avg_risk || 0.50

  const totalPremium = workers.reduce((s,w) => s + w.premium.weekly_premium, 0)

  ds.stores[sIdx] = {
    ...store,
    reliability:           newReliability,
    avg_trust:             avgTrust,
    avg_risk:              avgRisk,
    weekly_premium_pool:   +totalPremium.toFixed(2),
    disruption_count:      (store.disruption_count || 0) + 1,
    last_disruption_at:    now,
    last_disruption_type:  undefined, // will be set by caller
  }
}

// ── Main export ──────────────────────────────────────────
function updateDatasetAfterDisruption(validationResults, disruption) {
  console.log(`[dataset] updating ${validationResults.length} workers + store ${disruption.storeId}`)

  let ds
  try { ds = load() } catch(e) { return { updated_count:0, error:e.message } }

  const wmap = {}
  ds.workers.forEach(w => { wmap[w.worker_id] = w })

  const updates = []
  const day     = disruption.dayOfWeek || getDOW()
  const now     = new Date().toISOString()

  for (const result of validationResults) {
    const worker = wmap[result.worker_id || result.workerId]
    if (!worker) { console.warn(`[dataset] worker ${result.workerId} not found`); continue }

    const verdict   = result.fraud?.verdict   || 'ineligible'
    const flags     = result.fraud?.flags     || []
    const calc      = result.payoutCalculation || {}
    const actualInc = calc.actual_income      || 0
    const wasActive = result.validation?.sessionActive !== false

    const prevTrust   = worker.trust_profile.trust_score
    const prevBase    = worker.baseline_income[day]
    const prevPrem    = worker.premium.weekly_premium

    const newTrust   = recalcTrust(worker.trust_profile, verdict, flags)
    const newBaseline= wasActive
      ? recalcBaseline(worker.baseline_income, day, actualInc)
      : worker.baseline_income
    const newPremium = recalcPremium({ ...worker, baseline_income: newBaseline }, newBaseline)
    const newAdjCov  = recalcAdjCov(worker, newTrust.trust_score)

    wmap[worker.worker_id] = {
      ...worker,
      baseline_income: newBaseline,
      trust_profile:   newTrust,
      insurance_plan:  { ...worker.insurance_plan, adjusted_coverage: newAdjCov },
      premium:         newPremium,
      current_session: {
        ...worker.current_session,
        status:                    'active',
        active_minutes_so_far:     Math.floor(Math.random() * 60 + 30),
        idle_ratio_so_far:         +(Math.random() * 0.08 + 0.04).toFixed(2),
        participation_score_so_far:+(Math.random() * 0.10 + 0.85).toFixed(2),
        pre_disruption_confirmed:  true,
        last_updated:              now,
      },
    }

    updates.push({
      worker_id:      worker.worker_id,
      name:           worker.name,
      verdict,
      trust_before:   prevTrust,
      trust_after:    newTrust.trust_score,
      trust_delta:    +(newTrust.trust_score - prevTrust).toFixed(3),
      baseline_before:prevBase,
      baseline_after: newBaseline[day],
      premium_before: prevPrem,
      premium_after:  newPremium.weekly_premium,
    })
  }

  // Write updated workers back
  ds.workers = Object.values(wmap)

  // Update store aggregates (after workers are updated in wmap)
  updateStoreAggregates(ds, disruption.storeId, disruption.severity, now)
  if (ds.stores) {
    const sIdx = ds.stores.findIndex(s => s.store_id === disruption.storeId)
    if (sIdx !== -1) ds.stores[sIdx].last_disruption_type = disruption.type
  }

  try {
    save(ds)
    console.log(`[dataset] saved — ${updates.length} workers, store ${disruption.storeId} updated`)
  } catch(e) {
    return { updated_count: 0, error: e.message }
  }

  const avgDelta = updates.length
    ? +(updates.reduce((s,u) => s + u.trust_delta, 0) / updates.length).toFixed(4)
    : 0

  return {
    updated_count:   updates.length,
    avg_trust_delta: avgDelta,
    updates,
    store_updated:   disruption.storeId,
    updated_at:      now,
  }
}

module.exports = { updateDatasetAfterDisruption }
