import { NextResponse } from 'next/server'
import { getStoreById, getWorkersByStore, getRiskPoolByStore, getAllSimulations } from '@/lib/data'

export async function GET(req, { params }) {
  const store = getStoreById(params.id)
  if (!store) return NextResponse.json({ error:'Not found' }, { status:404 })
  const workers = getWorkersByStore(params.id)
  const pool    = getRiskPoolByStore(params.id)
  const sims    = getAllSimulations().filter(s => s.template_id &&
    workers.some(w => (s.worker_results||[]).find(r => r.worker_id === w.worker_id)))
  return NextResponse.json({ store, workers, pool, simulations: sims.slice(0,5) })
}
