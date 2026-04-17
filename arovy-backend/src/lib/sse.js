const clients = new Set()

function addClient(res) {
  clients.add(res)
  console.log(`[SSE] connected — total: ${clients.size}`)
  res.on('close', () => { clients.delete(res); console.log(`[SSE] disconnected — total: ${clients.size}`) })
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach(res => { try { res.write(payload) } catch { clients.delete(res) } })
  console.log(`[SSE] broadcast "${event}" to ${clients.size} client(s)`)
}

module.exports = { addClient, broadcast }
