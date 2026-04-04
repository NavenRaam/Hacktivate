require('dotenv').config()

const express      = require('express')
const cors         = require('cors')

const clockRouter       = require('./routes/clock')
const disruptionsRouter = require('./routes/disruptions')
const eventsRouter      = require('./routes/events')
const workersRouter     = require('./routes/workers')

const app  = express()
const PORT = process.env.PORT || 3002

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))
app.use(express.json())

app.use('/api/clock',       clockRouter)
app.use('/api/disruptions', disruptionsRouter)
app.use('/api/events',      eventsRouter)
app.use('/api/workers',     workersRouter)

app.get('/health', (req, res) => {
  const rz = !!(process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('REPLACE'))
  res.json({ status:'ok', port:PORT, razorpay:rz, time:new Date().toISOString() })
})

app.listen(PORT, () => {
  const rz = !!(process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('REPLACE'))
  console.log(`\n🟢 Arovy Backend  http://localhost:${PORT}`)
  console.log(`   Razorpay: ${rz ? '✓ Configured' : '⚠ Not configured'}`)
  console.log(`   Panel  → http://localhost:3000`)
  console.log(`   Admin  → http://localhost:3001\n`)
})
