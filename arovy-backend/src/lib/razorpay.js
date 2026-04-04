// razorpay.js — Full Razorpay X Payout flow
// Contact → Fund Account → Payout

const https = require('https')

const KEY_ID         = process.env.RAZORPAY_KEY_ID     || ''
const KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET  || ''
const ACCOUNT_NUMBER = process.env.RAZORPAY_ACCOUNT     || '2323230099999999'
const BASE_AUTH      = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')

// ─── Reference ID: max 40 chars ──────────────────────────
// Razorpay hard limit. We use first 8 chars of disruption ID + worker suffix
function makeReferenceId(disruptionId, workerId) {
  const dis = disruptionId.replace(/-/g, '').slice(0, 12)
  const wrk = workerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
  const ts  = Date.now().toString(36).slice(-6) // 6 base36 chars
  const ref = `${dis}${wrk}${ts}`.slice(0, 40)
  return ref
}

// ─── HTTP helper ─────────────────────────────────────────
function razorpayRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.razorpay.com',
      port:     443,
      path,
      method,
      headers: {
        'Authorization':  `Basic ${BASE_AUTH}`,
        'Content-Type':   'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject({ statusCode: res.statusCode, error: parsed.error || parsed })
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, error: 'parse_failed', raw: data })
        }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── Step 1: Create Contact ───────────────────────────────
async function createContact(worker) {
  const refId = worker.worker_id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)
  const body  = {
    name:         worker.name,
    type:         'employee',
    reference_id: refId,
    email:        `${worker.worker_id.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20)}@arovy.in`,
    contact:      '9000000000',
    notes: {
      worker_id: worker.worker_id,
      city:      worker.city,
      zone:      worker.zone,
    },
  }
  try {
    const result = await razorpayRequest('POST', '/v1/contacts', body)
    return { success: true, contact_id: result.id, contact: result }
  } catch (err) {
    // Fetch existing contact if duplicate
    if (err.statusCode === 400) {
      try {
        const list = await razorpayRequest('GET', `/v1/contacts?reference_id=${refId}`)
        if (list.items && list.items.length > 0) {
          return { success: true, contact_id: list.items[0].id, contact: list.items[0] }
        }
      } catch (_) {}
    }
    return {
      success: false,
      error:   err.error?.description || JSON.stringify(err.error) || 'contact_creation_failed',
    }
  }
}

// ─── Step 2: Create Fund Account ─────────────────────────
async function createFundAccount(contactId, upiId) {
  const body = {
    contact_id:   contactId,
    account_type: 'vpa',
    vpa:          { address: upiId },
  }
  try {
    const result = await razorpayRequest('POST', '/v1/fund_accounts', body)
    return { success: true, fund_account_id: result.id, fund_account: result }
  } catch (err) {
    return {
      success: false,
      error:   err.error?.description || JSON.stringify(err.error) || 'fund_account_failed',
    }
  }
}

// ─── Step 3: Create Payout ────────────────────────────────
async function createPayout(fundAccountId, amountPaise, disruptionId, workerId, type) {
  const reference_id = makeReferenceId(disruptionId, workerId)
  const body = {
    account_number:  ACCOUNT_NUMBER,
    fund_account_id: fundAccountId,
    amount:          amountPaise,
    currency:        'INR',
    mode:            'UPI',
    purpose:         'payout',
    queue_if_low_balance: true,
    reference_id,
    narration:       `Arovy ${type.replace(/_/g,' ')} payout`.slice(0, 30),
    notes: {
      worker:    workerId.slice(0, 20),
      disruption:disruptionId.slice(0, 20),
    },
  }
  try {
    const result = await razorpayRequest('POST', '/v1/payouts', body)
    return {
      success:   true,
      payout_id: result.id,
      status:    result.status,
      utr:       result.utr || null,
      reference_id,
    }
  } catch (err) {
    return {
      success:   false,
      error:     err.error?.description || JSON.stringify(err.error) || 'payout_failed',
      reference_id,
    }
  }
}

// ─── Full per-worker flow ─────────────────────────────────
async function processWorkerPayout(worker, amountRupees, disruptionId, disruptionType) {
  const result = {
    worker_id:          worker.worker_id,
    worker_name:        worker.name,
    upi_id:             worker.upi_id,
    amount_rupees:      amountRupees,
    amount_paise:       Math.round(amountRupees * 100),
    steps: {
      contact:      { attempted: false, success: false },
      fund_account: { attempted: false, success: false },
      payout:       { attempted: false, success: false },
    },
    final_status:       'pending',
    razorpay_payout_id: null,
    utr:                null,
    error:              null,
    processed_at:       new Date().toISOString(),
  }

  if (amountRupees <= 0) {
    result.final_status = 'skipped_zero_amount'; return result
  }
  if (!worker.upi_id) {
    result.final_status = 'skipped_no_upi'
    result.error = 'No UPI ID registered'; return result
  }

  // Step 1
  result.steps.contact.attempted = true
  const c = await createContact(worker)
  result.steps.contact.success    = c.success
  result.steps.contact.contact_id = c.contact_id
  result.steps.contact.error      = c.error || null
  if (!c.success) {
    result.final_status = 'failed_contact'
    result.error = `Contact: ${c.error}`; return result
  }

  // Step 2
  result.steps.fund_account.attempted = true
  const fa = await createFundAccount(c.contact_id, worker.upi_id)
  result.steps.fund_account.success         = fa.success
  result.steps.fund_account.fund_account_id = fa.fund_account_id
  result.steps.fund_account.error           = fa.error || null
  if (!fa.success) {
    result.final_status = 'failed_fund_account'
    result.error = `Fund account: ${fa.error}`; return result
  }

  // Step 3
  result.steps.payout.attempted = true
  const p = await createPayout(
    fa.fund_account_id, result.amount_paise,
    disruptionId, worker.worker_id, disruptionType
  )
  result.steps.payout.success   = p.success
  result.steps.payout.payout_id = p.payout_id
  result.steps.payout.error     = p.error || null
  if (!p.success) {
    result.final_status = 'failed_payout'
    result.error = `Payout: ${p.error}`; return result
  }

  result.final_status        = 'success'
  result.razorpay_payout_id  = p.payout_id
  result.utr                 = p.utr
  return result
}

// ─── Batch payouts ────────────────────────────────────────
async function processBatchPayouts(eligibleWorkers, disruptionId, disruptionType) {
  const results   = []
  let succeeded = 0, failed = 0, skipped = 0, totalPaid = 0

  console.log(`[razorpay] processing ${eligibleWorkers.length} payouts`)

  for (const item of eligibleWorkers) {
    const r = await processWorkerPayout(item.worker, item.amount, disruptionId, disruptionType)
    results.push(r)
    if (r.final_status === 'success') {
      succeeded++; totalPaid += item.amount
      console.log(`[razorpay] ✓ ${item.worker.name} ₹${item.amount} → ${r.razorpay_payout_id}`)
    } else if (r.final_status.startsWith('skipped')) {
      skipped++
    } else {
      failed++
      console.log(`[razorpay] ✗ ${item.worker.name}: ${r.error}`)
    }
    await new Promise(res => setTimeout(res, 300))
  }

  console.log(`[razorpay] done — ✓${succeeded} ✗${failed} ~${skipped} ₹${totalPaid.toFixed(2)}`)
  return {
    results,
    summary: { succeeded, failed, skipped, totalPaid: +totalPaid.toFixed(2) },
  }
}

module.exports = { processWorkerPayout, processBatchPayouts }
