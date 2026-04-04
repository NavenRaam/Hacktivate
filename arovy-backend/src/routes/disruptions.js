const express  = require('express')
const router   = express.Router()
const { v4: uuid } = require('uuid')
const store    = require('../lib/store')
const sse      = require('../lib/sse')
const { runValidationPipeline } = require('../lib/engine')
const { processBatchPayouts }   = require('../lib/razorpay')
const { updateDatasetAfterDisruption } = require('../lib/datasetUpdater')

// ── Load workers from disk (fresh each call) ──────────────
function loadWorkers() {
  try {
    const dsPath = require.resolve('../../data/dataset.json')
    delete require.cache[dsPath]
    const ds = require('../../data/dataset.json')
    return ds.workers || []
  } catch (e) {
    console.warn('[workers] load failed:', e.message)
    return []
  }
}

// ── GET /api/disruptions ──────────────────────────────────
router.get('/', (req, res) => {
  const list = store.getAllDisruptions().map(d => ({
    id:             d.id,
    storeId:        d.storeId,
    storeName:      d.storeName,
    zone:           d.zone,
    city:           d.city,
    type:           d.type,
    severity:       d.severity,
    startTime:      d.startTime,
    endTime:        d.endTime,
    durationHours:  d.durationHours,
    affectedTotal:  d.affectedTotal,
    affectedActive: d.affectedActive,
    status:         d.status,
    createdAt:      d.createdAt,
    activatedAt:    d.activatedAt,
    endedAt:        d.endedAt,
    summary:        d.summary        || null,
    razorpay:       d.razorpay       || null,
    datasetUpdate:  d.datasetUpdate   || null,
  }))
  res.json(list)
})

// ── GET /api/disruptions/active ───────────────────────────
router.get('/active', (req, res) => {
  res.json(store.getActiveDisruption() || null)
})

// ── GET /api/disruptions/:id ──────────────────────────────
router.get('/:id', (req, res) => {
  const d = store.getDisruptionById(req.params.id)
  if (!d) return res.status(404).json({ error: 'Not found' })
  res.json(d)
})

// ── POST /api/disruptions/create ─────────────────────────
router.post('/create', (req, res) => {
  const {
    storeId, storeName, zone, city, type, params, severity,
    startTime, endTime, durationHours, startMinutes, endMinutes,
    affectedWorkerIds, affectedTotal, affectedActive,
  } = req.body

  if (!storeId || !type || severity === undefined)
    return res.status(400).json({ error: 'Missing fields' })

  const disruption = store.createDisruption({
    id: uuid(),
    storeId, storeName, zone, city, type, params, severity,
    startTime, endTime, durationHours, startMinutes, endMinutes,
    affectedWorkerIds: affectedWorkerIds || [],
    affectedTotal:     affectedTotal || 0,
    affectedActive:    affectedActive || 0,
    dayOfWeek: ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()],
  })

  sse.broadcast('disruption:scheduled', disruption)
  console.log(`[disruption] scheduled ${disruption.id}`)
  res.json({ success: true, disruption })
})

// ── POST /api/disruptions/:id/activate ───────────────────
// Idempotent — ignores if already active
router.post('/:id/activate', (req, res) => {
  const existing = store.getDisruptionById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  // Already active or further — skip
  if (['active','validating','paying','completed'].includes(existing.status)) {
    return res.json({ success: true, disruption: existing, skipped: true })
  }

  const updated = store.updateDisruption(req.params.id, {
    status:      'active',
    activatedAt: new Date().toISOString(),
  })

  sse.broadcast('disruption:active', {
    id:             updated.id,
    storeName:      updated.storeName,
    zone:           updated.zone,
    city:           updated.city,
    type:           updated.type,
    severity:       updated.severity,
    startTime:      updated.startTime,
    endTime:        updated.endTime,
    durationHours:  updated.durationHours,
    affectedTotal:  updated.affectedTotal,
    affectedActive: updated.affectedActive,
    status:         'active',
  })

  console.log(`[disruption] activated ${updated.id}`)
  res.json({ success: true, disruption: updated })
})

