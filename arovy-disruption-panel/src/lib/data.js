// src/lib/data.js
// Static store data extracted from dataset structure
// Workers are referenced by storeId at runtime via API

export const STORES = [
  // Chennai
  { store_id: 'DS-CHN-01', name: 'Blinkit T. Nagar',    city: 'Chennai',   zone: 'T. Nagar',      lat: 13.0418, lng: 80.2341, reliability: 0.35, worker_count: 10 },
  { store_id: 'DS-CHN-02', name: 'Zepto Anna Nagar',    city: 'Chennai',   zone: 'Anna Nagar',    lat: 13.0891, lng: 80.2099, reliability: 0.72, worker_count: 10 },
  { store_id: 'DS-CHN-03', name: 'Blinkit Velachery',   city: 'Chennai',   zone: 'Velachery',     lat: 12.9791, lng: 80.2209, reliability: 0.55, worker_count: 10 },
  { store_id: 'DS-CHN-04', name: 'Zepto Adyar',         city: 'Chennai',   zone: 'Adyar',         lat: 13.0012, lng: 80.2565, reliability: 0.68, worker_count: 10 },
  { store_id: 'DS-CHN-05', name: 'Blinkit Tambaram',    city: 'Chennai',   zone: 'Tambaram',      lat: 12.9249, lng: 80.1000, reliability: 0.30, worker_count: 10 },
  // Bangalore
  { store_id: 'DS-BLR-01', name: 'Blinkit Koramangala', city: 'Bangalore', zone: 'Koramangala',   lat: 12.9352, lng: 77.6245, reliability: 0.78, worker_count: 10 },
  { store_id: 'DS-BLR-02', name: 'Zepto Indiranagar',   city: 'Bangalore', zone: 'Indiranagar',   lat: 12.9784, lng: 77.6408, reliability: 0.82, worker_count: 10 },
  { store_id: 'DS-BLR-03', name: 'Blinkit Whitefield',  city: 'Bangalore', zone: 'Whitefield',    lat: 12.9698, lng: 77.7500, reliability: 0.60, worker_count: 10 },
  { store_id: 'DS-BLR-04', name: 'Zepto HSR Layout',    city: 'Bangalore', zone: 'HSR Layout',    lat: 12.9116, lng: 77.6389, reliability: 0.75, worker_count: 10 },
  { store_id: 'DS-BLR-05', name: 'Blinkit Marathahalli',city: 'Bangalore', zone: 'Marathahalli',  lat: 12.9591, lng: 77.6972, reliability: 0.52, worker_count: 10 },
  // Hyderabad
  { store_id: 'DS-HYD-01', name: 'Blinkit Banjara Hills',city: 'Hyderabad',zone: 'Banjara Hills', lat: 17.4156, lng: 78.4347, reliability: 0.70, worker_count: 10 },
  { store_id: 'DS-HYD-02', name: 'Zepto Kondapur',      city: 'Hyderabad', zone: 'Kondapur',      lat: 17.4600, lng: 78.3600, reliability: 0.65, worker_count: 10 },
  { store_id: 'DS-HYD-03', name: 'Blinkit Madhapur',    city: 'Hyderabad', zone: 'Madhapur',      lat: 17.4485, lng: 78.3908, reliability: 0.58, worker_count: 10 },
  { store_id: 'DS-HYD-04', name: 'Zepto Kukatpally',    city: 'Hyderabad', zone: 'Kukatpally',    lat: 17.4849, lng: 78.3996, reliability: 0.38, worker_count: 10 },
  { store_id: 'DS-HYD-05', name: 'Blinkit Himayatnagar',city: 'Hyderabad', zone: 'Himayatnagar',  lat: 17.3989, lng: 78.4800, reliability: 0.62, worker_count: 10 },
]

export const CITIES = [
  { name: 'Chennai',   center: [13.0827, 80.2707], zoom: 11, code: 'CHN' },
  { name: 'Bangalore', center: [12.9716, 77.5946], zoom: 11, code: 'BLR' },
  { name: 'Hyderabad', center: [17.3850, 78.4867], zoom: 11, code: 'HYD' },
]

export function getStoreById(id) {
  return STORES.find(s => s.store_id === id) || null
}

export function getStoresByCity(city) {
  return STORES.filter(s => s.city === city)
}

// Severity calculators — dynamic from user input
export function calcRainfallSeverity(mmPerHour) {
  if (mmPerHour < 20)  return 0
  if (mmPerHour < 40)  return 0.4
  if (mmPerHour < 60)  return 0.6
  return 0.9
}

export function calcAqiSeverity(aqi, tempC) {
  // temperature takes priority if extreme
  if (tempC >= 42)     return 0.9
  if (tempC >= 40)     return 0.6
  if (tempC >= 38)     return 0.3
  if (aqi >= 400)      return 0.9
  if (aqi >= 300)      return 0.6
  if (aqi >= 200)      return 0.3
  return 0
}

export function calcStoreSeverity(downtimeMins, shiftMins = 480) {
  return Math.min(1, downtimeMins / shiftMins)
}

export function calcSocialSeverity(scope) {
  const map = { localized: 0.5, area_wide: 0.8, city_wide: 1.0 }
  return map[scope] || 0.5
}

export function computeSeverity(type, params) {
  switch (type) {
    case 'heavy_rainfall':    return calcRainfallSeverity(params.rainfall_mm || 0)
    case 'aqi_heat':          return calcAqiSeverity(params.aqi || 0, params.temperature || 0)
    case 'store_downtime':    return calcStoreSeverity(params.downtime_minutes || 0)
    case 'social_disruption': return calcSocialSeverity(params.scope || 'localized')
    default:                  return 0
  }
}

export function severityLabel(s) {
  if (s === 0)    return { text: 'None',     color: '#6B7280' }
  if (s <= 0.3)   return { text: 'Low',      color: '#F59E0B' }
  if (s <= 0.5)   return { text: 'Moderate', color: '#F97316' }
  if (s <= 0.7)   return { text: 'High',     color: '#EF4444' }
  return              { text: 'Critical', color: '#DC2626' }
}

export function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export function parseTime(str) {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}
