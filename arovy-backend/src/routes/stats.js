const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DS_PATH   = path.join(__dirname, '../../data/dataset.json')
const DISR_PATH = path.join(__dirname, '../../data/disruptions.json')

function read(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

// GET /api/stats — live global aggregations
router.get('/', (req, res) => {
  try {
    const ds      = read(DS_PATH)
    const liveDis = (() => { try { return read(DISR_PATH) } catch { return [] } })()
    const workers = ds.workers || []
    const sims    = ds.simulation_results || []

    const totalPremium   = workers.reduce((s,w) => s + w.premium.weekly_premium, 0)
    const avgTrust       = workers.reduce((s,w) => s + w.trust_profile.trust_score, 0) / workers.length
    const avgRisk        = workers.reduce((s,w) => s + w.risk_profile.risk_score,  0) / workers.length
    const historicalPay  = sims.reduce((s,sim) => s + (sim.summary?.total_payout_disbursed||0), 0)
    const livePay        = liveDis.filter(d=>d.status==='completed')
                            .reduce((s,d) => s + (d.summary?.totalDisbursed||0), 0)

    const trustDist = { excellent:0, good:0, moderate:0, low:0, critical:0 }
    workers.forEach(w => { trustDist[w.trust_profile.profile_type]++ })
    const eligDist  = { full:0, partial:0, limited:0, not_eligible:0 }
    workers.forEach(w => { eligDist[w.eligibility_tier]++ })

    const simApproved = sims.reduce((s,sim) => s+(sim.summary?.approved||0), 0)
    const simBlocked  = sims.reduce((s,sim) => s+(sim.summary?.blocked||0), 0)
    const simPartial  = sims.reduce((s,sim) => s+(sim.summary?.partial_approved||0), 0)

    const liveApproved = liveDis.reduce((s,d) => s+(d.summary?.approved||0), 0)
    const liveBlocked  = liveDis.reduce((s,d) => s+(d.summary?.blocked||0), 0)
    const livePartial  = liveDis.reduce((s,d) => s+(d.summary?.partial||0), 0)

    res.json({
      workers:         workers.length,
      stores:          (ds.stores||[]).length,
      totalPremium:    +totalPremium.toFixed(2),
      avgTrust:        +avgTrust.toFixed(3),
      avgRisk:         +avgRisk.toFixed(3),
      totalDisbursed:  +(historicalPay + livePay).toFixed(2),
      historicalEvents:sims.length,
      liveEvents:      liveDis.length,
      approved:        simApproved + liveApproved,
      blocked:         simBlocked  + liveBlocked,
      partial:         simPartial  + livePartial,
      crashEvents:     sims.filter(s=>s.market_crash_controls?.activated).length,
      trustDist,
      eligDist,
      updatedAt:       new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/stats/city/:city — city-level stats
router.get('/city/:city', (req, res) => {
  try {
    const ds      = read(DS_PATH)
    const city    = req.params.city
    const workers = (ds.workers||[]).filter(w => w.city === city)
    const sims    = (ds.simulation_results||[]).filter(s => s.city === city)

    if (!workers.length) return res.status(404).json({ error: 'City not found' })

    const totalPremium = workers.reduce((s,w) => s + w.premium.weekly_premium, 0)
    const avgTrust     = workers.reduce((s,w) => s + w.trust_profile.trust_score, 0) / workers.length
    const avgRisk      = workers.reduce((s,w) => s + w.risk_profile.risk_score,  0) / workers.length
    const totalPayout  = sims.reduce((s,sim) => s + (sim.summary?.total_payout_disbursed||0), 0)

    // Zone breakdown
    const zones = {}
    workers.forEach(w => {
      if (!zones[w.zone]) zones[w.zone] = { workers:0, premium:0, avgTrust:0, avgRisk:0 }
      zones[w.zone].workers++
      zones[w.zone].premium  += w.premium.weekly_premium
      zones[w.zone].avgTrust += w.trust_profile.trust_score
      zones[w.zone].avgRisk  += w.risk_profile.risk_score
    })
    Object.keys(zones).forEach(z => {
      const n = zones[z].workers
      zones[z].avgTrust = +(zones[z].avgTrust/n).toFixed(3)
      zones[z].avgRisk  = +(zones[z].avgRisk/n).toFixed(3)
      zones[z].premium  = +zones[z].premium.toFixed(2)
    })

    res.json({
      city, workers:workers.length,
      totalPremium: +totalPremium.toFixed(2),
      avgTrust:     +avgTrust.toFixed(3),
      avgRisk:      +avgRisk.toFixed(3),
      totalPayout:  +totalPayout.toFixed(2),
      events:       sims.length,
      zones,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