// ── POST /api/disruptions/:id/end ────────────────────────
// Idempotent — ignores if already completed
router.post('/:id/end', async (req, res) => {
  const disruption = store.getDisruptionById(req.params.id)
  if (!disruption) return res.status(404).json({ error: 'Not found' })

  // Already processed — return stored result
  if (disruption.status === 'completed') {
    return res.json({
      success:       true,
      skipped:       true,
      summary:       disruption.summary,
      razorpay:      disruption.razorpay,
      datasetUpdate: disruption.datasetUpdate,
    })
  }

  // Prevent concurrent processing
  if (['validating','paying'].includes(disruption.status)) {
    return res.json({ success: true, skipped: true, message: 'Already processing' })
  }

  // 1. Mark validating
  store.updateDisruption(disruption.id, { status: 'validating' })
  sse.broadcast('disruption:validating', { id: disruption.id, zone: disruption.zone })

  try {
    // 2. Load fresh workers
    const allWorkers = loadWorkers()
    const affected   = allWorkers.filter(w => disruption.affectedWorkerIds.includes(w.worker_id))
    console.log(`[engine] validating ${affected.length} workers`)

    // 3. Validate
    const { results, summary } = runValidationPipeline(affected, disruption)

    // 4. Broadcast validated results (admin streams them in)
    sse.broadcast('disruption:validated', {
      id: disruption.id,
      summary,
      results: results.map(r => ({
        workerId:           r.worker_id,
        workerName:         r.workerName,
        zone:               r.zone,
        verdict:            r.fraud.verdict,
        verdictExplanation: r.fraud.verdict_explanation,
        passedChecks:       r.fraud.passed_count,
        failedChecks:       r.fraud.failed_count,
        totalChecks:        r.fraud.total_checks,
        checks:             r.fraud.checks,
        payoutAmount:       r.outcome.payout_amount,
        payoutStatus:       r.outcome.payout_status,
        flags:              r.fraud.flags,
        trustScore:         r.fraud.trustScore,
        notification:       r.outcome.notification_message,
        formulaSteps:       r.payoutCalculation.formula_steps,
        calculation:        r.payoutCalculation,
      })),
    })

    // 5. Mark paying
    store.updateDisruption(disruption.id, { status: 'paying', validationResults: results, summary })
    sse.broadcast('disruption:paying', { id: disruption.id })

    // 6. Razorpay
    const eligible = results
      .filter(r => r.outcome.payout_triggered && r.outcome.payout_amount > 0)
      .map(r => ({ worker: affected.find(w => w.worker_id === r.worker_id), amount: r.outcome.payout_amount }))
      .filter(e => e.worker)

    const { results: rzResults, summary: rzSummary } = await processBatchPayouts(
      eligible, disruption.id, disruption.type
    )

    const rzMap = {}
    rzResults.forEach(r => { rzMap[r.worker_id] = r })
    const enrichedResults = results.map(r => ({ ...r, razorpay: rzMap[r.worker_id] || null }))

    // 7. Dataset update
    const datasetUpdate = updateDatasetAfterDisruption(results, disruption)

    // 8. Complete
    const completed = store.updateDisruption(disruption.id, {
      status:            'completed',
      endedAt:           new Date().toISOString(),
      validationResults: enrichedResults,
      summary,
      razorpay:          rzSummary,
      datasetUpdate,
    })

    sse.broadcast('disruption:completed', {
      id:            disruption.id,
      summary,
      razorpay:      rzSummary,
      datasetUpdate,
      results: enrichedResults.map(r => ({
        workerId:           r.worker_id,
        workerName:         r.workerName,
        zone:               r.zone,
        verdict:            r.fraud.verdict,
        verdictExplanation: r.fraud.verdict_explanation,
        passedChecks:       r.fraud.passed_count,
        failedChecks:       r.fraud.failed_count,
        checks:             r.fraud.checks,
        payoutAmount:       r.outcome.payout_amount,
        payoutStatus:       r.outcome.payout_status,
        flags:              r.fraud.flags,
        trustScore:         r.fraud.trustScore,
        notification:       r.outcome.notification_message,
        formulaSteps:       r.payoutCalculation.formula_steps,
        razorpay:           r.razorpay,
      })),
    })

    console.log(`[disruption] completed ${disruption.id} — ₹${summary.totalDisbursed}`)
    res.json({ success: true, summary, razorpay: rzSummary, datasetUpdate })

  } catch (err) {
    console.error('[disruption] pipeline error:', err)
    store.updateDisruption(disruption.id, { status: 'error', error: err.message })
    sse.broadcast('disruption:error', { id: disruption.id, error: err.message })
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
