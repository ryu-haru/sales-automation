import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    emailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    gmailUser: process.env.GMAIL_USER || null,
  })
}
