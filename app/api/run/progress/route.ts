import { NextResponse } from 'next/server'
import { campaignState } from '@/lib/campaign'

export async function GET() {
  return NextResponse.json(campaignState)
}
