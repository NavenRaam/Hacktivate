const express  = require('express')
const router   = express.Router()
const { v4: uuid } = require('uuid')
const store    = require('../lib/store')
const sse      = require('../lib/sse')
const { runValidationPipeline } = require('../lib/engine')

// Load dataset workers once at startup
let datasetWorkers = []
try {
  const ds = require('../../data/dataset.json')
  datasetWorkers = ds.workers || []
  console.log(`[engine] loaded ${datasetWorkers.length} workers from dataset.json`)
} catch (e) {
  console.warn('[engine] no worker data found — validation will use empty set', e.message)
}

// GET /api/disruptions — full history
router.get('/', (req, res) => {
  const all = store.getAllDisruptions()
  // Return list without heavy validation results for list view
  const list = all.map(d => ({
    id:            d.id,
    storeId:       d.storeId,
    storeName:     d.storeName,
    zone:          d.zone,
    city:          d.city,
    type:          d.type,
    severity:      d.severity,
    startTime:     d.startTime,
    endTime:       d.endTime,
    durationHours: d.durationHours,
    affectedTotal: d.affectedTotal,
    affectedActive:d.affectedActive,
    status:        d.status,
    createdAt:     d.createdAt,
    activatedAt:   d.activatedAt,
    endedAt:       d.endedAt,
    summary:       d.summary || null,
  }))
  res.json(list)
})

// GET /api/disruptions/active — currently active disruption
router.get('/active', (req, res) => {
  const active = store.getActiveDisruption()
  res.json(active || null)
})

// GET /api/disruptions/:id — full detail including validation results
router.get('/:id', (req, res) => {
  const d = store.getDisruptionById(req.params.id)
  if (!d) return res.status(404).json({ error: 'Not found' })
  res.json(d)
})

// POST /api/disruptions/create — schedule a new disruption
router.post('/create', (req, res) => {
  const { storeId, storeName, zone, city, type, params, severity,
          startTime, endTime, durationHours, startMinutes, endMinutes,
          affectedWorkerIds, affectedTotal, affectedActive } = req.body

  if (!storeId || !type || severity === undefined) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const disruption = store.createDisruption({
    id: uuid(),
    storeId, storeName, zone, city, type, params, severity,
    startTime, endTime, durationHours, startMinutes, endMinutes,
    affectedWorkerIds: affectedWorkerIds || [],
    affectedTotal:     affectedTotal || 0,
    affectedActive:    affectedActive || 0,
  })

  sse.broadcast('disruption:scheduled', disruption)
  console.log(`[disruption] scheduled ${disruption.id} at ${startTime}`)
  res.json({ success: true, disruption })
})

// POST /api/disruptions/:id/activate — disruption window starts
router.post('/:id/activate', (req, res) => {
  const updated = store.updateDisruption(req.params.id, {
    status:      'active',
    activatedAt: new Date().toISOString(),
  })
  if (!updated) return res.status(404).json({ error: 'Not found' })

  sse.broadcast('disruption:active', {
    id:            updated.id,
    storeName:     updated.storeName,
    zone:          updated.zone,
    city:          updated.city,
    type:          updated.type,
    severity:      updated.severity,
    startTime:     updated.startTime,
    endTime:       updated.endTime,
    affectedTotal: updated.affectedTotal,
    affectedActive:updated.affectedActive,
    status:        'active',
  })
  console.log(`[disruption] activated ${updated.id}`)
  res.json({ success: true, disruption: updated })
})

// POST /api/disruptions/:id/end — disruption ends, run validation
router.post('/:id/end', (req, res) => {
  const disruption = store.getDisruptionById(req.params.id)
  if (!disruption) return res.status(404).json({ error: 'Not found' })

  // Mark as validating immediately — broadcast so admin shows "Validating"
  store.updateDisruption(disruption.id, { status: 'validating' })
  sse.broadcast('disruption:validating', { id: disruption.id, zone: disruption.zone })

  // Run validation pipeline
  const affected = datasetWorkers.filter(w =>
    disruption.affectedWorkerIds.includes(w.worker_id)
  )

  console.log(`[engine] running validation for ${affected.length} workers`)

  // Stagger the broadcast — emit each worker result with a small delay
  // so admin dashboard can animate them appearing one by one
  const { results, summary } = runValidationPipeline(affected, disruption)

  // Store completed disruption with full results
  const completed = store.updateDisruption(disruption.id, {
    status:            'completed',
    endedAt:           new Date().toISOString(),
    validationResults: results,
    summary,
  })

  // Broadcast full completion
  sse.broadcast('disruption:completed', {
    id:      disruption.id,
    summary,
    results: results.map(r => ({
      workerId:    r.workerId,
      workerName:  r.workerName,
      zone:        r.zone,
      verdict:     r.fraud.verdict,
      payoutAmount:r.outcome.payoutAmount,
      payoutStatus:r.outcome.payoutStatus,
      flags:       r.fraud.flags,
      trustScore:  r.fraud.trustScore,
      notification:r.outcome.notificationMessage,
    })),
  })

  console.log(`[disruption] completed ${disruption.id} — disbursed ₹${summary.totalDisbursed}`)
  res.json({ success: true, summary, resultsCount: results.length })
})

module.exports = router
