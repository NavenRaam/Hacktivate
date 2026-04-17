const express = require('express')
const router  = express.Router()
const sse     = require('../lib/sse')
const store   = require('../lib/store')

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  res.write(`event: init\ndata: ${JSON.stringify({
    clock:             store.getClock(),
    activeDisruption:  store.getActiveDisruption(),
    recentDisruptions: store.getAllDisruptions().slice(-10),
  })}\n\n`)

  const ping = setInterval(() => { try { res.write(': ping\n\n') } catch { clearInterval(ping) } }, 20000)
  sse.addClient(res)
  req.on('close', () => clearInterval(ping))
})

module.exports = router
