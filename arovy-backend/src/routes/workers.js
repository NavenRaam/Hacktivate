// Workers route — serves live dataset directly from disk
// Admin always reads fresh data after disruption updates

const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DS_PATH = path.join(__dirname, '../../data/dataset.json')

function readDataset() {
  return JSON.parse(fs.readFileSync(DS_PATH, 'utf8'))
}

// GET /api/workers
router.get('/', (req, res) => {
  try {
    const { city, storeId } = req.query
    let workers = readDataset().workers || []
    if (city)    workers = workers.filter(w => w.city === city)
    if (storeId) workers = workers.filter(w => w.primary_store_id === storeId)
    res.json(workers)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/workers/:id
router.get('/:id', (req, res) => {
  try {
    const ds     = readDataset()
    const worker = (ds.workers || []).find(w => w.worker_id === req.params.id)
    if (!worker) return res.status(404).json({ error: 'Not found' })
    res.json(worker)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/workers/store/:storeId/pool
router.get('/store/:storeId/pool', (req, res) => {
  try {
    const ds      = readDataset()
    const workers = (ds.workers || []).filter(w => w.primary_store_id === req.params.storeId)
    if (!workers.length) return res.status(404).json({ error: 'No workers' })

    const avg = key => workers.reduce((s,w) => s + (w[key] || 0), 0) / workers.length
    res.json({
      store_id:       req.params.storeId,
      worker_count:   workers.length,
      avg_trust:      +(workers.reduce((s,w) => s + w.trust_profile.trust_score, 0) / workers.length).toFixed(3),
      avg_risk:       +(workers.reduce((s,w) => s + w.risk_profile.risk_score,  0) / workers.length).toFixed(3),
      avg_premium:    +(workers.reduce((s,w) => s + w.premium.weekly_premium,    0) / workers.length).toFixed(2),
      total_premium:  +(workers.reduce((s,w) => s + w.premium.weekly_premium,    0)).toFixed(2),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
