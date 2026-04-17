const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DS_PATH = path.join(__dirname, '../../data/dataset.json')

function readDataset() {
  return JSON.parse(fs.readFileSync(DS_PATH, 'utf8'))
}

// GET /api/stores — all stores with live worker aggregates
router.get('/', (req, res) => {
  try {
    const { city } = req.query
    const ds = readDataset()
    let stores = ds.stores || []
    if (city) stores = stores.filter(s => s.city === city)

    // Enrich each store with live worker aggregates
    const enriched = stores.map(store => {
      const workers    = (ds.workers || []).filter(w => w.primary_store_id === store.store_id)
      const active     = workers.filter(w => w.current_session?.status === 'active').length
      const avgTrust   = workers.length ? +(workers.reduce((s,w) => s + w.trust_profile.trust_score, 0) / workers.length).toFixed(3) : 0
      const avgRisk    = workers.length ? +(workers.reduce((s,w) => s + w.risk_profile.risk_score, 0) / workers.length).toFixed(3) : 0
      const weeklyPool = +workers.reduce((s,w) => s + w.premium.weekly_premium, 0).toFixed(2)
      return {
        ...store,
        live: { worker_count: workers.length, active_workers: active, avg_trust: avgTrust, avg_risk: avgRisk, weekly_premium_pool: weeklyPool },
      }
    })
    res.json(enriched)
  } catch(e) { res.status(500).json({ error: e.message }) }
})

// GET /api/stores/:id
router.get('/:id', (req, res) => {
  try {
    const ds    = readDataset()
    const store = (ds.stores || []).find(s => s.store_id === req.params.id)
    if (!store) return res.status(404).json({ error: 'Not found' })
    const workers  = (ds.workers || []).filter(w => w.primary_store_id === req.params.id)
    const active   = workers.filter(w => w.current_session?.status === 'active').length
    const avgTrust = workers.length ? +(workers.reduce((s,w) => s+w.trust_profile.trust_score,0)/workers.length).toFixed(3) : 0
    const avgRisk  = workers.length ? +(workers.reduce((s,w) => s+w.risk_profile.risk_score,0)/workers.length).toFixed(3) : 0
    const pool     = +workers.reduce((s,w)=>s+w.premium.weekly_premium,0).toFixed(2)
    res.json({ ...store, live:{ worker_count:workers.length, active_workers:active, avg_trust:avgTrust, avg_risk:avgRisk, weekly_premium_pool:pool }, workers })
  } catch(e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
