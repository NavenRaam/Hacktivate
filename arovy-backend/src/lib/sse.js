// SSE broker — keeps a registry of all connected clients
// and broadcasts named events to all of them

const clients = new Set()

function addClient(res) {
  clients.add(res)
  console.log(`[SSE] client connected — total: ${clients.size}`)
  res.on('close', () => {
    clients.delete(res)
    console.log(`[SSE] client disconnected — total: ${clients.size}`)
  })
}

function broadcast(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(res => {
    try { res.write(payload) } catch (_) { clients.delete(res) }
  })
  console.log(`[SSE] broadcast "${eventName}" to ${clients.size} client(s)`)
}

module.exports = { addClient, broadcast }
