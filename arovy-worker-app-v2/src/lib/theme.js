export const C = {
  bg:      '#05070C',
  surface: '#0D1117',
  card:    '#131923',
  border:  'rgba(255,255,255,0.08)',
  hi:      '#EEF2FF',
  mid:     'rgba(238,242,255,0.55)',
  low:     'rgba(238,242,255,0.30)',
  muted:   'rgba(238,242,255,0.18)',
  blue:    '#4F8EF7',
  green:   '#23D18B',
  red:     '#F5532D',
  amber:   '#F5A623',
  iris:    '#8B7FED',
}

export function trustColor(s) {
  if (s >= 0.90) return C.green
  if (s >= 0.75) return C.blue
  if (s >= 0.55) return C.amber
  return C.red
}

export function planColor(t) {
  return { pro:C.iris, standard:C.blue, basic:C.muted }[t] || C.muted
}

export function payoutStatusColor(s) {
  return { approved:C.green, partial_approved:C.amber, blocked:C.red, not_applicable:C.muted }[s] || C.muted
}

export function payoutStatusLabel(s) {
  return { approved:'Approved', partial_approved:'Partially Approved', blocked:'Rejected', not_applicable:'Not Applicable' }[s] || s
}

export function rejectionReason(flags = [], verdict) {
  // Plain English — no technical details
  if (verdict === 'ineligible') return 'Your plan does not cover this type of disruption yet.'
  if (!flags.length) return null
  const reasons = {
    'GPS Signal Integrity':          'We could not verify your location during the disruption.',
    'Location in Affected Zone':     'You were not detected in the affected area.',
    'Active Before Disruption':      'You were not on shift when the disruption started.',
    'Session Active':                'Your shift was not active during the disruption.',
    'Participation Score':           'Your activity level was below the minimum threshold.',
    'Idle Time Ratio':               'You were inactive for too long during your shift.',
    'Trust Profile':                 'Your account has unresolved activity concerns.',
    'Eligibility Tier':              'You do not yet meet the eligibility requirements.',
  }
  return flags.map(f => reasons[f] || f).join(' ')
}

export function disruptionLabel(t) {
  return {
    heavy_rainfall:   { label:'Heavy Rainfall',    icon:'🌧' },
    aqi_heat:         { label:'AQI / Heat Alert',  icon:'🌡' },
    store_downtime:   { label:'Store Outage',       icon:'⚡' },
    social_disruption:{ label:'Area Disruption',   icon:'🚧' },
  }[t] || { label:t, icon:'•' }
}

export function fmt(n) {
  return `₹${Number(n||0).toFixed(2)}`
}
