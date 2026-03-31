import { NextResponse } from 'next/server'
import { STORES } from '@/lib/data'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')
  const stores = city ? STORES.filter(s => s.city === city) : STORES
  return NextResponse.json(stores)
}
