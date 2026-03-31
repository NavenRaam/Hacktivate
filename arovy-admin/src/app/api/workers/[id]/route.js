import { NextResponse } from 'next/server'
import { getWorkerById, getWorkerPayoutHistory } from '@/lib/data'

export async function GET(req, { params }) {
  const worker = getWorkerById(params.id)
  if (!worker) return NextResponse.json({ error:'Not found' }, { status:404 })
  const history = getWorkerPayoutHistory(params.id)
  return NextResponse.json({ worker, history })
}
