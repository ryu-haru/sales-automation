import { NextRequest, NextResponse } from 'next/server'
import { campaignState, runCampaign } from '@/lib/campaign'

export async function POST(req: NextRequest) {
  if (campaignState.running) {
    return NextResponse.json({ error: 'キャンペーンはすでに実行中です' }, { status: 400 })
  }

  const { name, company, email } = await req.json()

  if (!name || !email) {
    return NextResponse.json({ error: '担当者名とメールアドレスを入力してください' }, { status: 400 })
  }

  // バックグラウンドで実行
  setImmediate(() => {
    runCampaign({ name, company: company || name, email }).catch(console.error)
  })

  return NextResponse.json({ success: true, message: 'キャンペーンを開始しました' })
}
