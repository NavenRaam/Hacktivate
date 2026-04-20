require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app  = express()
const PORT = process.env.PORT || 3002

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))
app.use(express.json())

// ── Routes ───────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/clock',       require('./routes/clock'))
app.use('/api/disruptions', require('./routes/disruptions'))
app.use('/api/events',      require('./routes/events'))
app.use('/api/workers',     require('./routes/workers'))
app.use('/api/stores',      require('./routes/stores'))
app.use('/api/stats',       require('./routes/stats'))
app.use('/api/predict',     require('./routes/predict'))

app.get('/health', (req, res) => {
  const rz = !!("rzp_test_SZMDrki2Y0J1zi" && !"rzp_test_SZMDrki2Y0J1zi".includes('REPLACE'))
  res.json({ status:'ok', port:PORT, razorpay:rz, time:new Date().toISOString() })
})

app.listen(PORT, () => {
  const rz = !!("rzp_test_SZMDrki2Y0J1zi" && !"rzp_test_SZMDrki2Y0J1zi".includes('REPLACE'))
  console.log(`\n🟢 Arovy Backend  http://localhost:${PORT}`)
  console.log(`   Razorpay: ${rz ? '✓ Configured' : '⚠ Not configured'}`)
  console.log(`   API routes: auth, clock, disruptions, events, workers, stores, stats, predict`)
  console.log(`   Panel  → http://localhost:3000`)
  console.log(`   Admin  → http://localhost:3001\n`)
})
