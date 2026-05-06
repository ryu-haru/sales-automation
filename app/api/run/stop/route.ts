import { NextResponse } from 'next/server'
import { stopCampaign } from '@/lib/campaign'

export async function POST() {
  stopCampaign()
  return NextResponse.json({ success: true, message: '停止リクエストを送信しました' })
}
