const express      = require('express')
const cors         = require('cors')
const path         = require('path')

const clockRouter       = require('./routes/clock')
const disruptionsRouter = require('./routes/disruptions')
const eventsRouter      = require('./routes/events')

const app  = express()
const PORT = 3002

// ─── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))
app.use(express.json())

// ─── Routes ─────────────────────────────────────────────
app.use('/api/clock',       clockRouter)
app.use('/api/disruptions', disruptionsRouter)
app.use('/api/events',      eventsRouter)

// ─── Health ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, time: new Date().toISOString() })
})

// ─── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🟢 Arovy Backend running on http://localhost:${PORT}`)
  console.log('   Disruption Panel → http://localhost:3000')
  console.log('   Admin Dashboard  → http://localhost:3001')
  console.log('   Backend API      → http://localhost:3002\n')
})
