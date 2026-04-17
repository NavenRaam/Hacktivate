const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DS_PATH = path.join(__dirname, '../../data/dataset.json')

function readDataset() {
  // Always read fresh from disk — no caching
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
  } catch(e) { res.status(500).json({ error: e.message }) }
})

// GET /api/workers/:id
router.get('/:id', (req, res) => {
  try {
    const w = (readDataset().workers || []).find(w => w.worker_id === req.params.id)
    if (!w) return res.status(404).json({ error: 'Not found' })
    res.json(w)
  } catch(e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
