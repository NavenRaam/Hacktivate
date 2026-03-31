'use client'
import { useEffect, useRef, useState } from 'react'

const BACKEND = 'http://localhost:3002'

export function useSystemEvents(handlers = {}) {
  const esRef    = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource(`${BACKEND}/api/events`)
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    // Initial state on connect
    es.addEventListener('init', (e) => {
      const data = JSON.parse(e.data)
      handlers.onInit?.(data)
    })

    // Clock tick from disruption panel
    es.addEventListener('clock', (e) => {
      const data = JSON.parse(e.data)
      handlers.onClock?.(data)
    })

    // Disruption lifecycle
    es.addEventListener('disruption:scheduled', (e) => {
      handlers.onScheduled?.(JSON.parse(e.data))
    })
    es.addEventListener('disruption:active', (e) => {
      handlers.onActive?.(JSON.parse(e.data))
    })
    es.addEventListener('disruption:validating', (e) => {
      handlers.onValidating?.(JSON.parse(e.data))
    })
    es.addEventListener('disruption:completed', (e) => {
      handlers.onCompleted?.(JSON.parse(e.data))
    })

    return () => { es.close(); setConnected(false) }
  }, [])

  return { connected }
}
