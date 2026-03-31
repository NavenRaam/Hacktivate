const fs   = require('fs')
const path = require('path')

const DISRUPTIONS_FILE = path.join(__dirname, '../../data/disruptions.json')
const CLOCK_FILE       = path.join(__dirname, '../../data/clock.json')

// ─── Disruptions ────────────────────────────────────────
function readDisruptions() {
  try {
    return JSON.parse(fs.readFileSync(DISRUPTIONS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeDisruptions(data) {
  fs.writeFileSync(DISRUPTIONS_FILE, JSON.stringify(data, null, 2))
}

function getAllDisruptions() {
  return readDisruptions()
}

function getDisruptionById(id) {
  return readDisruptions().find(d => d.id === id) || null
}

function getActiveDisruption() {
  return readDisruptions().find(d => d.status === 'active') || null
}

function createDisruption(payload) {
  const disruptions = readDisruptions()
  const record = {
    id:            payload.id,
    storeId:       payload.storeId,
    storeName:     payload.storeName,
    zone:          payload.zone,
    city:          payload.city,
    type:          payload.type,
    params:        payload.params,
    severity:      payload.severity,
    startTime:     payload.startTime,
    endTime:       payload.endTime,
    durationHours: payload.durationHours,
    startMinutes:  payload.startMinutes,
    endMinutes:    payload.endMinutes,
    affectedTotal: payload.affectedTotal,
    affectedActive:payload.affectedActive,
    affectedWorkerIds: payload.affectedWorkerIds || [],
    status:        'scheduled',
    createdAt:     new Date().toISOString(),
    activatedAt:   null,
    endedAt:       null,
    validationResults: null,
    summary:       null,
  }
  disruptions.push(record)
  writeDisruptions(disruptions)
  return record
}

function updateDisruption(id, updates) {
  const disruptions = readDisruptions()
  const idx = disruptions.findIndex(d => d.id === id)
  if (idx === -1) return null
  disruptions[idx] = { ...disruptions[idx], ...updates }
  writeDisruptions(disruptions)
  return disruptions[idx]
}

// ─── Clock ───────────────────────────────────────────────
function readClock() {
  try {
    return JSON.parse(fs.readFileSync(CLOCK_FILE, 'utf8'))
  } catch {
    return { minutes: 480, running: false, speed: 1 }
  }
}

function writeClock(data) {
  fs.writeFileSync(CLOCK_FILE, JSON.stringify(data, null, 2))
}

function getClock() {
  return readClock()
}

function setClock(updates) {
  const clock = readClock()
  const next  = { ...clock, ...updates }
  writeClock(next)
  return next
}

module.exports = {
  getAllDisruptions,
  getDisruptionById,
  getActiveDisruption,
  createDisruption,
  updateDisruption,
  getClock,
  setClock,
}
