import { NextResponse } from 'next/server'
import { getAllStores, getRiskPools, getStoresByCity } from '@/lib/data'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const city   = searchParams.get('city')
  const stores = city ? getStoresByCity(city) : getAllStores()
  const pools  = getRiskPools()
  const poolMap= Object.fromEntries(pools.map(p => [p.store_id, p]))
  const result = stores.map(s => ({ ...s, pool: poolMap[s.store_id] || null }))
  return NextResponse.json(result)
}
