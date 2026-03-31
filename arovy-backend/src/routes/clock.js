const express  = require('express')
const router   = express.Router()
const store    = require('../lib/store')
const sse      = require('../lib/sse')

// GET /api/clock — both apps poll this to sync time
router.get('/', (req, res) => {
  res.json(store.getClock())
})

// POST /api/clock/tick — disruption panel sends ticks as clock advances
router.post('/tick', (req, res) => {
  const { minutes } = req.body
  const clock = store.setClock({ minutes })
  sse.broadcast('clock', clock)
  res.json(clock)
})

// POST /api/clock/set — jump to a specific time
router.post('/set', (req, res) => {
  const { minutes, running, speed } = req.body
  const clock = store.setClock({
    ...(minutes  !== undefined && { minutes  }),
    ...(running  !== undefined && { running  }),
    ...(speed    !== undefined && { speed    }),
  })
  sse.broadcast('clock', clock)
  res.json(clock)
})

module.exports = router
