import { NextResponse } from 'next/server'
import { getStoreById, computeSeverity } from '@/lib/data'
import dataset from '@/data/dataset.json'

export async function POST(request) {
  try {
    const body = await request.json()
    const { storeId, type, params, startTime, durationHours } = body

    const store = getStoreById(storeId)
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const severity = computeSeverity(type, params)

    // Get workers in this store from dataset
    const workers = dataset.workers.filter(w => w.primary_store_id === storeId)
    const activeWorkers = workers.filter(w =>
      w.current_session.status === 'active' &&
      w.current_session.location_in_zone &&
      w.eligibility_tier !== 'not_eligible'
    )

    // Build disruption event record to send to system
    const event = {
      event_id:       `EVT-${Date.now()}`,
      store_id:       storeId,
      store_name:     store.name,
      zone:           store.zone,
      city:           store.city,
      type,
      params,
      severity:       +severity.toFixed(2),
      start_time:     startTime,
      duration_hours: durationHours,
      end_time_mins:  null, // computed on frontend
      affected_worker_ids: workers.map(w => w.worker_id),
      active_worker_count: activeWorkers.length,
      total_worker_count:  workers.length,
      status:         'scheduled',
      created_at:     new Date().toISOString()
    }

    // In production this would write to DB.
    // For demo we return the event + counts so frontend can manage state.
    return NextResponse.json({
      success:  true,
      event,
      store,
      affected: {
        total:  workers.length,
        active: activeWorkers.length,
      }
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
