const express = require('express')
const router  = express.Router()
const sse     = require('../lib/sse')
const store   = require('../lib/store')

// GET /api/events — SSE stream
// Both disruption panel and admin dashboard connect here
router.get('/', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Send current state immediately on connect
  const clock      = store.getClock()
  const active     = store.getActiveDisruption()
  const disruptions= store.getAllDisruptions()

  res.write(`event: init\ndata: ${JSON.stringify({
    clock,
    activeDisruption: active,
    recentDisruptions: disruptions.slice(-5),
  })}\n\n`)

  // Keep-alive ping every 20 seconds
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch { clearInterval(ping) }
  }, 20000)

  sse.addClient(res)

  req.on('close', () => clearInterval(ping))
})

module.exports = router
