import { getAllWorkers, getWorkersByCity } from '@/lib/data'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')
  const workers = city ? getWorkersByCity(city) : getAllWorkers()
  return NextResponse.json(workers)
}