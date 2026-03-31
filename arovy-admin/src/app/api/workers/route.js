import { NextResponse } from 'next/server'
import { getAllWorkers, getWorkersByCity, getWorkersByStore } from '@/lib/data'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const city    = searchParams.get('city')
  const storeId = searchParams.get('storeId')
  const page    = parseInt(searchParams.get('page') || '1')
  const limit   = parseInt(searchParams.get('limit') || '20')

  let workers = storeId ? getWorkersByStore(storeId)
              : city    ? getWorkersByCity(city)
              : getAllWorkers()

  const total  = workers.length
  const start  = (page - 1) * limit
  workers      = workers.slice(start, start + limit)

  return NextResponse.json({ workers, total, page, limit, pages: Math.ceil(total/limit) })
}
