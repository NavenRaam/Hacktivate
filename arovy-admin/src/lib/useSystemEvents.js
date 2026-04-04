'use client'
import { useEffect, useRef } from 'react'

const BACKEND = 'http://localhost:3002'

export function useSystemEvents(handlers = {}) {
  const esRef      = useRef(null)
  const handlersRef= useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const es = new EventSource(`${BACKEND}/api/events`)
    esRef.current = es

    const on = (event, key) => {
      es.addEventListener(event, (e) => {
        try {
          handlersRef.current[key]?.(JSON.parse(e.data))
        } catch {}
      })
    }

    on('init',                    'onInit')
    on('clock',                   'onClock')
    on('disruption:scheduled',    'onScheduled')
    on('disruption:active',       'onActive')
    on('disruption:validating',   'onValidating')
    on('disruption:validated',    'onValidated')
    on('disruption:paying',       'onPaying')
    on('disruption:completed',    'onCompleted')
    on('disruption:error',        'onError')

    return () => { es.close() }
  }, [])
}
