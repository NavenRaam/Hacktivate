const express = require('express')
const router  = express.Router()
const store   = require('../lib/store')
const sse     = require('../lib/sse')

router.get('/',        (req, res) => res.json(store.getClock()))
router.post('/tick',   (req, res) => { const c = store.setClock({ minutes: req.body.minutes }); sse.broadcast('clock', c); res.json(c) })
router.post('/set',    (req, res) => { const { minutes, running, speed } = req.body; const c = store.setClock({ ...(minutes!==undefined&&{minutes}), ...(running!==undefined&&{running}), ...(speed!==undefined&&{speed}) }); sse.broadcast('clock', c); res.json(c) })

module.exports = router
