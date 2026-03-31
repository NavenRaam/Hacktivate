import { NextResponse } from 'next/server'
import { getGlobalStats, getCityOverview } from '@/lib/data'

export async function GET() {
  const stats  = getGlobalStats()
  const cities = ['Chennai','Bangalore','Hyderabad'].map(getCityOverview)
  return NextResponse.json({ stats, cities })
}
