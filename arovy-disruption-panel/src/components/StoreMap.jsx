'use client'
import { useEffect, useRef } from 'react'
import { STORES, CITIES, severityLabel } from '@/lib/data'

// Color per city
const CITY_COLORS = {
  Chennai:   '#3B82F6',
  Bangalore: '#10B981',
  Hyderabad: '#F59E0B',
}

export default function StoreMap({ onStoreClick, activeEvent, scheduledStoreId }) {
  const mapRef       = useRef(null)
  const leafletRef   = useRef(null)
  const markersRef   = useRef({})
  const pulseLayerRef= useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (leafletRef.current) return

    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    // India-centered map
    const map = L.map(mapRef.current, {
      center:       [15.5, 79.5],
      zoom:         6,
      zoomControl:  true,
      attributionControl: false,
      maxBounds:    [[5, 65], [38, 98]],
      minZoom:      5,
      maxZoom:      14,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    // Add store markers
    STORES.forEach(store => {
      const color    = CITY_COLORS[store.city] || '#6B7280'
      const isLowRel = store.reliability < 0.5

      const icon = L.divIcon({
        className: '',
        iconSize:  [28, 28],
        iconAnchor:[14, 14],
        html: `
          <div style="position:relative;width:28px;height:28px;">
            <div class="store-ring" style="
              position:absolute;inset:0;border-radius:50%;
              border:1.5px solid ${color};opacity:0.4;
            "></div>
            <div style="
              position:absolute;inset:4px;border-radius:50%;
              background:${color};
              box-shadow:0 0 12px ${color}60;
              display:flex;align-items:center;justify-content:center;
            ">
              ${isLowRel ? `<div style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.9)"></div>` : ''}
            </div>
          </div>
        `
      })

      const marker = L.marker([store.lat, store.lng], { icon })
        .addTo(map)
        .on('click', () => onStoreClick(store))

      // Tooltip
      marker.bindTooltip(`
        <div style="
          background:#131923;border:1px solid rgba(255,255,255,0.1);
          border-radius:8px;padding:8px 12px;color:#F0F4FF;
          font-family:'DM Sans',sans-serif;font-size:12px;
          white-space:nowrap;
        ">
          <div style="font-weight:600;margin-bottom:2px;">${store.name}</div>
          <div style="color:rgba(240,244,255,0.45);font-size:11px;">
            ${store.zone} · ${store.worker_count} workers
          </div>
        </div>
      `, {
        permanent:  false,
        direction:  'top',
        offset:     [0, -10],
        className:  'custom-tooltip',
        opacity:    1
      })

      markersRef.current[store.store_id] = { marker, store }
    })

    // City labels
    CITIES.forEach(city => {
      const color = CITY_COLORS[city.name] || '#fff'
      L.marker(city.center, {
        icon: L.divIcon({
          className: '',
          iconSize: [100, 24],
          iconAnchor: [50, 0],
          html: `<div style="
            font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
            color:${color};letter-spacing:0.15em;text-transform:uppercase;
            text-shadow:0 0 20px ${color}80;
            pointer-events:none;white-space:nowrap;
          ">${city.name}</div>`
        })
      }).addTo(map)
    })

    leafletRef.current = { map, L }

    return () => {
      map.remove()
      leafletRef.current = null
    }
  }, [])

  // Update active store visual
  useEffect(() => {
    if (!leafletRef.current) return
    const { L, map } = leafletRef.current

    // Remove previous pulse layer
    if (pulseLayerRef.current) {
      map.removeLayer(pulseLayerRef.current)
      pulseLayerRef.current = null
    }

    if (!activeEvent) return

    const store = activeEvent.store
    const sl    = severityLabel(activeEvent.severity)

    // Pulsing circle around active store
    const circle = L.circle([store.lat, store.lng], {
      radius:      2500,
      color:       '#EF4444',
      fillColor:   '#EF4444',
      fillOpacity: 0.08,
      weight:      1.5,
      opacity:     0.6,
      dashArray:   '4 4',
    }).addTo(map)

    pulseLayerRef.current = circle

    // Pan to active store
    map.flyTo([store.lat, store.lng], 12, { duration: 1.5 })

  }, [activeEvent])

  // Highlight scheduled store
  useEffect(() => {
    if (!leafletRef.current || !scheduledStoreId) return
    const ref = markersRef.current[scheduledStoreId]
    if (!ref) return
    leafletRef.current.map.flyTo([ref.store.lat, ref.store.lng], 12, { duration: 1.2 })
  }, [scheduledStoreId])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%' }}/>
  )
}
