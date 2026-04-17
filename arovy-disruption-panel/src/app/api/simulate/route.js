import { NextResponse } from 'next/server'
import { computeSeverity } from '@/lib/data'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'

export async function POST(request) {
  try {
    const body = await request.json()
    const { storeId, type, params, startTime, durationHours } = body

    const severity = computeSeverity(type, params)

    // Fetch fresh workers and store data from the backend (single source of truth)
    const [workersRes, storeRes] = await Promise.all([
      fetch(`${BACKEND}/api/workers?storeId=${storeId}`, { cache:'no-store' }),
      fetch(`${BACKEND}/api/stores/${storeId}`,          { cache:'no-store' }),
    ])

    if (!workersRes.ok) throw new Error('Backend unavailable — is arovy-backend running?')

    const workers = await workersRes.json()
    const store   = storeRes.ok ? await storeRes.json() : null

    const activeWorkers = workers.filter(w =>
      w.current_session?.status === 'active' &&
      w.current_session?.location_in_zone &&
      w.eligibility_tier !== 'not_eligible'
    )

    const event = {
      event_id:            `EVT-${Date.now()}`,
      store_id:            storeId,
      store_name:          store?.name || storeId,
      zone:                store?.zone || '',
      city:                store?.city || '',
      type,
      params,
      severity:            +severity.toFixed(2),
      start_time:          startTime,
      duration_hours:      durationHours,
      affected_worker_ids: workers.map(w => w.worker_id),
      active_worker_count: activeWorkers.length,
      total_worker_count:  workers.length,
      status:              'scheduled',
      created_at:          new Date().toISOString(),
    }

    return NextResponse.json({
      success:  true,
      event,
      store,
      affected: { total: workers.length, active: activeWorkers.length },
    })

  } catch (err) {
    console.error('[simulate]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
