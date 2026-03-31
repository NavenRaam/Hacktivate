import { getAllTemplates } from '@/lib/data'
import { NextResponse } from 'next/server'

export async function GET() {
  const templates = getAllTemplates()
  return NextResponse.json(templates)
}