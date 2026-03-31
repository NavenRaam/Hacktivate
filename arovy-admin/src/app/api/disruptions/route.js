import { NextResponse } from 'next/server'
import { getAllSimulations, getSimsByCity } from '@/lib/data'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const sims = city ? getSimsByCity(city) : getAllSimulations()
  // Return summary only (not full worker_results) for list view
  const list = sims.map(s => ({
    simulation_id:   s.simulation_id,
    template_id:     s.template_id,
    city:            s.city,
    zone:            s.zone,
    label:           s.label,
    disruption_type: s.disruption_type,
    severity:        s.severity,
    scheduled_start: s.scheduled_start,
    scheduled_end:   s.scheduled_end,
    summary:         s.summary,
    market_crash:    s.market_crash_controls,
  }))
  return NextResponse.json(list)
}
