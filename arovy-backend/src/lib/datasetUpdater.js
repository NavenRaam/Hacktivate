// datasetUpdater.js — updates dataset.json after disruption
// Only modifies workers in the affected zone. All others unchanged.

const fs   = require('fs')
const path = require('path')

const DATASET_PATH = path.join(__dirname, '../../data/dataset.json')

function loadDataset() {
  return JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'))
}

function saveDataset(dataset) {
  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2))
}

// Trust recalculation based on verdict
function recalculateTrust(profile, verdict, flags) {
  const current = profile.trust_score
  const deltas  = { clean:+0.02, partial:0, suspicious:-0.04, blocked:-0.08, ineligible:0 }
  const delta   = deltas[verdict] || 0
  const penalty = ['suspicious','blocked'].includes(verdict)
    ? Math.min(flags.length * 0.01, 0.04) : 0
  const newScore = +Math.max(0.05, Math.min(0.99, current + delta - penalty)).toFixed(3)
  const ratio    = newScore / (current || 1)

  return {
    trust_score:               newScore,
    participation_consistency: +Math.min(0.99, profile.participation_consistency * ratio).toFixed(3),
    movement_consistency:      +Math.min(0.99, profile.movement_consistency * ratio).toFixed(3),
    historical_deviation_avg:  +Math.max(0.01, profile.historical_deviation_avg / ratio).toFixed(3),
    anomaly_flag_count:        profile.anomaly_flag_count + (flags.length > 0 ? 1 : 0),
    profile_type:              trustType(newScore),
    last_updated:              new Date().toISOString().split('T')[0],
  }
}

function trustType(s) {
  if (s >= 0.90) return 'excellent'
  if (s >= 0.75) return 'good'
  if (s >= 0.55) return 'moderate'
  if (s >= 0.35) return 'low'
  return 'critical'
}

// Baseline: 80/20 weighted average for affected day only
function recalculateBaseline(current, day, actualIncome) {
  if (!day || actualIncome === undefined) return current
  const existing = current[day] || 0
  return { ...current, [day]: Math.round(existing * 0.80 + actualIncome * 0.20) }
}

// Premium recalc after baseline change
function recalculatePremium(worker, updatedBaseline) {
  const avgDaily  = Object.values(updatedBaseline).reduce((s,v) => s+v, 0) / 7
  const weeklyAvg = +(avgDaily * 6).toFixed(2)
  const expLoss   = +(weeklyAvg * worker.risk_profile.risk_score).toFixed(2)
  const margin    = worker.insurance_plan.margin || 0.20
  return {
    weekly_baseline: weeklyAvg,
    expected_loss:   expLoss,
    weekly_premium:  +(expLoss * (1 + margin)).toFixed(2),
  }
}

function recalcAdjustedCoverage(worker, newTrustScore) {
  const { base_coverage: cov, alpha = 0.1 } = worker.insurance_plan
  return +(cov * (1 - alpha * worker.risk_profile.risk_score) * newTrustScore).toFixed(3)
}

function refreshSession(sess, actualIncome, type) {
  return {
    ...sess,
    status:                    'active',
    active_minutes_so_far:     Math.floor(Math.random() * 60 + 30),
    idle_ratio_so_far:         +(Math.random() * 0.08 + 0.04).toFixed(2),
    participation_score_so_far:+(Math.random() * 0.10 + 0.85).toFixed(2),
    pre_disruption_confirmed:  true,
    earnings_before_disruption:actualIncome,
    last_disruption_type:      type,
    last_updated:              new Date().toISOString(),
  }
}

function getDayOfWeek() {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
}

// ─── Main ─────────────────────────────────────────────────
function updateDatasetAfterDisruption(validationResults, disruption) {
  console.log(`[dataset] updating ${validationResults.length} workers`)

  let dataset
  try {
    dataset = loadDataset()
  } catch (e) {
    console.error('[dataset] failed to load:', e.message)
    return { updated_count: 0, error: e.message }
  }

  const workerMap = {}
  dataset.workers.forEach(w => { workerMap[w.worker_id] = w })

  const updates = []
  const day     = disruption.dayOfWeek || getDayOfWeek()

  for (const result of validationResults) {
    const worker = workerMap[result.workerId || result.worker_id]
    if (!worker) { console.warn(`[dataset] worker ${result.workerId} not found`); continue }

    const verdict   = result.fraud?.verdict || 'ineligible'
    const flags     = result.fraud?.flags   || []
    const calc      = result.payoutCalculation || {}
    const actualInc = calc.actual_income       || 0
    const wasActive = result.validation?.sessionActive !== false

    const prevTrust    = worker.trust_profile.trust_score
    const prevBaseline = worker.baseline_income[day]
    const prevPremium  = worker.premium.weekly_premium

    const newTrust    = recalculateTrust(worker.trust_profile, verdict, flags)
    const newBaseline = wasActive
      ? recalculateBaseline(worker.baseline_income, day, actualInc)
      : worker.baseline_income
    const newPremium  = recalculatePremium(
      { ...worker, baseline_income: newBaseline },
      newBaseline
    )
    const newAdjCov   = recalcAdjustedCoverage(worker, newTrust.trust_score)
    const newSession  = refreshSession(worker.current_session, actualInc, disruption.type)

    workerMap[worker.worker_id] = {
      ...worker,
      baseline_income: newBaseline,
      trust_profile:   newTrust,
      insurance_plan:  { ...worker.insurance_plan, adjusted_coverage: newAdjCov },
      premium:         newPremium,
      current_session: newSession,
    }

    updates.push({
      worker_id:      worker.worker_id,
      name:           worker.name,
      verdict,
      trust_before:   prevTrust,
      trust_after:    newTrust.trust_score,
      trust_delta:    +(newTrust.trust_score - prevTrust).toFixed(3),
      baseline_before:prevBaseline,
      baseline_after: newBaseline[day],
      premium_before: prevPremium,
      premium_after:  newPremium.weekly_premium,
    })
  }

  dataset.workers = Object.values(workerMap)

  try {
    saveDataset(dataset)
    console.log(`[dataset] saved ${updates.length} updates`)
  } catch (e) {
    console.error('[dataset] save failed:', e.message)
    return { updated_count: 0, error: e.message }
  }

  const avgDelta = updates.length
    ? +(updates.reduce((s,u) => s + u.trust_delta, 0) / updates.length).toFixed(4)
    : 0

  return {
    updated_count:   updates.length,
    avg_trust_delta: avgDelta,
    updates,
    updated_at:      new Date().toISOString(),
  }
}

module.exports = { updateDatasetAfterDisruption }
