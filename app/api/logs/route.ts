import { NextResponse } from 'next/server'
import { getLogs } from '@/lib/storage'

export async function GET() {
  const logs = getLogs()
  return NextResponse.json(logs)
}
