const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DS_PATH = path.join(__dirname, '../../data/dataset.json')

function readDataset() {
  return JSON.parse(fs.readFileSync(DS_PATH, 'utf8'))
}

router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' })

  try {
    const ds     = readDataset()
    const worker = ds.workers.find(w =>
      w.auth?.username === username && w.auth?.password === password
    )
    if (!worker)
      return res.status(401).json({ error: 'Invalid credentials' })

    const { auth, ...safe } = worker
    res.json({ success: true, worker: safe })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/worker/:id', (req, res) => {
  try {
    const ds     = readDataset()
    const worker = ds.workers.find(w => w.worker_id === req.params.id)
    if (!worker) return res.status(404).json({ error: 'Not found' })
    const { auth, ...safe } = worker
    res.json(safe)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
