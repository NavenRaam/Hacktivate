const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DS_PATH   = path.join(__dirname, '../../data/dataset.json')
const DISR_PATH = path.join(__dirname, '../../data/disruptions.json')

function read(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

// ─── Statistical ML helpers ──────────────────────────────
function mean(arr)   { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0 }
function stddev(arr) {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/Math.max(arr.length-1,1))
}
function clamp(v,min,max) { return Math.max(min,Math.min(max,v)) }

// GET /api/predict — system-wide predictions
router.get('/', (req, res) => {
  try {
    const ds      = read(DS_PATH)
    const liveDis = (() => { try { return read(DISR_PATH) } catch { return [] } })()
    const workers = ds.workers || []
    const sims    = ds.simulation_results || []

    // ── Trust trend prediction ────────────────────────────
    const recentUpdates = liveDis
      .filter(d => d.datasetUpdate?.updates?.length > 0)
      .flatMap(d => d.datasetUpdate.updates)
    
    const avgTrustDelta = recentUpdates.length > 0
      ? mean(recentUpdates.map(u => u.trust_delta))
      : 0

    const currentAvgTrust = mean(workers.map(w => w.trust_profile.trust_score))
    const predictedTrustNextWeek = clamp(
      currentAvgTrust + avgTrustDelta * 3, 0.3, 0.99
    )

    // ── Risk zone analysis ────────────────────────────────
    const cities = ['Chennai','Bangalore','Hyderabad']
    const cityRisk = cities.map(city => {
      const cw      = workers.filter(w => w.city === city)
      const avgRisk = mean(cw.map(w => w.risk_profile.risk_score))
      const cs      = sims.filter(s => s.city === city)
      
      // Historical disruption frequency per city
      const freqPerWeek = cs.length / 52
      
      // Risk score = combo of worker risk + disruption frequency
      const compositeRisk = clamp((avgRisk * 0.6 + freqPerWeek * 8 * 0.4), 0, 1)
      
      // Predicted events next week (Poisson approximation)
      const lambda        = freqPerWeek * 1.1  // slight upward pressure
      const predictedEvts = Math.round(lambda * 10) / 10

      return {
        city, workers:cw.length,
        avgRisk:          +avgRisk.toFixed(3),
        compositeRisk:    +compositeRisk.toFixed(3),
        historicalEvents: cs.length,
        freqPerWeek:      +freqPerWeek.toFixed(3),
        predictedEventsNextWeek: predictedEvts,
        riskLevel: compositeRisk > 0.6 ? 'high'
                 : compositeRisk > 0.4 ? 'moderate'
                 : 'low',
      }
    })

    // ── Payout prediction next week ───────────────────────
    const histPayouts = sims
      .map(s => s.summary?.total_payout_disbursed || 0)
      .filter(v => v > 0)
    
    const avgPayoutPerEvent = histPayouts.length ? mean(histPayouts) : 300
    const sdPayout          = histPayouts.length ? stddev(histPayouts) : 100
    const expectedEventsWk  = mean(cityRisk.map(c => c.predictedEventsNextWeek))

    const predictedWeeklyPayout = {
      low:      Math.max(0,   Math.round((avgPayoutPerEvent - sdPayout) * expectedEventsWk)),
      expected: Math.round(avgPayoutPerEvent * expectedEventsWk),
      high:     Math.round((avgPayoutPerEvent + sdPayout) * expectedEventsWk),
    }

    // ── System health score ───────────────────────────────
    const totalWorkers  = workers.length
    const approvalRate  = sims.length > 0
      ? sims.reduce((s,sim)=>s+(sim.summary?.approved||0),0) /
        sims.reduce((s,sim)=>s+(sim.summary?.total_workers||0),0)
      : 0.75
    
    const fraudRate     = sims.reduce((s,sim)=>s+(sim.summary?.blocked||0),0) /
      Math.max(1, sims.reduce((s,sim)=>s+(sim.summary?.total_workers||0),0))
    
    const poolHealth    = clamp(
      (approvalRate * 0.4) +
      ((1 - fraudRate) * 0.3) +
      (currentAvgTrust * 0.3),
      0, 1
    )

    // ── Zone-level disruption risk ranking ────────────────
    const zones = {}
    workers.forEach(w => {
      const key = `${w.city}::${w.zone}`
      if (!zones[key]) zones[key] = {
        city:w.city, zone:w.zone, workers:0,
        riskSum:0, trustSum:0, premiumSum:0,
      }
      zones[key].workers++
      zones[key].riskSum    += w.risk_profile.risk_score
      zones[key].trustSum   += w.trust_profile.trust_score
      zones[key].premiumSum += w.premium.weekly_premium
    })

    const zoneRankings = Object.values(zones)
      .map(z => ({
        city:    z.city,
        zone:    z.zone,
        workers: z.workers,
        avgRisk: +(z.riskSum / z.workers).toFixed(3),
        avgTrust:+(z.trustSum / z.workers).toFixed(3),
        weeklyPremiumPool: +z.premiumSum.toFixed(2),
      }))
      .sort((a,b) => b.avgRisk - a.avgRisk)
      .slice(0,10)

    // ── Trust recovery prediction ─────────────────────────
    const lowTrustWorkers   = workers.filter(w => w.trust_profile.trust_score < 0.55)
    const blockedLastEvent  = recentUpdates.filter(u => u.verdict === 'blocked').length

    res.json({
      generatedAt: new Date().toISOString(),
      
      systemHealth: {
        score:        +poolHealth.toFixed(3),
        label:        poolHealth > 0.75 ? 'Healthy' : poolHealth > 0.55 ? 'Moderate' : 'At Risk',
        approvalRate: +approvalRate.toFixed(3),
        fraudRate:    +fraudRate.toFixed(3),
        avgTrust:     +currentAvgTrust.toFixed(3),
      },

      trustTrend: {
        current:           +currentAvgTrust.toFixed(3),
        avgDeltaPerEvent:  +avgTrustDelta.toFixed(4),
        predictedNextWeek: +predictedTrustNextWeek.toFixed(3),
        direction:         avgTrustDelta >= 0 ? 'improving' : 'declining',
        lowTrustWorkers:   lowTrustWorkers.length,
        atRiskOfBlock:     blockedLastEvent,
      },

      cityRisk,

      payoutForecast: {
        ...predictedWeeklyPayout,
        weeklyPremiumPool: +mean(workers.map(w=>w.premium.weekly_premium)) * totalWorkers,
        eventsExpected:    +expectedEventsWk.toFixed(2),
        coverageRatio:     predictedWeeklyPayout.expected > 0
          ? +(predictedWeeklyPayout.expected / (mean(workers.map(w=>w.premium.weekly_premium)) * totalWorkers)).toFixed(3)
          : 0,
      },

      zoneRiskRanking: zoneRankings,
    })
  } catch (e) {
    console.error('[predict]', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
